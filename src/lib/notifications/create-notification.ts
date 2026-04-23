import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationCategory, NotificationActionType, NotificationType } from "@/lib/types/notifications";

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  action_type?: NotificationActionType;
  actor_id?: string | null;
  organization_id: string;
  target_url?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a notification row. The realtime subscription in use-notifications.ts
 * will automatically push it to all connected org members.
 *
 * Errors are silently ignored — notification failure must never block the
 * primary operation.
 */
export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      title: input.title,
      message: input.message,
      type: input.type ?? "internal",
      category: input.category ?? null,
      action_type: input.action_type ?? null,
      actor_id: input.actor_id ?? null,
      organization_id: input.organization_id,
      target_url: input.target_url ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Notification failure must not break the calling route
  }
}
