/**
 * Minimal RFC 5545 ICS for a single meeting (METHOD:PUBLISH, no attendee workflow).
 */

function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function toIcsUtc(d: Date): string {
  const iso = d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/i, "Z");
  return iso;
}

export function buildBookingInviteIcs(opts: {
  uid: string;
  startUtc: Date;
  endUtc: Date;
  summary: string;
  description: string;
  organizerName: string;
  organizerEmail: string | null;
}): string {
  const orgEmail = opts.organizerEmail?.trim().toLowerCase() ?? "";
  const organizer =
    orgEmail.includes("@")
      ? `ORGANIZER;CN=${escapeIcsText(opts.organizerName)}:mailto:${escapeIcsText(orgEmail)}`
      : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Andoxa//Booking//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(opts.uid)}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(opts.startUtc)}`,
    `DTEND:${toIcsUtc(opts.endUtc)}`,
    `SUMMARY:${escapeIcsText(opts.summary)}`,
    ...(opts.description.trim()
      ? [`DESCRIPTION:${escapeIcsText(opts.description)}`]
      : []),
    ...(organizer ? [organizer] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
