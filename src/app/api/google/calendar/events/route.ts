import { createApiHandler, Errors } from "@/lib/api";
import { getValidGoogleAccessToken } from "@/lib/google/calendar";

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEvent {
  id?: string;
  summary?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  status?: string;
  htmlLink?: string;
}

interface GoogleEventsResponse {
  items?: GoogleEvent[];
  error?: { code: number; message: string };
}

/**
 * GET /api/google/calendar/events?start={ISO}&end={ISO}
 * Proxies the Google Calendar primary calendar events for the current user.
 * Returns { items, connected } where connected=false means no Google token.
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
      // Token might be revoked — return empty but connected=false
      const body = await res.json().catch(() => ({})) as GoogleEventsResponse;
      if (body?.error?.code === 401 || body?.error?.code === 403) {
        return { items: [], connected: false };
      }
      return { items: [], connected: true };
    }

    const data = await res.json() as GoogleEventsResponse;
    const items = (data.items ?? [])
      .filter((e) => e.status !== "cancelled" && (e.start?.dateTime || e.start?.date))
      .map((e) => ({
        id: `google_${e.id ?? Math.random()}`,
        title: e.summary ?? "(Sans titre)",
        start: e.start?.dateTime ?? `${e.start?.date}T00:00:00`,
        end: e.end?.dateTime ?? `${e.end?.date}T23:59:00`,
        source: "google" as const,
      }));

    return { items, connected: true };
  } catch {
    return { items: [], connected: true };
  }
});
