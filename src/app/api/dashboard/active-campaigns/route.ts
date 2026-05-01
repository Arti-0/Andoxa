import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/dashboard/active-campaigns
 *
 * Returns workflows currently orchestrating prospects (is_active=true) along
 * with progress derived from their workflow_runs:
 *   • done  = runs in 'completed' or 'failed'
 *   • total = all runs (any status)
 *   • state = 'running' if any pending/running/paused runs exist,
 *             'paused'  if all live runs are paused,
 *             'completed' otherwise
 */

interface ActiveCampaign {
  workflow_id: string;
  name: string;
  channel: "linkedin" | "whatsapp" | "linkedin+whatsapp" | "other";
  state: "running" | "paused" | "completed";
  done: number;
  total: number;
  href: string;
}

interface WorkflowDefinitionStep {
  type?: string;
}

interface WorkflowDefinition {
  steps?: WorkflowDefinitionStep[];
}

function inferChannel(def: WorkflowDefinition | null | undefined): ActiveCampaign["channel"] {
  if (!def || !Array.isArray(def.steps)) return "other";
  let li = false;
  let wa = false;
  for (const s of def.steps) {
    const type = typeof s.type === "string" ? s.type : "";
    if (type.startsWith("linkedin")) li = true;
    if (type.startsWith("whatsapp")) wa = true;
  }
  if (li && wa) return "linkedin+whatsapp";
  if (li) return "linkedin";
  if (wa) return "whatsapp";
  return "other";
}

export const GET = createApiHandler(async (_req, ctx): Promise<ActiveCampaign[]> => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data: workflows, error: wfErr } = await ctx.supabase
    .from("workflows")
    .select("id, name, published_definition, draft_definition, updated_at")
    .eq("organization_id", ctx.workspaceId)
    .eq("is_active", true)
    .eq("is_template", false)
    .order("updated_at", { ascending: false });

  if (wfErr) throw Errors.internal("Failed to fetch workflows");

  if (!workflows || workflows.length === 0) return [];

  const workflowIds = workflows.map((w) => w.id);
  const { data: runs, error: runsErr } = await ctx.supabase
    .from("workflow_runs")
    .select("workflow_id, status")
    .in("workflow_id", workflowIds);

  if (runsErr) throw Errors.internal("Failed to fetch workflow runs");

  const stats = new Map<
    string,
    { total: number; done: number; live: number; paused: number }
  >();
  for (const id of workflowIds) {
    stats.set(id, { total: 0, done: 0, live: 0, paused: 0 });
  }
  for (const r of runs ?? []) {
    const s = stats.get(r.workflow_id);
    if (!s) continue;
    s.total++;
    if (r.status === "completed" || r.status === "failed") s.done++;
    if (r.status === "running" || r.status === "pending") s.live++;
    if (r.status === "paused") s.paused++;
  }

  const out: ActiveCampaign[] = [];
  for (const w of workflows) {
    const s = stats.get(w.id) ?? { total: 0, done: 0, live: 0, paused: 0 };
    if (s.total === 0) continue; // Hide active workflows with no enrolment yet.

    let state: ActiveCampaign["state"];
    if (s.live > 0) state = "running";
    else if (s.paused > 0) state = "paused";
    else state = "completed";

    const def = (w.published_definition ?? w.draft_definition) as
      | WorkflowDefinition
      | null;

    out.push({
      workflow_id: w.id,
      name: w.name,
      channel: inferChannel(def),
      state,
      done: s.done,
      total: s.total,
      href: `/workflows/${w.id}`,
    });
  }

  return out.slice(0, 6);
});
