import { createApiHandler, Errors } from "@/lib/api";
import {
  generateMockCalendarEvents,
  kpiFromMockCalendarEvents,
} from "@/lib/mock-stats/calendar-events";
import { isMockStatsEnabled } from "@/lib/mock-stats";
import { todayBoundsIso, weekBoundsIso } from "@/lib/dashboard/timezone";

/**
 * GET /api/calendar/kpi
 *
 * Calendar KPI cards (today / week / 30-day). Uses mock data when MOCK_STATS
 * is enabled in .env.local. Day/week boundaries are computed in the org's
 * display timezone (defaults to Europe/Paris) so the buckets align with what
 * the user sees on the calendar UI rather than UTC midnight.
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const now = new Date();

  const todayBounds = todayBoundsIso();
  const todayStart = new Date(todayBounds.startIso);
  const todayEnd = new Date(todayBounds.endIso);

  const weekBounds = weekBoundsIso();
  const weekStart = new Date(weekBounds.startIso);
  const weekEnd = new Date(new Date(weekBounds.endIso).getTime() + 1);

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
