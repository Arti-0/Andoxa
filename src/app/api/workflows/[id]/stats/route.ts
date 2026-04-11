import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import {
  parseEnrollmentBddIdsFromContext,
  parseWorkflowDefinition,
} from "@/lib/workflows";

const MAX_RUNS_SCAN = 1000;

function getWorkflowIdFromUrl(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("workflows");
  return segments[i + 1] ?? "";
}

function filterRunsByBddId<
  T extends { context: unknown; prospect_id: string; id: string },
>(runs: T[], bddId: string | null): T[] {
  if (!bddId) return runs;
  if (bddId === "__none__") {
    return runs.filter((r) => parseEnrollmentBddIdsFromContext(r.context).length === 0);
  }
  return runs.filter((r) => parseEnrollmentBddIdsFromContext(r.context).includes(bddId));
}

/**
 * GET /api/workflows/[id]/stats — agrégats + fil d’événements récents (rafraîchissement UI).
 * Query: bdd_id optionnel (uuid liste) ou __none__ (inscriptions sans liste).
 */
export const GET = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const workflowId = getWorkflowIdFromUrl(req);
  if (!workflowId) throw Errors.badRequest("ID workflow manquant");

  const bddId = new URL(req.url).searchParams.get("bdd_id");

  const { data: wf } = await ctx.supabase
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (!wf) throw Errors.notFound("Workflow");

  const { data: runRows } = await ctx.supabase
    .from("workflow_runs")
    .select("id, status, context, prospect_id, last_error")
    .eq("workflow_id", workflowId)
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .limit(MAX_RUNS_SCAN);

  const all = runRows ?? [];
  const countByBdd = new Map<string, number>();
  let unassignedRunCount = 0;

  for (const r of all) {
    const ids = parseEnrollmentBddIdsFromContext(r.context);
    if (!ids.length) {
      unassignedRunCount++;
      continue;
    }
    for (const id of ids) {
      countByBdd.set(id, (countByBdd.get(id) ?? 0) + 1);
    }
  }

  const bddKeys = [...countByBdd.keys()];

  const filtered = filterRunsByBddId(all, bddId);

  const runsByStatus: Record<string, number> = {};
  for (const r of filtered) {
    const s = r.status ?? "unknown";
    runsByStatus[s] = (runsByStatus[s] ?? 0) + 1;
  }

  const filteredIds = filtered.map((r) => r.id);

  const [bddResult, execPendingResult, defsResult, execDoneResult, activityResult] =
    await Promise.all([
      bddKeys.length
        ? ctx.supabase
            .from("bdd")
            .select("id, name")
            .in("id", bddKeys)
            .eq("organization_id", ctx.workspaceId)
        : Promise.resolve({ data: [] as { id: string; name: string }[] | null }),

      filteredIds.length
        ? ctx.supabase
            .from("workflow_step_executions")
            .select("status")
            .in("run_id", filteredIds)
            .in("status", ["pending", "processing"])
        : Promise.resolve({ data: [] as { status: string }[] | null }),

      filteredIds.length
        ? ctx.supabase
            .from("workflow_runs")
            .select("id, definition_snapshot")
            .in("id", filteredIds)
        : Promise.resolve(
            { data: [] as { id: string; definition_snapshot: unknown }[] | null }
          ),

      filteredIds.length
        ? ctx.supabase
            .from("workflow_step_executions")
            .select("run_id")
            .in("run_id", filteredIds)
            .eq("status", "completed")
        : Promise.resolve({ data: [] as { run_id: string }[] | null }),

      ctx.supabase
        .from("prospect_activity")
        .select("id, prospect_id, action, details, created_at")
        .eq("organization_id", ctx.workspaceId)
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false })
        .limit(bddId ? 120 : 40),
    ]);

  const bddNameById: Record<string, string> = Object.fromEntries(
    (bddResult.data ?? []).map((b) => [b.id, b.name ?? "Liste"])
  );

  const available_lists = bddKeys
    .map((bdd_id) => ({
      bdd_id,
      name: bddNameById[bdd_id] ?? bdd_id.slice(0, 8),
      run_count: countByBdd.get(bdd_id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  let pendingSteps = 0;
  let processingSteps = 0;
  for (const e of execPendingResult.data ?? []) {
    if (e.status === "pending") pendingSteps++;
    if (e.status === "processing") processingSteps++;
  }

  let stepsProgressPct: number | null = null;
  let runsCompletedPct: number | null = null;
  const failedRuns = filtered.filter((r) => r.status === "failed").length;
  const sampleErrors: { prospect_id: string; message: string }[] = [];

  const defs = defsResult.data ?? [];
  const execDone = execDoneResult.data ?? [];

  if (filteredIds.length) {
    const completedByRun = new Map<string, number>();
    for (const e of execDone) {
      completedByRun.set(e.run_id, (completedByRun.get(e.run_id) ?? 0) + 1);
    }

    let totalStepSlots = 0;
    let completedStepSlots = 0;
    for (const row of defs) {
      let n = 0;
      try {
        const def = parseWorkflowDefinition(row.definition_snapshot);
        n = def.steps.length;
      } catch {
        n = 0;
      }
      totalStepSlots += n;
      completedStepSlots += completedByRun.get(row.id) ?? 0;
    }

    if (totalStepSlots > 0) {
      stepsProgressPct = Math.min(100, Math.round((completedStepSlots / totalStepSlots) * 100));
    } else {
      stepsProgressPct = 0;
    }

    const doneCount = filtered.filter((r) => r.status === "completed").length;
    runsCompletedPct = Math.round((doneCount / filtered.length) * 100);

    for (const r of filtered) {
      if (r.last_error && typeof r.last_error === "string" && r.last_error.trim()) {
        if (sampleErrors.length < 5) {
          sampleErrors.push({
            prospect_id: r.prospect_id,
            message: r.last_error.slice(0, 200),
          });
        }
      }
    }
  }

  const prospectSet = new Set(filtered.map((r) => r.prospect_id));
  const recentActivity = activityResult.data ?? [];

  const recentFiltered = bddId
    ? recentActivity.filter(
        (a) => a.prospect_id && prospectSet.has(a.prospect_id)
      )
    : recentActivity;

  const pids = [
    ...new Set(recentFiltered.map((a) => a.prospect_id).filter(Boolean)),
  ] as string[];
  let prospectNames: Record<string, string> = {};
  if (pids.length) {
    const { data: plist } = await ctx.supabase
      .from("prospects")
      .select("id, full_name")
      .in("id", pids);
    prospectNames = Object.fromEntries(
      (plist ?? []).map((p) => [p.id, p.full_name ?? "Prospect"])
    );
  }

  const recent = recentFiltered.slice(0, 40).map((a) => {
    const d = (a.details ?? {}) as Record<string, unknown>;
    return {
      id: a.id,
      prospect_id: a.prospect_id,
      prospect_name: a.prospect_id ? prospectNames[a.prospect_id] ?? null : null,
      action: a.action,
      created_at: a.created_at,
      summary: summarizeWorkflowActivity(a.action, d),
    };
  });

  return {
    runs_total: filtered.length,
    runs_by_status: runsByStatus,
    queue: { pending_steps: pendingSteps, processing_steps: processingSteps },
    recent_activity: recent,
    available_lists,
    unassigned_run_count: unassignedRunCount,
    list_filter_bdd_id: bddId,
    steps_progress_pct: stepsProgressPct,
    runs_completed_pct: runsCompletedPct,
    failed_runs_count: failedRuns,
    sample_errors: sampleErrors,
    runs_scan_truncated: all.length >= MAX_RUNS_SCAN,
  };
});

function summarizeWorkflowActivity(action: string, d: Record<string, unknown>): string {
  const wname = typeof d.workflow_name === "string" ? d.workflow_name : "Workflow";
  switch (action) {
    case "workflow_enrolled":
      return `Inscrit au workflow « ${wname} »`;
    case "workflow_step_completed": {
      const st = typeof d.step_type === "string" ? d.step_type : "";
      const labels: Record<string, string> = {
        wait: "Attente terminée",
        linkedin_invite: "Invitation LinkedIn envoyée",
        linkedin_message: "Message LinkedIn envoyé",
        whatsapp_message: "Message WhatsApp envoyé",
      };
      return labels[st] ?? `Étape ${st || "?"} terminée`;
    }
    case "workflow_step_failed":
      return `Échec d’étape — ${typeof d.error === "string" ? d.error.slice(0, 120) : "erreur"}`;
    case "workflow_run_completed":
      return `Parcours « ${wname} » terminé`;
    default:
      return action;
  }
}
