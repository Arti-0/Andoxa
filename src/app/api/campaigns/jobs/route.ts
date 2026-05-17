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
    const rawIds = [...new Set(body.prospect_ids ?? [])];

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

    const prospect_ids = rawIds.filter((id) => {
      if (blockedByWorkflow.has(id)) {
        skipped.push({ prospect_id: id, reason: "in_active_workflow" });
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
