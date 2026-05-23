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
} from "@/lib/google/calendar";

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
      title: params.title,
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
          summary: params.title,
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
