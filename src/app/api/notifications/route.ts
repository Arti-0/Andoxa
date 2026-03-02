import { createApiHandler } from "@/lib/api";

/**
 * GET /api/notifications
 * List notifications for the current user's organization + system notifications
 */
export const GET = createApiHandler(async (_req, ctx) => {
  const { data: notifications, error } = await ctx.supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { notifications: [] };
  }

  const { data: reads } = await ctx.supabase
    .from("notification_reads")
    .select("notification_id, read_at")
    .eq("user_id", ctx.userId);

  const readMap = new Map(
    (reads ?? []).map((r) => [r.notification_id, r.read_at])
  );

  const enriched = (notifications ?? []).map((n) => ({
    ...n,
    is_read: readMap.has(n.id),
    read_at: readMap.get(n.id) ?? null,
  }));

  return { notifications: enriched };
});
