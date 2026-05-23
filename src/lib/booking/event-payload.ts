/**
 * Google Calendar attendee policy (CP-004):
 * - Public booking: host + guest email (when provided) via createRdvCalendarEvent
 * - Internal /api/events: creator + prospect email (server-enriched) + optional colleagues from create-modal
 * - Phone-only guests are not Google attendees — WhatsApp carries the meet link instead (CP-010)
 */
export function buildGoogleAttendeeEmails(
  creatorEmail: string | null | undefined,
  extraEmails: Array<string | null | undefined>
): string[] {
  const raw = [creatorEmail, ...extraEmails].filter(
    (e): e is string => !!e && e.includes("@")
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of raw) {
    const low = e.toLowerCase();
    if (!seen.has(low)) {
      seen.add(low);
      out.push(e);
    }
  }
  return out;
}

export function shouldNotifyGoogleAttendees(attendeeEmails: string[]): boolean {
  return attendeeEmails.length > 0;
}
