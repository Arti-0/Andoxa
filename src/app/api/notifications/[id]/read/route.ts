import { createApiHandler, Errors } from "@/lib/api";

/**
 * POST /api/notifications/[id]/read
 * Mark a notification as read
 */
export const POST = createApiHandler(async (_req, ctx) => {
  const url = new URL(_req.url);
  const segments = url.pathname.split("/");
  const notificationId = segments[segments.indexOf("notifications") + 1];

  if (!notificationId) {
    throw Errors.badRequest("Notification ID required");
  }

  const { error } = await ctx.supabase.from("notification_reads").upsert(
    {
      notification_id: notificationId,
      user_id: ctx.userId,
    },
    { onConflict: "notification_id,user_id" }
  );

  if (error) {
    throw Errors.internal("Failed to mark notification as read");
  }

  return { success: true };
});

/**
 * DELETE /api/notifications/[id]/read
 * Mark a notification as unread
 */
export const DELETE = createApiHandler(async (_req, ctx) => {
  const url = new URL(_req.url);
  const segments = url.pathname.split("/");
  const notificationId = segments[segments.indexOf("notifications") + 1];

  if (!notificationId) {
    throw Errors.badRequest("Notification ID required");
  }

  await ctx.supabase
    .from("notification_reads")
    .delete()
    .eq("notification_id", notificationId)
    .eq("user_id", ctx.userId);

  return { success: true };
});
