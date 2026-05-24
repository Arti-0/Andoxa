import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import {
  buildGoogleAttendeeEmails,
  shouldNotifyGoogleAttendees,
} from "@/lib/booking/event-payload";
import { buildBookingEventDescription } from "@/lib/booking/event-description";
import { BOOKING_TIMEZONE } from "@/lib/booking/constants";
import {
  createGoogleMeetEvent,
  getValidGoogleAccessToken,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";

/**
 * Compose the calendar event title so the host's calendar shows who the RDV
 * is with, regardless of how the booking template is configured. Defaults
 * lean host-centric ("RDV avec [Host]") which is confusing on the host's own
 * calendar — they'd rather see the guest's name. We append the guest only
 * when it isn't already implied by the configured title.
 */
function composeCalendarTitle(
  configuredTitle: string,
  guestName: string | null | undefined
): string {
  const base = configuredTitle.trim() || "RDV";
  const guest = guestName?.trim();
  if (!guest) return base;
  if (base.toLowerCase().includes(guest.toLowerCase())) return base;
  return `${base} — ${guest}`;
}

export type CreateRdvEventParams = {
  organizationId: string;
  userId: string;
  ownerEmail: string | null;
  title: string;
  hostDescription: string;
  guestName: string;
  guestEmail?: string | null;
  guestLinkedin?: string | null;
  guestPhone?: string | null;
  startIso: string;
  endIso: string;
  prospectId: string | null;
  source: "booking" | "andoxa" | "manual";
  withGoogleMeet?: boolean;
  extraAttendeeEmails?: string[];
};

export type CreateRdvEventResult = {
  eventId: string;
  meetUrl: string | null;
  googleEventId: string | null;
  description: string;
};

/**
 * Inserts an events row and optionally creates a Google Calendar event with Meet.
 */
export async function createRdvCalendarEvent(
  supabase: SupabaseClient<Database>,
  params: CreateRdvEventParams
): Promise<CreateRdvEventResult> {
  // One title shared by both the Andoxa events row and the Google Calendar
  // event so the host sees the same "RDV — Guest" string everywhere.
  const calendarTitle = composeCalendarTitle(params.title, params.guestName);

  const description = buildBookingEventDescription({
    hostDescription: params.hostDescription,
    guestName: params.guestName,
    guestEmail: params.guestEmail,
    guestLinkedin: params.guestLinkedin,
    guestPhone: params.guestPhone,
  });

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      organization_id: params.organizationId,
      title: calendarTitle,
      description,
      start_time: params.startIso,
      end_time: params.endIso,
      prospect_id: params.prospectId,
      created_by: params.userId,
      is_all_day: false,
      source: params.source,
      guest_name: params.guestName,
      guest_email: params.guestEmail ?? null,
      guest_linkedin: params.guestLinkedin ?? null,
      guest_phone: params.guestPhone ?? null,
    })
    .select("id")
    .single();

  if (eventError || !event?.id) {
    throw eventError ?? new Error("missing_event_id");
  }

  let meetUrl: string | null = null;
  let googleEventId: string | null = null;

  if (params.withGoogleMeet) {
    try {
      const accessToken = await getValidGoogleAccessToken(supabase, params.userId);
      if (accessToken) {
        const attendeeEmails = buildGoogleAttendeeEmails(params.ownerEmail, [
          ...(params.extraAttendeeEmails ?? []),
          params.guestEmail,
        ]);
        const cal = await createGoogleMeetEvent(accessToken, {
          summary: calendarTitle,
          description,
          startIso: params.startIso,
          endIso: params.endIso,
          timeZone: BOOKING_TIMEZONE,
          attendeeEmails:
            attendeeEmails.length > 0 ? attendeeEmails : undefined,
          notifyAttendees: shouldNotifyGoogleAttendees(attendeeEmails),
        });
        meetUrl = cal.meetUrl;
        googleEventId = cal.eventId || null;
        if (meetUrl || googleEventId) {
          const descWithMeet = buildBookingEventDescription({
            hostDescription: params.hostDescription,
            guestName: params.guestName,
            guestEmail: params.guestEmail,
            guestLinkedin: params.guestLinkedin,
            guestPhone: params.guestPhone,
            meetUrl,
          });
          await supabase
            .from("events")
            .update({
              google_meet_url: meetUrl,
              google_event_id: googleEventId,
              description: descWithMeet,
              updated_at: new Date().toISOString(),
            })
            .eq("id", event.id);
          // Mirror Andoxa's full description (with the Meet URL) back to the
          // Google Calendar event so the native Google view shows the same
          // text. The initial POST had to send the description without the
          // Meet URL since Google only returns it after the event is created.
          if (googleEventId) {
            try {
              await updateGoogleCalendarEvent(accessToken, {
                eventId: googleEventId,
                description: descWithMeet,
              });
            } catch (patchErr) {
              // Non-fatal: Google already shows the Meet link natively via
              // conferenceData, so even without this patch the meeting is
              // joinable. We just lose the description-text consistency.
              console.warn(
                "[create-rdv] post-meet description sync failed:",
                patchErr
              );
            }
          }
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  return {
    eventId: event.id,
    meetUrl,
    googleEventId,
    description:
      meetUrl != null
        ? buildBookingEventDescription({
            hostDescription: params.hostDescription,
            guestName: params.guestName,
            guestEmail: params.guestEmail,
            guestLinkedin: params.guestLinkedin,
            guestPhone: params.guestPhone,
            meetUrl,
          })
        : description,
  };
}
