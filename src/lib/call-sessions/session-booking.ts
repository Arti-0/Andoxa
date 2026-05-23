import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { createRdvCalendarEvent } from "@/lib/events/create-rdv-event";
import { afterRdvCreated } from "@/lib/events/after-rdv-created";
import { resolveMeetingDisplay } from "@/lib/booking/meeting-display";

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
      .select("full_name, email, phone, linkedin")
      .eq("id", prospectId)
      .single();

    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("full_name, email, metadata")
      .eq("id", userId)
      .single();

    const prospectName = prospect?.full_name ?? "Prospect";
    const hostName = hostProfile?.full_name?.trim() || "Hôte";
    const meeting = resolveMeetingDisplay(
      (hostProfile?.metadata ?? {}) as Record<string, unknown>,
      hostName
    );
    const startTime = new Date(scheduled_for);
    const endTime = new Date(
      startTime.getTime() + BOOKING_DEFAULT_DURATION_MIN * 60 * 1000
    );

    const created = await createRdvCalendarEvent(supabase, {
      organizationId,
      userId,
      ownerEmail: hostProfile?.email ?? null,
      title: meeting.title,
      hostDescription: notes?.trim() || meeting.description,
      guestName: prospectName,
      guestEmail: prospect?.email ?? null,
      guestLinkedin: prospect?.linkedin ?? null,
      guestPhone: prospect?.phone ?? null,
      startIso: startTime.toISOString(),
      endIso: endTime.toISOString(),
      prospectId,
      source: "booking",
      withGoogleMeet: true,
      extraAttendeeEmails: prospect?.email ? [prospect.email] : [],
    });

    await afterRdvCreated(supabase, {
      organizationId,
      eventId: created.eventId,
      prospectId,
      hostUserId: userId,
      hostName,
      guestOrProspectName: prospectName,
      fromPublicBooking: false,
      meetUrl: created.meetUrl,
      slotStartIso: startTime.toISOString(),
    });
  }

  return data;
}
