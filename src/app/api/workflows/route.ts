import { createApiHandler, Errors, getPagination, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import type { Json } from "@/lib/types/supabase";
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

const DEFAULT_DRAFT: WorkflowDefinition = { schemaVersion: 1, steps: [] };

/**
 * GET /api/workflows
 */
export const GET = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");

  const { page, pageSize, offset } = getPagination(req);

  const { data: workflows, error, count } = await ctx.supabase
    .from("workflows")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw Errors.internal("Impossible de charger les workflows");

  const ids = (workflows ?? []).map((w) => w.id);
  const activeRunsByWorkflow = new Map<string, number>();
  const totalRunsByWorkflow = new Map<string, number>();
  const completedRunsByWorkflow = new Map<string, number>();

  if (ids.length) {
    const { data: runs } = await ctx.supabase
      .from("workflow_runs")
      .select("workflow_id, status")
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
    total: count ?? 0,
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
      draft_definition?: unknown;
      pending_enrollment_bdd_ids?: string[];
      ui?: { icon?: string; color?: string };
    }>(req);
    const name = (body.name ?? "").trim();
    if (!name) throw Errors.validation({ name: "Nom requis" });

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

    let meta = mergeWorkflowMetadata(
      {},
      {
        ui: Object.keys(uiPatch).length ? uiPatch : undefined,
        pending_enrollment_bdd_ids: bddIds.length ? bddIds : undefined,
      }
    );

    let published: Json | null = null;
    const built = await tryBuildPublishedDefinition(ctx.supabase, ctx.userId!, draft);
    if (built.ok) {
      published = built.definition as Json;
    }

    const { data: row, error } = await ctx.supabase
      .from("workflows")
      .insert({
        organization_id: ctx.workspaceId,
        name,
        created_by: ctx.userId!,
        is_active: false,
        draft_definition: draft,
        published_definition: published,
        metadata: meta as Json,
      })
      .select()
      .single();

    if (error || !row) throw Errors.internal("Création du workflow impossible");

    return row;
  },
  { rateLimit: { name: "workflows-create", requests: 20, window: "1 m" } }
);
