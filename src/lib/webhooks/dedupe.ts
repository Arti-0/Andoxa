import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Inserts a webhook dedupe key. Returns `"new"` if this is the first time
 * we see this event, `"duplicate"` if it was already processed.
 *
 * Cast to `any` is intentional: `webhook_events` is service-role-only and not
 * worth regenerating the full generated types for. The table is defined in
 * migration `20260517120000_webhook_dedupe_and_reminder_marker.sql`.
 */
export async function insertWebhookDedupe(
  supabase: SupabaseClient,
  provider: "stripe" | "unipile",
  eventId: string
): Promise<"new" | "duplicate" | "error"> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("webhook_events")
    .insert({ provider, event_id: eventId });

  if (!error) return "new";
  const code = (error as { code?: string }).code;
  if (code === "23505") return "duplicate";
  return "error";
}
