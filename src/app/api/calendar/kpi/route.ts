import { createApiHandler, Errors } from "@/lib/api";
import {
  generateMockCalendarEvents,
  kpiFromMockCalendarEvents,
} from "@/lib/mock-stats/calendar-events";
import { isMockStatsEnabled } from "@/lib/mock-stats";

/**
 * GET /api/calendar/kpi
 *
 * Calendar KPI cards (today / week / 30-day). Uses mock data when MOCK_STATS
 * is enabled in .env.local.
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const dow = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(now.getDate() - 30);
  const sixtyAgo = new Date(now);
  sixtyAgo.setDate(now.getDate() - 60);

  if (isMockStatsEnabled()) {
    const { data: membersData } = await ctx.supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", ctx.workspaceId);

    const colleagueIds = (membersData ?? [])
      .map((m) => m.user_id)
      .filter((id): id is string => !!id && id !== ctx.userId);

    const rangeStart = sixtyAgo;
    const items = generateMockCalendarEvents({
      rangeStart,
      rangeEnd: weekEnd,
      orgId: ctx.workspaceId,
      userId: ctx.userId!,
      colleagueIds,
    });

    return kpiFromMockCalendarEvents(items, now);
  }

  const [todayRes, weekRes, thirtyRes, prevRes] = await Promise.all([
    ctx.supabase
      .from("events")
      .select("status")
      .eq("organization_id", ctx.workspaceId)
      .gte("start_time", todayStart.toISOString())
      .lte("start_time", todayEnd.toISOString()),
    ctx.supabase
      .from("events")
      .select("status")
      .eq("organization_id", ctx.workspaceId)
      .gte("start_time", weekStart.toISOString())
      .lt("start_time", weekEnd.toISOString()),
    ctx.supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .eq("status", "done")
      .gte("start_time", thirtyAgo.toISOString()),
    ctx.supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .eq("status", "done")
      .gte("start_time", sixtyAgo.toISOString())
      .lt("start_time", thirtyAgo.toISOString()),
  ]);

  const todayEvents = todayRes.data ?? [];
  const weekEvents = weekRes.data ?? [];

  return {
    todayTotal: todayEvents.length,
    todayDone: todayEvents.filter((e) => e.status === "done").length,
    weekTotal: weekEvents.length,
    weekDone: weekEvents.filter((e) => e.status === "done").length,
    thirtyDayDone: thirtyRes.count ?? 0,
    prevThirtyDayDone: prevRes.count ?? 0,
  };
});
