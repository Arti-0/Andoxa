/**
 * Builds a Google Calendar TEMPLATE URL — opens calendar.google.com with the
 * event pre-filled. Works without a Google API event id.
 */
export function buildGoogleCalendarUrl(opts: {
  startIso: string;
  endIso: string;
  title: string;
  details?: string;
  location?: string;
}): string {
  const toGcal = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${toGcal(opts.startIso)}/${toGcal(opts.endIso)}`,
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
