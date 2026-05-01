import { createApiHandler, Errors } from "@/lib/api";
import { getValidGoogleAccessToken } from "@/lib/google/calendar";

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleAttendee {
  email?: string;
  displayName?: string;
  responseStatus?: string;
  organizer?: boolean;
  self?: boolean;
}

interface GoogleConferenceEntryPoint {
  entryPointType?: string;
  uri?: string;
  label?: string;
}

interface GoogleEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  status?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: GoogleConferenceEntryPoint[];
  };
  attendees?: GoogleAttendee[];
}

interface GoogleEventsResponse {
  items?: GoogleEvent[];
  error?: { code: number; message: string };
}

/**
 * GET /api/google/calendar/events?start={ISO}&end={ISO}
 * Proxies Google Calendar primary calendar events for the current user.
 * Returns { items, connected } where connected=false means no Google token.
 *
 * Each item includes:
 *   - basic time/title fields
 *   - meetUrl: the Google Meet link attached to the event (hangoutLink or
 *     conferenceData entry point)
 *   - attendees: simplified attendee list ({ email, name, responseStatus })
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.userId) throw Errors.badRequest("Auth required");

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const accessToken = await getValidGoogleAccessToken(ctx.supabase, ctx.userId);
  if (!accessToken) {
    return { items: [], connected: false };
  }

  try {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    if (start) params.set("timeMin", start);
    if (end) params.set("timeMax", end);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as GoogleEventsResponse;
      if (body?.error?.code === 401 || body?.error?.code === 403) {
        return { items: [], connected: false };
      }
      return { items: [], connected: true };
    }

    const data = await res.json() as GoogleEventsResponse;
    const items = (data.items ?? [])
      .filter((e) => e.status !== "cancelled" && (e.start?.dateTime || e.start?.date))
      .map((e) => {
        const meetUrl =
          e.hangoutLink ??
          e.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ??
          null;
        const attendees = (e.attendees ?? []).map((a) => ({
          email: a.email ?? null,
          name: a.displayName ?? null,
          responseStatus: a.responseStatus ?? null,
        }));
        return {
          id: `google_${e.id ?? Math.random()}`,
          title: e.summary ?? "(Sans titre)",
          description: e.description ?? null,
          location: e.location ?? null,
          start: e.start?.dateTime ?? `${e.start?.date}T00:00:00`,
          end: e.end?.dateTime ?? `${e.end?.date}T23:59:00`,
          meetUrl,
          attendees,
          source: "google" as const,
        };
      });

    return { items, connected: true };
  } catch {
    return { items: [], connected: true };
  }
});
