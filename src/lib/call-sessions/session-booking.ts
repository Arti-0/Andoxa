import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

export const BOOKING_DEFAULT_DURATION_MIN = 30;

/**
 * Creates quick_booking, marks session prospect as booked/completed, optional calendar event.
 * Shared by POST /api/call-sessions/[id]/booking and complete-step.
 */
export async function performSessionQuickBooking(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId: string;
    sessionId: string;
    prospectId: string;
    userId: string;
    scheduled_for?: string | null;
    notes?: string | null;
  }
) {
  const { organizationId, sessionId, prospectId, userId, scheduled_for, notes } = params;

  const { data, error } = await supabase
    .from("quick_bookings")
    .insert({
      organization_id: organizationId,
      prospect_id: prospectId,
      call_session_id: sessionId,
      booked_by: userId,
      scheduled_for: scheduled_for ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("call_session_prospects")
    .update({ outcome: "booked", status: "completed" })
    .eq("call_session_id", sessionId)
    .eq("prospect_id", prospectId);

  if (scheduled_for) {
    const { data: prospect } = await supabase
      .from("prospects")
      .select("full_name")
      .eq("id", prospectId)
      .single();

    const prospectName = prospect?.full_name ?? "Prospect";
    const startTime = new Date(scheduled_for);
    const endTime = new Date(startTime.getTime() + BOOKING_DEFAULT_DURATION_MIN * 60 * 1000);

    await supabase.from("events").insert({
      organization_id: organizationId,
      title: `RDV avec ${prospectName}`,
      description: notes ?? null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      prospect_id: prospectId,
      created_by: userId,
      is_all_day: false,
      source: "booking",
    });
  }

  return data;
}
