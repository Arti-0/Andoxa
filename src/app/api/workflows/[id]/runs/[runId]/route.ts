import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";

function parseIdsFromUrl(req: Request): { workflowId: string; runId: string } {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const wi = segments.indexOf("workflows");
  const ri = segments.indexOf("runs");
  return {
    workflowId: wi >= 0 ? (segments[wi + 1] ?? "") : "",
    runId: ri >= 0 ? (segments[ri + 1] ?? "") : "",
  };
}

/**
 * GET /api/workflows/[id]/runs/[runId] — run + step timeline
 */
export const GET = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const { workflowId, runId } = parseIdsFromUrl(req);
  if (!workflowId || !runId) throw Errors.badRequest("Paramètres manquants");

  const { data: run, error } = await ctx.supabase
    .from("workflow_runs")
    .select("*")
    .eq("id", runId)
    .eq("workflow_id", workflowId)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (error) throw Errors.internal("Erreur chargement");
  if (!run) throw Errors.notFound("Exécution");

  const { data: prospect } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, company, phone, linkedin")
    .eq("id", run.prospect_id)
    .maybeSingle();

  const { data: executions } = await ctx.supabase
    .from("workflow_step_executions")
    .select("*")
    .eq("run_id", runId)
    .order("step_index", { ascending: true });

  return { run: { ...run, prospect: prospect ?? null }, executions: executions ?? [] };
});

/**
 * PATCH /api/workflows/[id]/runs/[runId] — pause | resume | cancel
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const { workflowId, runId } = parseIdsFromUrl(req);
  if (!workflowId || !runId) throw Errors.badRequest("Paramètres manquants");

  const body = await parseBody<{ action?: string }>(req);
  const action = body.action;
  if (!["pause", "resume", "cancel"].includes(action ?? "")) {
    throw Errors.validation({ action: "pause, resume ou cancel requis" });
  }

  const { data: run, error } = await ctx.supabase
    .from("workflow_runs")
    .select("id, status")
    .eq("id", runId)
    .eq("workflow_id", workflowId)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (error || !run) throw Errors.notFound("Exécution");

  const now = new Date().toISOString();

  if (action === "pause") {
    if (run.status !== "running") {
      throw Errors.badRequest("Seule une exécution en cours peut être mise en pause");
    }
    const { data: updated, error: uErr } = await ctx.supabase
      .from("workflow_runs")
      .update({ status: "paused", updated_at: now })
      .eq("id", runId)
      .select()
      .single();
    if (uErr || !updated) throw Errors.internal("Mise en pause impossible");
    return { run: updated };
  }

  if (action === "resume") {
    if (run.status !== "paused") {
      throw Errors.badRequest("Seule une exécution en pause peut être reprise");
    }
    const { data: updated, error: uErr } = await ctx.supabase
      .from("workflow_runs")
      .update({ status: "running", updated_at: now })
      .eq("id", runId)
      .select()
      .single();
    if (uErr || !updated) throw Errors.internal("Reprise impossible");
    return { run: updated };
  }

  /* cancel */
  if (run.status === "completed" || run.status === "cancelled") {
    throw Errors.badRequest("Exécution déjà terminée ou annulée");
  }

  const { data: updated, error: uErr } = await ctx.supabase
    .from("workflow_runs")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", runId)
    .select()
    .single();

  if (uErr || !updated) throw Errors.internal("Annulation impossible");

  await ctx.supabase
    .from("workflow_step_executions")
    .update({
      status: "cancelled",
      updated_at: now,
      processed_at: now,
    })
    .eq("run_id", runId)
    .in("status", ["pending", "processing"]);

  return { run: updated };
});
