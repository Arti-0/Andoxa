import { createApiHandler } from "@/lib/api";

/**
 * GET /api/notifications/count
 * Unread notification count for the current user
 */
export const GET = createApiHandler(async (_req, ctx) => {
  const { count: totalCount } = await ctx.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true });

  const { count: readCount } = await ctx.supabase
    .from("notification_reads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId);

  return { count: Math.max(0, (totalCount ?? 0) - (readCount ?? 0)) };
});
