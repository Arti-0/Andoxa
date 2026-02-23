import { z } from "zod";

// Notification types
export const NotificationType = z.enum(["internal", "system", "admin"]);
export type NotificationType = z.infer<typeof NotificationType>;

// Common notification categories
export const NotificationCategory = z.enum([
  "database",
  "campaign",
  "event",
  "prospect",
  "user",
  "system",
  "security",
  "other",
]);
export type NotificationCategory = z.infer<typeof NotificationCategory>;

// Notification action types
export const NotificationActionType = z.enum([
  "database_created",
  "database_updated",
  "database_deleted",
  "campaign_created",
  "campaign_sent",
  "campaign_completed",
  "event_created",
  "event_updated",
  "event_cancelled",
  "prospect_added",
  "prospect_updated",
  "user_joined",
  "user_left",
  "system_update",
  "security_alert",
  "todo_reminder",
  "other",
]);
export type NotificationActionType = z.infer<typeof NotificationActionType>;

// Actor information (user who triggered the notification)
export interface NotificationActor {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// Base notification schema
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  type: NotificationType,
  category: NotificationCategory.nullable(),
  action_type: NotificationActionType.nullable(),
  actor_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  target_url: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).default({}),
  created_at: z.string(),
  expires_at: z.string().nullable(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// Extended notification with actor info and read status
export interface NotificationWithDetails extends Notification {
  actor?: NotificationActor | null;
  is_read: boolean;
  read_at?: string | null;
}

// Create notification payload
export const CreateNotificationSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  type: NotificationType,
  category: NotificationCategory.optional(),
  action_type: NotificationActionType.optional(),
  actor_id: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  target_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  expires_at: z.string().datetime().optional(),
});

export type CreateNotificationPayload = z.infer<
  typeof CreateNotificationSchema
>;

// Notification read record
export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
}

// Notification filters
export interface NotificationFilters {
  type?: NotificationType;
  category?: NotificationCategory;
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

