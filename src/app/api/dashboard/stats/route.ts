import { createApiHandler, Errors } from "../../../../lib/api";

/**
 * GET /api/dashboard/stats
 * Returns aggregated stats + chart data for the dashboard
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { workspaceId, supabase } = ctx;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startIso = startOfMonth.toISOString();
  const endIso = endOfMonth.toISOString();
  const nowIso = now.toISOString();

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoIso = sixMonthsAgo.toISOString();

  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
  const eightWeeksAgoIso = eightWeeksAgo.toISOString();

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
  ] = await Promise.all([
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
    // Card 2: campaigns launched this month
    supabase
      .from("campaign_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", workspaceId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    // Card 4: RDV effectués (events that already happened this month)
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
  ]);

  if (prospectsResult.error) {
    throw Errors.internal("Failed to fetch prospects count");
  }

  const prospects = prospectsResult.count ?? 0;

  let conversionRate = 0;
  if (prospects > 0 && !signeResult.error && signeResult.count != null) {
    conversionRate = Math.round((signeResult.count / prospects) * 1000) / 10;
  }

  const campaignsThisMonth = campaignsThisMonthResult.error ? 0 : campaignsThisMonthResult.count ?? 0;
  const rdvEffectues = rdvEffectuesResult.error ? 0 : rdvEffectuesResult.count ?? 0;

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

  // Build prospectsOverTime: group by month (local time to avoid UTC shift)
  const MONTH_NAMES_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
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

  // Build activityVolume: group by week
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

  const weekMap = new Map(weekLabels.map((w) => [w, { calls: 0, messages: 0, bookings: 0 }]));

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

  return {
    prospects,
    campaignsThisMonth,
    rdvEffectues,
    conversionRate,
    kpis: {
      messagesEnvoyes,
      prospectsQualifies: prospectsQualifiesResult.error ? 0 : prospectsQualifiesResult.count ?? 0,
      dealsEnCours: dealsEnCoursResult.error ? 0 : dealsEnCoursResult.count ?? 0,
    },
    charts: {
      prospectsOverTime,
      activityVolume,
    },
  };
});
