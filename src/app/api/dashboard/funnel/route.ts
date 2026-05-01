import { createApiHandler, Errors } from "@/lib/api";
import { getPeriodPair, parsePeriod, trendPts } from "@/lib/dashboard2/period";
import { readDashboardTargets } from "@/lib/dashboard2/targets";

/**
 * GET /api/dashboard/funnel?period=today|week|month|30d
 *
 * Aggregates the full outbound funnel for the selected period:
 *   1. invitations  — workflow `linkedin_invite` step completions
 *   2. accepted     — Unipile chats opened with invited prospects (proxy)
 *   3. conversations — chats with at least one inbound message
 *   4. rdvs         — events ending in window
 *   5. closings     — prospects updated to status='won' in window
 *
 * Each step also returns conversion-from-prev (%) and trend pts vs the
 * previous iso period.
 */

interface FunnelStep {
  key: "invitations" | "accepted" | "conversations" | "rdvs" | "closings";
  label: string;
  count: number;
  conversion_pct_from_prev: number | null;
  trend_pts: number;
}

interface FunnelResponse {
  steps: FunnelStep[];
  global_rate_pct: number;
  avg_cycle_days: number | null;
  pipeline_target_closings: number;
  period: string;
}

interface ActivityRow {
  prospect_id: string | null;
  created_at: string;
}

interface ChatRow {
  prospect_id: string;
  created_at: string | null;
  last_inbound_at: string | null;
}

function inRange(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

async function countInWindow(
  ctx: Parameters<Parameters<typeof createApiHandler>[0]>[1],
  start: Date,
  end: Date,
): Promise<{
  invitations: number;
  invitedIds: Set<string>;
  acceptances: number;
  conversations: number;
  rdvs: number;
  closings: number;
  firstMsgByProspect: Map<string, Date>;
  firstRdvByProspect: Map<string, Date>;
}> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [invitesRes, chatsRes, rdvsRes, closingsRes] = await Promise.all([
    ctx.supabase
      .from("prospect_activity")
      .select("prospect_id, created_at")
      .eq("organization_id", ctx.workspaceId!)
      .eq("action", "workflow_step_completed")
      .filter("details->>step_type", "eq", "linkedin_invite")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    ctx.supabase
      .from("unipile_chat_prospects")
      .select("prospect_id, created_at, last_inbound_at")
      .eq("organization_id", ctx.workspaceId!),
    ctx.supabase
      .from("events")
      .select("prospect_id, end_time")
      .eq("organization_id", ctx.workspaceId!)
      .gte("end_time", startIso)
      .lte("end_time", endIso),
    ctx.supabase
      .from("prospects")
      .select("id, updated_at")
      .eq("organization_id", ctx.workspaceId!)
      .is("deleted_at", null)
      .eq("status", "won")
      .gte("updated_at", startIso)
      .lte("updated_at", endIso),
  ]);

  const invites = (invitesRes.data ?? []) as ActivityRow[];
  const chats = (chatsRes.data ?? []) as ChatRow[];

  const invitedIds = new Set<string>();
  for (const i of invites) {
    if (i.prospect_id) invitedIds.add(i.prospect_id);
  }

  let acceptances = 0;
  let conversations = 0;
  for (const c of chats) {
    if (!c.prospect_id) continue;
    const opened = inRange(c.created_at, start, end);
    const replied = inRange(c.last_inbound_at, start, end);
    if (opened && invitedIds.has(c.prospect_id)) acceptances++;
    if (replied) conversations++;
  }

  // Maps used for cycle-time computation.
  const firstMsgByProspect = new Map<string, Date>();
  for (const i of invites) {
    if (!i.prospect_id) continue;
    const t = new Date(i.created_at);
    const prev = firstMsgByProspect.get(i.prospect_id);
    if (!prev || t < prev) firstMsgByProspect.set(i.prospect_id, t);
  }

  const firstRdvByProspect = new Map<string, Date>();
  for (const r of rdvsRes.data ?? []) {
    if (!r.prospect_id) continue;
    const t = new Date(r.end_time);
    const prev = firstRdvByProspect.get(r.prospect_id);
    if (!prev || t < prev) firstRdvByProspect.set(r.prospect_id, t);
  }

  return {
    invitations: invites.length,
    invitedIds,
    acceptances,
    conversations,
    rdvs: rdvsRes.data?.length ?? 0,
    closings: closingsRes.data?.length ?? 0,
    firstMsgByProspect,
    firstRdvByProspect,
  };
}

export const GET = createApiHandler(async (req, ctx): Promise<FunnelResponse> => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const url = new URL(req.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const { current, previous } = getPeriodPair(period);

  const [cur, prev, workspaceMetaRes] = await Promise.all([
    countInWindow(ctx, current.start, current.end),
    countInWindow(ctx, previous.start, previous.end),
    ctx.supabase
      .from("organizations")
      .select("metadata")
      .eq("id", ctx.workspaceId)
      .maybeSingle(),
  ]);

  function pctConv(num: number, den: number): number | null {
    if (den === 0) return null;
    return Math.round((num / den) * 100);
  }

  const steps: FunnelStep[] = [
    {
      key: "invitations",
      label: "Invitations envoyées",
      count: cur.invitations,
      conversion_pct_from_prev: null,
      trend_pts: trendPts(cur.invitations, prev.invitations),
    },
    {
      key: "accepted",
      label: "Acceptées",
      count: cur.acceptances,
      conversion_pct_from_prev: pctConv(cur.acceptances, cur.invitations),
      trend_pts: trendPts(cur.acceptances, prev.acceptances),
    },
    {
      key: "conversations",
      label: "Conversations",
      count: cur.conversations,
      conversion_pct_from_prev: pctConv(cur.conversations, cur.acceptances),
      trend_pts: trendPts(cur.conversations, prev.conversations),
    },
    {
      key: "rdvs",
      label: "RDV bookés",
      count: cur.rdvs,
      conversion_pct_from_prev: pctConv(cur.rdvs, cur.conversations),
      trend_pts: trendPts(cur.rdvs, prev.rdvs),
    },
    {
      key: "closings",
      label: "Closings",
      count: cur.closings,
      conversion_pct_from_prev: pctConv(cur.closings, cur.rdvs),
      trend_pts: trendPts(cur.closings, prev.closings),
    },
  ];

  const globalRatePct =
    cur.invitations > 0
      ? Math.round((cur.closings / cur.invitations) * 1000) / 10
      : 0;

  // Cycle days = average ms between first invite and first RDV per prospect.
  let cycleSum = 0;
  let cycleCount = 0;
  for (const [prospectId, msgT] of cur.firstMsgByProspect) {
    const rdvT = cur.firstRdvByProspect.get(prospectId);
    if (!rdvT) continue;
    if (rdvT.getTime() < msgT.getTime()) continue;
    cycleSum += rdvT.getTime() - msgT.getTime();
    cycleCount++;
  }
  const avgCycleDays =
    cycleCount > 0 ? Math.round(cycleSum / cycleCount / (1000 * 60 * 60 * 24)) : null;

  const targets = readDashboardTargets(workspaceMetaRes.data?.metadata);

  return {
    steps,
    global_rate_pct: globalRatePct,
    avg_cycle_days: avgCycleDays,
    pipeline_target_closings: targets.closings_per_month,
    period,
  };
});
