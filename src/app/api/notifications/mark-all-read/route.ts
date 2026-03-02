import { createApiHandler, Errors } from "@/lib/api";

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
export const POST = createApiHandler(async (_req, ctx) => {
  const { data: notifications } = await ctx.supabase
    .from("notifications")
    .select("id");

  if (!notifications?.length) {
    return { success: true, count: 0 };
  }

  const { data: existingReads } = await ctx.supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", ctx.userId);

  const alreadyRead = new Set(
    (existingReads ?? []).map((r) => r.notification_id)
  );

  const toInsert = notifications
    .filter((n) => !alreadyRead.has(n.id))
    .map((n) => ({
      notification_id: n.id,
      user_id: ctx.userId,
    }));

  if (toInsert.length > 0) {
    const { error } = await ctx.supabase
      .from("notification_reads")
      .insert(toInsert);

    if (error) {
      throw Errors.internal("Failed to mark all as read");
    }
  }

  return { success: true, count: toInsert.length };
});
