import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { getGoogleClientId, isGoogleOAuthConfigured } from "@/lib/google/oauth-config";
import { refreshGoogleAccessToken } from "@/lib/google/refresh-access-token";

const BUFFER_MS = 5 * 60 * 1000;

export async function getValidGoogleAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  if (!isGoogleOAuthConfigured() || !getGoogleClientId()) {
    return null;
  }

  const { data: row, error } = await supabase
    .from("user_google_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row?.access_token) return null;

  const expiry = row.token_expiry ? new Date(row.token_expiry).getTime() : 0;
  const needsRefresh =
    !row.refresh_token ||
    !expiry ||
    expiry < Date.now() + BUFFER_MS;

  if (!needsRefresh) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    return row.access_token;
  }

  try {
    const refreshed = await refreshGoogleAccessToken(row.refresh_token);
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("user_google_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? row.refresh_token,
        token_expiry: newExpiry,
        scope: refreshed.scope ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return refreshed.access_token;
  } catch (e) {
    console.error("[google] refresh failed for user", userId, e);
    return null;
  }
}

export type CreateMeetEventInput = {
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  /** Optional attendee emails (Google Calendar). */
  attendeeEmails?: string[];
};

export type CreateMeetEventResult = {
  meetUrl: string | null;
  eventId: string;
};

/**
 * Creates a Calendar event with a Google Meet conference.
 * Requires scope calendar.events; query param conferenceDataVersion=1.
 */
export async function createGoogleMeetEvent(
  accessToken: string,
  input: CreateMeetEventInput
): Promise<CreateMeetEventResult> {
  const requestId = crypto.randomUUID();
  const attendees = (input.attendeeEmails ?? [])
    .filter((e) => e && e.includes("@"))
    .map((email) => ({ email }));

  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? "",
    start: { dateTime: input.startIso },
    end: { dateTime: input.endIso },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };
  if (attendees.length > 0) {
    body.attendees = attendees;
  }

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("conferenceDataVersion", "1");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json.error === "object" && json.error !== null
        ? JSON.stringify((json.error as { message?: string }).message ?? json.error)
        : JSON.stringify(json);
    throw new Error(`Google Calendar API error: ${err}`);
  }

  const eventId = typeof json.id === "string" ? json.id : "";
  const meetUrl =
    typeof json.hangoutLink === "string"
      ? json.hangoutLink
      : typeof json.conferenceData === "object" &&
          json.conferenceData !== null &&
          typeof (json.conferenceData as { entryPoints?: { uri?: string }[] }).entryPoints?.[0]
            ?.uri === "string"
        ? (json.conferenceData as { entryPoints: { uri: string }[] }).entryPoints[0].uri
        : null;

  return { meetUrl, eventId };
}
