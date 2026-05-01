import { createApiHandler, Errors } from "../../../../lib/api";
import { buildWeekBuckets, bucketIndex } from "@/lib/dashboard2/weeks";
import { getPeriodPair, parsePeriod, trendPts } from "@/lib/dashboard2/period";
import { readDashboardTargets } from "@/lib/dashboard2/targets";

/**
 * GET /api/dashboard/stats
 *
 * Returns aggregated stats for both legacy (v1) and v2 dashboards. Accepts
 * an optional `?period=today|week|month|30d` to scope period-relative metrics
 * (defaults to "month").
 *
 * v1 fields (preserved for backward compat with the legacy /dashboard page):
 *   prospects, conversionRate, campaignsThisMonth, rdvEffectues,
 *   kpis.{messagesEnvoyes, prospectsQualifies, dealsEnCours},
 *   charts.{prospectsOverTime, activityVolume}
 *
 * v2 cockpit fields (consumed by /dashboard2):
 *   pipeline, rdv, linkedin, closings — each with sparkline + trend_pts.
 */

interface KpiBlock {
  sparkline: number[];
  trend_pts: number;
}

interface PipelineBlock extends KpiBlock {
  active_total: number;
  by_stage: { rdv: number; proposal: number; qualified: number };
}

interface RdvBlock extends KpiBlock {
  booked_count: number;
  target: number;
  realisation_pct: number;
}

interface LinkedInBlock extends KpiBlock {
  messages_sent: number;
  invitations_sent: number;
  responses_received: number;
  acceptances_received: number;
  response_rate_pct: number;
  acceptance_rate_pct: number;
}

interface ClosingsBlock extends KpiBlock {
  won_count: number;
  target: number;
  progress_pct: number;
}

export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const url = new URL(req.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const { current, previous } = getPeriodPair(period);

  const { workspaceId, supabase } = ctx;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const startIso = startOfMonth.toISOString();
  const endIso = endOfMonth.toISOString();
  const nowIso = now.toISOString();

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoIso = sixMonthsAgo.toISOString();

  // 12-week sparkline window — covers the four KPI sparklines.
  const weekBuckets = buildWeekBuckets(12, now);
  const sparkStartIso = weekBuckets[0].start.toISOString();
  const sparkEndIso = weekBuckets[weekBuckets.length - 1].end.toISOString();

  // 8-week activity volume window (used by both v1 and v2 charts).
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
  const eightWeeksAgoIso = eightWeeksAgo.toISOString();

  // Period bounds for trend deltas + period-scoped counts.
  const curStart = current.start.toISOString();
  const curEnd = current.end.toISOString();
  const prevStart = previous.start.toISOString();
  const prevEnd = previous.end.toISOString();

  const [
    prospectsResult,
    signeResult,
    prospectsQualifiesResult,
    dealsEnCoursResult,
    campaignsThisMonthResult,
    rdvEffectuesResult,
    jobIdsResult,
    prospectsTimelineResult,
    callSessionsResult,
    bookingsResult,
    pipelineByStageResult,
    pipelineHistoryResult,
    rdvHistoryResult,
    rdvCurrentRes,
    rdvPreviousRes,
    wonHistoryResult,
    wonCurrentRes,
    wonPreviousRes,
    workspaceMetaRes,
    invitesActivityRes,
    messagesActivityRes,
    inboundChatsRes,
    eventsLastMonthsRes,
  ] = await Promise.all([
    // ── v1 base counts ─────────────────────────────────────────────
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "won"),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .in("status", ["rdv", "proposal"]),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .in("status", ["new", "rdv", "proposal"]),
    supabase
      .from("campaign_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .gte("end_time", startIso)
      .lte("end_time", nowIso),
    supabase
      .from("campaign_jobs")
      .select("id")
      .eq("organization_id", workspaceId),
    supabase
      .from("prospects")
      .select("created_at")
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .gte("created_at", sixMonthsAgoIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("call_sessions")
      .select("created_at")
      .eq("organization_id", workspaceId)
      .gte("created_at", eightWeeksAgoIso),
    supabase
      .from("quick_bookings")
      .select("created_at")
      .eq("organization_id", workspaceId)
      .gte("created_at", eightWeeksAgoIso),

    // ── v2 pipeline ────────────────────────────────────────────────
    supabase
      .from("prospects")
      .select("status")
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .not("status", "in", "(won,lost)"),
    // 12-week pipeline sparkline = active prospects created per week.
    supabase
      .from("prospects")
      .select("created_at, status")
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .gte("created_at", sparkStartIso)
      .lte("created_at", sparkEndIso),

    // ── v2 RDV ─────────────────────────────────────────────────────
    supabase
      .from("events")
      .select("start_time, end_time")
      .eq("organization_id", workspaceId)
      .gte("end_time", sparkStartIso)
      .lte("end_time", sparkEndIso),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .gte("end_time", curStart)
      .lte("end_time", curEnd),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .gte("end_time", prevStart)
      .lte("end_time", prevEnd),

    // ── v2 closings ────────────────────────────────────────────────
    supabase
      .from("prospects")
      .select("updated_at")
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "won")
      .gte("updated_at", sparkStartIso)
      .lte("updated_at", sparkEndIso),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "won")
      .gte("updated_at", curStart)
      .lte("updated_at", curEnd),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .eq("status", "won")
      .gte("updated_at", prevStart)
      .lte("updated_at", prevEnd),

    // ── workspace targets ──────────────────────────────────────────
    supabase
      .from("organizations")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle(),

    // ── LinkedIn invites + messages (workflow) ─────────────────────
    supabase
      .from("prospect_activity")
      .select("created_at, prospect_id, details")
      .eq("organization_id", workspaceId)
      .eq("action", "workflow_step_completed")
      .filter("details->>step_type", "eq", "linkedin_invite")
      .gte("created_at", sparkStartIso)
      .lte("created_at", sparkEndIso),
    supabase
      .from("prospect_activity")
      .select("created_at, prospect_id, details")
      .eq("organization_id", workspaceId)
      .eq("action", "workflow_step_completed")
      .filter("details->>step_type", "eq", "linkedin_message")
      .gte("created_at", sparkStartIso)
      .lte("created_at", sparkEndIso),
    // Inbound chats (proxy for acceptances + responses) over the same window.
    supabase
      .from("unipile_chat_prospects")
      .select("created_at, last_inbound_at, prospect_id")
      .eq("organization_id", workspaceId)
      .gte("created_at", sparkStartIso)
      .lte("created_at", sparkEndIso),

    // ── RDV trend (events history fed into sparkline) ──────────────
    // (already covered by rdvHistoryResult above — placeholder slot)
    Promise.resolve({ data: null, error: null }),
  ]);

  if (prospectsResult.error) {
    throw Errors.internal("Failed to fetch prospects count");
  }
  // Suppress no-unused warning for the placeholder slot.
  void eventsLastMonthsRes;

  // ── v1 calculations (unchanged) ──────────────────────────────────
  const prospects = prospectsResult.count ?? 0;

  let conversionRate = 0;
  if (prospects > 0 && !signeResult.error && signeResult.count != null) {
    conversionRate = Math.round((signeResult.count / prospects) * 1000) / 10;
  }

  const campaignsThisMonth = campaignsThisMonthResult.error
    ? 0
    : (campaignsThisMonthResult.count ?? 0);
  const rdvEffectues = rdvEffectuesResult.error
    ? 0
    : (rdvEffectuesResult.count ?? 0);

  let messagesEnvoyes = 0;
  const jobIds = (jobIdsResult.data ?? []).map((j: { id: string }) => j.id);
  if (jobIds.length > 0) {
    const { count } = await supabase
      .from("campaign_job_prospects")
      .select("id", { count: "exact", head: true })
      .in("job_id", jobIds)
      .eq("status", "success")
      .not("processed_at", "is", null)
      .gte("processed_at", eightWeeksAgoIso);
    messagesEnvoyes = count ?? 0;
  }

  // ── v1 prospectsOverTime (6 months) ──────────────────────────────
  const MONTH_NAMES_FR = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Août",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ];
  const monthLabels: string[] = [];
  const monthDisplayLabels: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthLabels.push(key);
    monthDisplayLabels.push(`${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`);
  }
  const monthCounts = new Map(monthLabels.map((m) => [m, 0]));
  for (const p of prospectsTimelineResult.data ?? []) {
    const createdAt = new Date(p.created_at as string);
    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthCounts.has(key)) {
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
  }
  const prospectsOverTime = monthLabels.map((m, i) => ({
    date: monthDisplayLabels[i],
    count: monthCounts.get(m) ?? 0,
  }));

  // ── v1 activityVolume (8 weeks, day/month label) ─────────────────
  function getWeekLabel(date: Date): string {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    return `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`;
  }

  const weekLabels: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const label = getWeekLabel(d);
    if (!weekLabels.includes(label)) weekLabels.push(label);
  }

  const weekMap = new Map(
    weekLabels.map((w) => [w, { calls: 0, messages: 0, bookings: 0 }]),
  );

  for (const s of callSessionsResult.data ?? []) {
    const label = getWeekLabel(new Date(s.created_at as string));
    const entry = weekMap.get(label);
    if (entry) entry.calls++;
  }
  for (const b of bookingsResult.data ?? []) {
    const label = getWeekLabel(new Date(b.created_at as string));
    const entry = weekMap.get(label);
    if (entry) entry.bookings++;
  }

  if (jobIds.length > 0) {
    const { data: msgData } = await supabase
      .from("campaign_job_prospects")
      .select("processed_at")
      .in("job_id", jobIds)
      .eq("status", "success")
      .not("processed_at", "is", null)
      .gte("processed_at", eightWeeksAgoIso);
    for (const m of msgData ?? []) {
      const label = getWeekLabel(new Date(m.processed_at as string));
      const entry = weekMap.get(label);
      if (entry) entry.messages++;
    }
  }

  const activityVolume = weekLabels.map((w) => ({
    week: `Sem. ${w}`,
    ...(weekMap.get(w) ?? { calls: 0, messages: 0, bookings: 0 }),
  }));

  // ── v2 — pipeline ────────────────────────────────────────────────
  const stageRows = pipelineByStageResult.data ?? [];
  const byStage = { rdv: 0, proposal: 0, qualified: 0 };
  for (const r of stageRows) {
    if (r.status === "rdv") byStage.rdv++;
    else if (r.status === "proposal") byStage.proposal++;
    else if (r.status === "qualified") byStage.qualified++;
  }
  const pipelineActiveTotal = stageRows.length;

  const pipelineSparkline = new Array(weekBuckets.length).fill(0) as number[];
  let pipelineRunning = 0;
  // Walk weeks oldest→newest, accumulating active prospects (created in or before
  // each bucket and not yet won/lost). We treat current `status` as final state
  // since we don't have full status history.
  for (const p of pipelineHistoryResult.data ?? []) {
    if (!p.created_at) continue;
    const idx = bucketIndex(weekBuckets, new Date(p.created_at));
    if (idx < 0) continue;
    if (p.status === "won" || p.status === "lost") continue;
    pipelineSparkline[idx]++;
  }
  // Convert created-per-week into running total.
  for (let i = 0; i < pipelineSparkline.length; i++) {
    pipelineRunning += pipelineSparkline[i];
    pipelineSparkline[i] = pipelineRunning;
  }
  // Anchor the sparkline to the live total in case the partial 12-week window
  // doesn't fully reflect older active prospects.
  if (pipelineSparkline.length > 0) {
    const last = pipelineSparkline[pipelineSparkline.length - 1];
    if (last !== pipelineActiveTotal) {
      const offset = pipelineActiveTotal - last;
      for (let i = 0; i < pipelineSparkline.length; i++) {
        pipelineSparkline[i] = Math.max(0, pipelineSparkline[i] + offset);
      }
    }
  }

  // Trend = current period new active prospects vs previous period.
  let pipelineCurrentNew = 0;
  let pipelinePreviousNew = 0;
  for (const p of pipelineHistoryResult.data ?? []) {
    if (!p.created_at) continue;
    if (p.status === "lost") continue;
    const t = new Date(p.created_at).getTime();
    if (t >= current.start.getTime() && t <= current.end.getTime())
      pipelineCurrentNew++;
    if (t >= previous.start.getTime() && t <= previous.end.getTime())
      pipelinePreviousNew++;
  }
  const pipelineBlock: PipelineBlock = {
    active_total: pipelineActiveTotal,
    by_stage: byStage,
    sparkline: pipelineSparkline,
    trend_pts: trendPts(pipelineCurrentNew, pipelinePreviousNew),
  };

  // ── v2 — RDV ─────────────────────────────────────────────────────
  const rdvSparkline = new Array(weekBuckets.length).fill(0) as number[];
  for (const e of rdvHistoryResult.data ?? []) {
    if (!e.end_time) continue;
    const idx = bucketIndex(weekBuckets, new Date(e.end_time));
    if (idx >= 0) rdvSparkline[idx]++;
  }
  const rdvCurrent = rdvCurrentRes.count ?? 0;
  const rdvPrevious = rdvPreviousRes.count ?? 0;

  const targets = readDashboardTargets(workspaceMetaRes.data?.metadata);
  const rdvBlock: RdvBlock = {
    booked_count: rdvCurrent,
    target: targets.rdv_per_month,
    realisation_pct:
      targets.rdv_per_month > 0
        ? Math.round((rdvCurrent / targets.rdv_per_month) * 100)
        : 0,
    sparkline: rdvSparkline,
    trend_pts: trendPts(rdvCurrent, rdvPrevious),
  };

  // ── v2 — closings ───────────────────────────────────────────────
  const wonSparkline = new Array(weekBuckets.length).fill(0) as number[];
  for (const w of wonHistoryResult.data ?? []) {
    if (!w.updated_at) continue;
    const idx = bucketIndex(weekBuckets, new Date(w.updated_at));
    if (idx >= 0) wonSparkline[idx]++;
  }
  const wonCurrent = wonCurrentRes.count ?? 0;
  const wonPrevious = wonPreviousRes.count ?? 0;
  const closingsBlock: ClosingsBlock = {
    won_count: wonCurrent,
    target: targets.closings_per_month,
    progress_pct:
      targets.closings_per_month > 0
        ? Math.round((wonCurrent / targets.closings_per_month) * 100)
        : 0,
    sparkline: wonSparkline,
    trend_pts: trendPts(wonCurrent, wonPrevious),
  };

  // ── v2 — LinkedIn (response/acceptance rates) ───────────────────
  const invitesByWeek = new Array(weekBuckets.length).fill(0) as number[];
  const messagesByWeek = new Array(weekBuckets.length).fill(0) as number[];
  const responseByWeek = new Array(weekBuckets.length).fill(0) as number[];

  for (const a of invitesActivityRes.data ?? []) {
    const idx = bucketIndex(weekBuckets, new Date(a.created_at as string));
    if (idx >= 0) invitesByWeek[idx]++;
  }
  for (const a of messagesActivityRes.data ?? []) {
    const idx = bucketIndex(weekBuckets, new Date(a.created_at as string));
    if (idx >= 0) messagesByWeek[idx]++;
  }
  for (const c of inboundChatsRes.data ?? []) {
    if (!c.last_inbound_at) continue;
    const idx = bucketIndex(weekBuckets, new Date(c.last_inbound_at));
    if (idx >= 0) responseByWeek[idx]++;
  }

  // Period-scoped totals for the displayed rate.
  function inWindow(iso: string | null | undefined, w: { start: Date; end: Date }): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= w.start.getTime() && t <= w.end.getTime();
  }

  const invitedProspectIds = new Set<string>();
  for (const a of invitesActivityRes.data ?? []) {
    if (
      a.prospect_id &&
      typeof a.created_at === "string" &&
      inWindow(a.created_at, current)
    )
      invitedProspectIds.add(a.prospect_id as string);
  }

  const messagedProspectIds = new Set<string>();
  let messagesSent = 0;
  for (const a of messagesActivityRes.data ?? []) {
    if (typeof a.created_at !== "string") continue;
    if (!inWindow(a.created_at, current)) continue;
    messagesSent++;
    if (a.prospect_id) messagedProspectIds.add(a.prospect_id as string);
  }

  // Acceptances ≈ chats whose `created_at` lands in window AND prospect was invited.
  let acceptances = 0;
  for (const c of inboundChatsRes.data ?? []) {
    if (!inWindow(c.created_at ?? null, current)) continue;
    if (c.prospect_id && invitedProspectIds.has(c.prospect_id as string)) {
      acceptances++;
    }
  }
  // Responses ≈ chats with last_inbound in window AND prospect was messaged.
  let responses = 0;
  for (const c of inboundChatsRes.data ?? []) {
    if (!inWindow(c.last_inbound_at ?? null, current)) continue;
    if (c.prospect_id && messagedProspectIds.has(c.prospect_id as string)) {
      responses++;
    }
  }

  const invitationsSent = invitedProspectIds.size;
  const responseRatePct =
    messagesSent > 0 ? Math.round((responses / messagesSent) * 100) : 0;
  const acceptanceRatePct =
    invitationsSent > 0
      ? Math.round((acceptances / invitationsSent) * 100)
      : 0;

  // Sparkline = response_rate per week (capped 0..100 for display sanity).
  const linkedInSparkline = messagesByWeek.map((m, i) =>
    m > 0 ? Math.min(100, Math.round((responseByWeek[i] / m) * 100)) : 0,
  );

  // Trend pts = current rate − previous rate (raw point delta).
  let prevMessages = 0;
  let prevResponses = 0;
  const prevMessagedIds = new Set<string>();
  for (const a of messagesActivityRes.data ?? []) {
    if (typeof a.created_at !== "string") continue;
    if (!inWindow(a.created_at, previous)) continue;
    prevMessages++;
    if (a.prospect_id) prevMessagedIds.add(a.prospect_id as string);
  }
  for (const c of inboundChatsRes.data ?? []) {
    if (!inWindow(c.last_inbound_at ?? null, previous)) continue;
    if (c.prospect_id && prevMessagedIds.has(c.prospect_id as string)) {
      prevResponses++;
    }
  }
  const prevResponseRate =
    prevMessages > 0 ? Math.round((prevResponses / prevMessages) * 100) : 0;
  const linkedInTrendPts = responseRatePct - prevResponseRate;

  const linkedInBlock: LinkedInBlock = {
    messages_sent: messagesSent,
    invitations_sent: invitationsSent,
    responses_received: responses,
    acceptances_received: acceptances,
    response_rate_pct: responseRatePct,
    acceptance_rate_pct: acceptanceRatePct,
    sparkline: linkedInSparkline,
    trend_pts: linkedInTrendPts,
  };

  return {
    // ── v1 (legacy /dashboard) ─────────────────────────────────────
    prospects,
    campaignsThisMonth,
    rdvEffectues,
    conversionRate,
    kpis: {
      messagesEnvoyes,
      prospectsQualifies: prospectsQualifiesResult.error
        ? 0
        : (prospectsQualifiesResult.count ?? 0),
      dealsEnCours: dealsEnCoursResult.error
        ? 0
        : (dealsEnCoursResult.count ?? 0),
    },
    charts: {
      prospectsOverTime,
      activityVolume,
    },

    // ── v2 (cockpit /dashboard2) ───────────────────────────────────
    period,
    pipeline: pipelineBlock,
    rdv: rdvBlock,
    linkedin: linkedInBlock,
    closings: closingsBlock,
    week_labels: weekBuckets.map((b) => b.label),
  };
});
