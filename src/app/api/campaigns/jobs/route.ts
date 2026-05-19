import { createApiHandler, Errors, parseBody, getPagination } from "@/lib/api";
import {
  definitionHasOutboundMessaging,
  safeParseWorkflowDefinition,
} from "@/lib/workflows/schema";

/**
 * POST /api/campaigns/jobs
 * Create a campaign job with batch processing
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

    const body = await parseBody<{
      name?: string;
      type: "invite" | "invite_with_note" | "contact" | "whatsapp";
      prospect_ids?: string[];
      /**
       * Target a whole bdd (list) — the server resolves the prospect ids
       * scoped to the workspace. Used by the create-campaign wizard so the
       * client doesn't have to fan out fetches just to launch a list.
       * Combined with `prospect_ids` if both are passed (deduped).
       * Refinements honored:
       *   refine_exclude_contacted = drop status='contacted'|'qualified'|'rdv'|'proposal'|'won'|'lost'
       *   refine_only_with_phone   = drop rows with null/empty phone
       *   refine_exclude_active    = drop rows already in an active campaign
       */
      bdd_id?: string;
      refine_exclude_contacted?: boolean;
      refine_only_with_phone?: boolean;
      refine_exclude_active?: boolean;
      message_template?: string;
      batch_size?: number;
      delay_ms?: number;
      launch_now?: boolean;
      message_overrides?: Record<string, string>;
    }>(req);

    const allowedTypes = ["invite", "invite_with_note", "contact", "whatsapp"] as const;
    if (!body.type || !allowedTypes.includes(body.type)) {
      throw Errors.validation({
        type: "Must be 'invite', 'invite_with_note', 'contact', or 'whatsapp'",
      });
    }

    // Resolve bdd → prospect ids when provided. Workspace-scoped, soft-deleted
    // rows excluded. Refinements applied here so the client only sends booleans.
    const bddIds = new Set<string>();
    if (body.bdd_id) {
      let q = ctx.supabase
        .from("prospects")
        .select("id, phone, status")
        .eq("organization_id", ctx.workspaceId)
        .eq("bdd_id", body.bdd_id)
        .is("deleted_at", null);
      if (body.refine_only_with_phone) {
        q = q.not("phone", "is", null);
      }
      if (body.refine_exclude_contacted) {
        q = q.in("status", ["new"]);
      }
      const { data: bddRows, error: bddErr } = await q;
      if (bddErr) {
        console.error("[campaign-jobs] bdd resolve", bddErr);
        throw Errors.internal("Failed to resolve list");
      }
      for (const r of bddRows ?? []) {
        if (body.refine_only_with_phone && !r.phone?.trim()) continue;
        bddIds.add(r.id);
      }
    }

    const rawIds = [
      ...new Set([...(body.prospect_ids ?? []), ...bddIds]),
    ];

    if (rawIds.length === 0 && body.launch_now) {
      throw Errors.validation({
        prospect_ids: "At least one prospect is required to launch immediately",
      });
    }

    if (rawIds.length === 0) {
      /** Draft job with zero targets (wizard will add prospects later). */
      const overrides = body.message_overrides ?? {};
      const metadata: Record<string, string | Record<string, string>> = {};
      if (overrides && Object.keys(overrides).length > 0) metadata.message_overrides = overrides;
      if (body.name?.trim()) metadata.name = body.name.trim();

      const { data: job, error: jobError } = await ctx.supabase
        .from("campaign_jobs")
        .insert({
          organization_id: ctx.workspaceId,
          created_by: ctx.userId!,
          type: body.type,
          status: "draft",
          total_count: 0,
          batch_size: body.batch_size ?? 10,
          delay_ms: body.delay_ms ?? 120000,
          message_template: body.message_template ?? null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        })
        .select()
        .single();

      if (jobError || !job) throw Errors.internal("Failed to create campaign job");
      return job;
    }
    const skipped: { prospect_id: string; reason: string }[] = [];

    const { data: activeRuns, error: runsErr } = await ctx.supabase
      .from("workflow_runs")
      .select("prospect_id, definition_snapshot")
      .eq("organization_id", ctx.workspaceId)
      .in("prospect_id", rawIds)
      .in("status", ["pending", "running", "paused"]);

    if (runsErr) {
      console.error("[campaign-jobs] workflow overlap query", runsErr);
      throw Errors.internal("Failed to resolve workflow overlaps");
    }

    const blockedByWorkflow = new Set<string>();
    for (const r of activeRuns ?? []) {
      const parsed = safeParseWorkflowDefinition(r.definition_snapshot);
      if (parsed.success && definitionHasOutboundMessaging(parsed.data)) {
        blockedByWorkflow.add(r.prospect_id);
      }
    }

    // Wizard-side "exclude prospects already in an active campaign" toggle.
    // `prospect_in_active_campaign` view exists (migration 20260515180400).
    const blockedByCampaign = new Set<string>();
    if (body.refine_exclude_active) {
      const { data: activeCampaignRows } = await ctx.supabase
        .from("prospect_in_active_campaign")
        .select("prospect_id")
        .eq("organization_id", ctx.workspaceId)
        .in("prospect_id", rawIds);
      for (const r of activeCampaignRows ?? []) {
        if (r.prospect_id) blockedByCampaign.add(r.prospect_id);
      }
    }

    const prospect_ids = rawIds.filter((id) => {
      if (blockedByWorkflow.has(id)) {
        skipped.push({ prospect_id: id, reason: "in_active_workflow" });
        return false;
      }
      if (blockedByCampaign.has(id)) {
        skipped.push({ prospect_id: id, reason: "in_active_campaign" });
        return false;
      }
      return true;
    });

    if (!prospect_ids.length) {
      throw Errors.badRequest(
        "Aucun prospect éligible : chacun est déjà dans un parcours actif avec envoi LinkedIn ou WhatsApp."
      );
    }

    const overrides = body.message_overrides ?? {};
    const metadata: Record<string, string | Record<string, string>> = {};
    if (overrides && Object.keys(overrides).length > 0) metadata.message_overrides = overrides;
    if (body.name?.trim()) metadata.name = body.name.trim();

    const initialStatus = body.launch_now ? "pending" : "draft";

    const { data: job, error: jobError } = await ctx.supabase
      .from("campaign_jobs")
      .insert({
        organization_id: ctx.workspaceId,
        created_by: ctx.userId!,
        type: body.type,
        status: initialStatus,
        total_count: prospect_ids.length,
        batch_size: body.batch_size ?? 10,
        delay_ms: body.delay_ms ?? 120000,
        message_template: body.message_template ?? null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      })
      .select()
      .single();

    if (jobError || !job) throw Errors.internal("Failed to create campaign job");

    const rows = prospect_ids.map((pid) => ({
      job_id: job.id,
      prospect_id: pid,
    }));

    const { error: insertError } = await ctx.supabase
      .from("campaign_job_prospects")
      .insert(rows);

    if (insertError) throw Errors.internal("Failed to add prospects to job");

    return skipped.length ? { ...job, skipped } : job;
  },
  { rateLimit: { name: "campaign-jobs", requests: 5, window: "1 m" } }
);

/**
 * GET /api/campaigns/jobs
 * List campaign jobs for current workspace
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { page, pageSize, offset } = getPagination(req);

  const { data, error, count } = await ctx.supabase
    .from("campaign_jobs")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw Errors.internal("Failed to fetch campaign jobs");

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
});
