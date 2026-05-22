import { createApiHandler, Errors, getPagination, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import type { Database, Json } from "@/lib/types/supabase";
import {
  safeParseWorkflowDefinition,
  tryBuildPublishedDefinition,
  mergeWorkflowMetadata,
  parseWorkflowUi,
  isWorkflowColorKey,
  isWorkflowIconKey,
  type WorkflowDefinition,
  type WorkflowUiState,
} from "@/lib/workflows";
import { isWorkflowTriggerKind } from "@/lib/workflows/trigger-kind";
import { validateTriggerConfig } from "@/lib/workflows/trigger-config";

const DEFAULT_DRAFT: WorkflowDefinition = { schemaVersion: 1, steps: [] };

/**
 * GET /api/workflows
 */
export const GET = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");

  const { page, pageSize, offset } = getPagination(req);

  // count:exact triggered a separate count(*) on every load — the UI never
  // paginates today (pageSize = 50 max), so we drop it and return null total.
  // Pages that need a true total can re-enable when they need it.
  const { data: workflows, error } = await ctx.supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", ctx.workspaceId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw Errors.internal("Impossible de charger les workflows");

  const ids = (workflows ?? []).map((w) => w.id);
  const activeRunsByWorkflow = new Map<string, number>();
  const totalRunsByWorkflow = new Map<string, number>();
  const completedRunsByWorkflow = new Map<string, number>();

  if (ids.length) {
    // CRITICAL: scoping to organization_id lets Postgres use the
    // (organization_id, workflow_id) index instead of scanning every run
    // matching the IN(...) list. For an org with thousands of historical
    // runs this is the difference between 2s and 100ms.
    const { data: runs } = await ctx.supabase
      .from("workflow_runs")
      .select("workflow_id, status")
      .eq("organization_id", ctx.workspaceId)
      .in("workflow_id", ids);

    for (const r of runs ?? []) {
      const wid = r.workflow_id;
      totalRunsByWorkflow.set(wid, (totalRunsByWorkflow.get(wid) ?? 0) + 1);
      if (r.status === "pending" || r.status === "running" || r.status === "paused") {
        activeRunsByWorkflow.set(wid, (activeRunsByWorkflow.get(wid) ?? 0) + 1);
      }
      if (r.status === "completed") {
        completedRunsByWorkflow.set(wid, (completedRunsByWorkflow.get(wid) ?? 0) + 1);
      }
    }
  }

  const items = (workflows ?? []).map((w) => {
    const ui = parseWorkflowUi(w.metadata);
    const totalRuns = totalRunsByWorkflow.get(w.id) ?? 0;
    const completedRuns = completedRunsByWorkflow.get(w.id) ?? 0;
    const execution_progress_pct =
      totalRuns === 0 ? null : Math.round((completedRuns / totalRuns) * 100);
    return {
      ...w,
      is_published: w.published_definition != null,
      active_runs_count: activeRunsByWorkflow.get(w.id) ?? 0,
      total_runs_count: totalRuns,
      runs_completed_count: completedRuns,
      execution_progress_pct,
      ui,
    };
  });

  return {
    items,
    // `total` removed; the UI doesn't paginate. Add back via a separate
    // `?count=exact` round-trip if pagination ships.
    total: items.length,
    page,
    pageSize,
  };
});

/**
 * POST /api/workflows
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    assertMessagerieAndTemplatesPlan(ctx);
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");

    const body = await parseBody<{
      name?: string;
      description?: string | null;
      is_template?: boolean;
      draft_definition?: unknown;
      pending_enrollment_bdd_ids?: string[];
      trigger_kind?: string;
      trigger_config?: unknown;
      ui?: { icon?: string; color?: string; trigger?: string };
    }>(req);
    const name = (body.name ?? "").trim();
    if (!name) throw Errors.validation({ name: "Nom requis" });
    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
    const isTemplate = Boolean(body.is_template);

    let draft: WorkflowDefinition = DEFAULT_DRAFT;
    if (body.draft_definition !== undefined) {
      const parsed = safeParseWorkflowDefinition(body.draft_definition);
      if (!parsed.success) {
        throw Errors.validation({
          draft_definition:
            parsed.error.flatten().formErrors.join(", ") || "Définition invalide",
        });
      }
      draft = parsed.data;
    }

    const bddIds =
      body.pending_enrollment_bdd_ids?.filter(
        (x): x is string => typeof x === "string" && x.length > 0
      ) ?? [];

    const uiPatch: Partial<WorkflowUiState> = {};
    if (body.ui?.icon && isWorkflowIconKey(body.ui.icon)) uiPatch.icon = body.ui.icon;
    if (body.ui?.color && isWorkflowColorKey(body.ui.color)) uiPatch.color = body.ui.color;
    if (typeof body.ui?.trigger === "string" && body.ui.trigger.length > 0) {
      uiPatch.trigger = body.ui.trigger;
    }

    let meta = mergeWorkflowMetadata(
      {},
      {
        ui: Object.keys(uiPatch).length ? uiPatch : undefined,
        pending_enrollment_bdd_ids: bddIds.length ? bddIds : undefined,
      }
    );

    let published: Json | null = null;
    const built = await tryBuildPublishedDefinition(ctx.supabase, ctx.userId!, draft, {
      organizationId: ctx.workspaceId,
    });
    if (built.ok) {
      published = built.definition as Json;
    }

    // Resolve trigger_kind + trigger_config at create time so workflows
    // instantiated from templates are wired up to their real trigger
    // immediately, instead of defaulting to `manual` and forcing the user
    // to reconfigure on the detail page.
    let triggerKind: string | undefined;
    if (body.trigger_kind !== undefined) {
      if (!isWorkflowTriggerKind(body.trigger_kind)) {
        throw Errors.validation({ trigger_kind: "Déclencheur invalide" });
      }
      triggerKind = body.trigger_kind;
    }

    let triggerConfig: Json | undefined;
    if (body.trigger_config !== undefined) {
      // Validate against the effective trigger kind (incoming or default to
      // manual). Empty {} is acceptable for every kind.
      const effectiveKind =
        (triggerKind ?? "manual") as Parameters<typeof validateTriggerConfig>[0];
      const validated = validateTriggerConfig(effectiveKind, body.trigger_config);
      if (!validated.ok) {
        throw Errors.validation({ trigger_config: validated.error });
      }
      triggerConfig = validated.config as Json;
    }

    const insertRow: Database["public"]["Tables"]["workflows"]["Insert"] = {
      organization_id: ctx.workspaceId,
      name,
      description,
      is_template: isTemplate,
      created_by: ctx.userId!,
      is_active: false,
      draft_definition: draft,
      published_definition: published,
      metadata: meta as Json,
      ...(triggerKind !== undefined
        ? {
            trigger_kind:
              triggerKind as Database["public"]["Tables"]["workflows"]["Insert"]["trigger_kind"],
          }
        : {}),
      ...(triggerConfig !== undefined ? { trigger_config: triggerConfig } : {}),
    };

    const { data: row, error } = await ctx.supabase
      .from("workflows")
      .insert(insertRow)
      .select()
      .single();

    if (error || !row) {
      // Surface the real Postgres error so missing-column / RLS issues are
      // visible instead of swallowed as a generic 500.
      console.error("[POST /api/workflows] insert failed", {
        code: (error as { code?: string } | null)?.code,
        message: error?.message,
        details: (error as { details?: string } | null)?.details,
        hint: (error as { hint?: string } | null)?.hint,
      });
      throw Errors.internal(
        error?.message
          ? `Création du workflow impossible : ${error.message}`
          : "Création du workflow impossible"
      );
    }

    return row;
  },
  { rateLimit: { name: "workflows-create", requests: 20, window: "1 m" } }
);
