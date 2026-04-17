import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { processWorkflowStepExecution } from "@/lib/workflows";

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
 * POST /api/workflows/[id]/runs/[runId]/process-now
 * Runs the next pending workflow step immediately (sets run_after to now if needed).
 */
export const POST = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const { workflowId, runId } = parseIdsFromUrl(req);
  if (!workflowId || !runId) throw Errors.badRequest("Paramètres manquants");

  const { data: run, error: runErr } = await ctx.supabase
    .from("workflow_runs")
    .select("id, status")
    .eq("id", runId)
    .eq("workflow_id", workflowId)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (runErr || !run) throw Errors.notFound("Exécution");
  if (run.status !== "running") {
    throw Errors.badRequest("Le parcours doit être en cours pour lancer une étape");
  }

  const nowIso = new Date().toISOString();

  const { data: pendingRows, error: execErr } = await ctx.supabase
    .from("workflow_step_executions")
    .select("id, run_after")
    .eq("run_id", runId)
    .eq("status", "pending")
    .order("step_index", { ascending: true })
    .limit(1);

  if (execErr) throw Errors.internal("Impossible de lire les étapes");
  const exec = pendingRows?.[0];
  if (!exec) {
    throw Errors.badRequest("Aucune étape en attente pour ce parcours");
  }

  const runAfter = exec.run_after ?? nowIso;
  if (runAfter > nowIso) {
    await ctx.supabase
      .from("workflow_step_executions")
      .update({ run_after: nowIso, updated_at: nowIso })
      .eq("id", exec.id);
  }

  const result = await processWorkflowStepExecution(ctx.supabase, exec.id);

  if (result.outcome === "error") {
    throw Errors.badRequest(result.message ?? "Échec de l’étape");
  }

  return {
    outcome: result.outcome,
    ...(result.outcome === "skipped" ? { reason: result.reason } : {}),
  };
});
