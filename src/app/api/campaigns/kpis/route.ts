import { createApiHandler, Errors } from "@/lib/api";
import { isMockStatsEnabled, mockCampaignKpis } from "@/lib/mock-stats";

/**
 * GET /api/campaigns/kpis?period=7|30|90|all&creators=id1,id2
 *
 * Returns aggregated counters used by the /campaigns2 KPI bar:
 *   - invitations:    linkedin_invite_sent rows over the period
 *   - acceptanceRate: linkedin_invite_accepted / linkedin_invite_sent
 *   - messages:       linkedin_message_outbound + whatsapp_message_outbound
 *   - meetings:       events.source='campaign' rows over the period
 *   - calls:          call_session_calls rows over the period
 *
 * Each metric is shipped with:
 *   { value: number | null, unit?: '%', delta: number | null, spark: number[] }
 *
 * `delta` is the % change vs the previous period of the same length.
 * `spark` is 7 evenly-spaced buckets across the period (12 for 'all').
 *
 * Creator scoping uses prospect_activity.actor_id and events.created_by.
 */

type Period = "7" | "30" | "90" | "all";

interface KpiEntry {
  value: number | null;
  unit?: "%";
  delta: number | null;
  spark: number[];
}

interface KpiResponse {
  invitations: KpiEntry;
  acceptanceRate: KpiEntry;
  messages: KpiEntry;
  meetings: KpiEntry;
  calls: KpiEntry;
}

function periodToMs(p: Period): number | null {
  switch (p) {
    case "7":
      return 7 * 86400 * 1000;
    case "30":
      return 30 * 86400 * 1000;
    case "90":
      return 90 * 86400 * 1000;
    case "all":
      return null;
  }
}

function bucketize(rows: { created_at: string }[], from: Date, to: Date, n: number): number[] {
  const start = from.getTime();
  const span = to.getTime() - start;
  if (span <= 0 || n <= 0) return [];
  const buckets = Array<number>(n).fill(0);
  const width = span / n;
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t < start || t >= to.getTime()) continue;
    let idx = Math.floor((t - start) / width);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    buckets[idx] += 1;
  }
  return buckets;
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export const GET = createApiHandler(async (req, ctx): Promise<KpiResponse> => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "7") as Period;
  if (!(["7", "30", "90", "all"] as const).includes(period)) {
    throw Errors.validation({ period: "Must be 7, 30, 90 or all" });
  }
  if (isMockStatsEnabled()) return mockCampaignKpis(period);

  const creatorsParam = url.searchParams.get("creators");
  const creators = creatorsParam ? creatorsParam.split(",").filter(Boolean) : [];

  // Period windows. For 'all', we use a 365-day window to size the spark and
  // delta — older data is still counted in `value` for 'all'.
  const ms = periodToMs(period);
  const now = new Date();
  const sparkBuckets = period === "all" ? 12 : 7;
  const periodSpanMs = ms ?? 365 * 86400 * 1000;
  const currStart = new Date(now.getTime() - periodSpanMs);
  const prevStart = new Date(currStart.getTime() - periodSpanMs);

  // ─── Activities ────────────────────────────────────────────────────────────

  const activitiesQuery = ctx.supabase
    .from("prospect_activity")
    .select("action, created_at, actor_id")
    .eq("organization_id", ctx.workspaceId)
    .gte("created_at", prevStart.toISOString());

  const { data: activities, error: actErr } = await activitiesQuery;
  if (actErr) throw Errors.internal("Failed to load activities");

  const scoped = (activities ?? []).filter((a) => {
    if (creators.length > 0 && !creators.includes(a.actor_id ?? "")) return false;
    return true;
  });

  const inviteSent = scoped.filter((a) => a.action === "linkedin_invite_sent");
  const inviteAccepted = scoped.filter((a) => a.action === "linkedin_invite_accepted");
  const messagesOut = scoped.filter(
    (a) => a.action === "linkedin_message_outbound" || a.action === "whatsapp_message_outbound",
  );
  // `events.source` is currently 'manual' | 'booking' (no 'campaign' value yet),
  // so we count meetings via the `rdv_scheduled` activity verb instead.
  // BACKEND.md §11 covers expanding events.source to track origin.
  const meetings = scoped.filter((a) => a.action === "rdv_scheduled");

  // ─── Calls ─────────────────────────────────────────────────────────────────
  //
  // The "calls passed" metric counts rows in call_session_prospects that have
  // been processed (outcome IS NOT NULL). We join to call_sessions for the org
  // scope and creator filter. `created_at` here is the call_session_prospects
  // row's creation; if a more accurate timestamp exists (`called_at`) we use
  // that instead via a server-side coalesce in JS below.

  let callsQuery = ctx.supabase
    .from("call_session_prospects")
    .select(
      "called_at, outcome, call_sessions!inner(organization_id, created_by, created_at)",
    )
    .not("outcome", "is", null);
  if (creators.length > 0) {
    callsQuery = callsQuery.in("call_sessions.created_by", creators);
  }
  const { data: callsRaw, error: cErr } = await callsQuery;
  if (cErr) throw Errors.internal("Failed to load calls");

  type CallRow = {
    called_at: string | null;
    call_sessions?: { organization_id?: string; created_at?: string } | null;
  };
  const prevStartMs = prevStart.getTime();
  const calls = ((callsRaw ?? []) as unknown as CallRow[])
    .filter((row) => row.call_sessions?.organization_id === ctx.workspaceId)
    .map((row) => ({
      created_at: row.called_at ?? row.call_sessions?.created_at ?? "",
    }))
    .filter((row) => {
      if (!row.created_at) return false;
      return new Date(row.created_at).getTime() >= prevStartMs;
    });

  // ─── Compose ───────────────────────────────────────────────────────────────

  const cur = currStart;
  const prv = prevStart;

  const inCurr = <T extends { created_at: string }>(rows: T[]) =>
    rows.filter((r) => new Date(r.created_at) >= cur);
  const inPrev = <T extends { created_at: string }>(rows: T[]) =>
    rows.filter((r) => new Date(r.created_at) >= prv && new Date(r.created_at) < cur);

  const invitationsCurr = inCurr(inviteSent);
  const invitationsPrev = inPrev(inviteSent);
  const acceptedCurr = inCurr(inviteAccepted);
  const acceptedPrev = inPrev(inviteAccepted);
  const messagesCurr = inCurr(messagesOut);
  const messagesPrev = inPrev(messagesOut);
  const meetingsCurr = inCurr(meetings);
  const meetingsPrev = inPrev(meetings);
  const callsCurr = inCurr(calls);
  const callsPrev = inPrev(calls);

  const acceptanceCurr = invitationsCurr.length === 0 ? null : (acceptedCurr.length / invitationsCurr.length) * 100;
  const acceptancePrev = invitationsPrev.length === 0 ? null : (acceptedPrev.length / invitationsPrev.length) * 100;
  const acceptanceDelta =
    acceptanceCurr === null || acceptancePrev === null
      ? null
      : acceptanceCurr - acceptancePrev; // percentage points

  return {
    invitations: {
      value: period === "all" ? inviteSent.length : invitationsCurr.length,
      delta: deltaPct(invitationsCurr.length, invitationsPrev.length),
      spark: bucketize(invitationsCurr, cur, now, sparkBuckets),
    },
    acceptanceRate: {
      value: acceptanceCurr === null ? null : Math.round(acceptanceCurr),
      unit: "%",
      delta: acceptanceDelta === null ? null : Math.round(acceptanceDelta * 10) / 10,
      spark: bucketize(acceptedCurr, cur, now, sparkBuckets),
    },
    messages: {
      value: period === "all" ? messagesOut.length : messagesCurr.length,
      delta: deltaPct(messagesCurr.length, messagesPrev.length),
      spark: bucketize(messagesCurr, cur, now, sparkBuckets),
    },
    meetings: {
      value: period === "all" ? meetings.length : meetingsCurr.length,
      delta: deltaPct(meetingsCurr.length, meetingsPrev.length),
      spark: bucketize(meetingsCurr, cur, now, sparkBuckets),
    },
    calls: {
      value: period === "all" ? calls.length : callsCurr.length,
      delta: deltaPct(callsCurr.length, callsPrev.length),
      spark: bucketize(callsCurr, cur, now, sparkBuckets),
    },
  };
});
