/**
 * Timezone-aware date boundaries for dashboard / KPI queries.
 *
 * The server runs in UTC on Vercel. Computing "today" with
 * `new Date().setHours(0, 0, 0, 0)` therefore returns UTC midnight, which
 * is the wrong day boundary for users in any non-UTC timezone — a French
 * user at 22:30 local on Friday sees Saturday's data because Friday already
 * rolled over to Saturday in UTC two hours earlier.
 *
 * Today this defaults to `DEFAULT_DASHBOARD_TIMEZONE` (Europe/Paris). Once
 * we expose per-org / per-user timezone settings we can plumb that through
 * — every consumer takes a timezone argument already.
 */

export const DEFAULT_DASHBOARD_TIMEZONE = "Europe/Paris";

/**
 * Offset between UTC and `timeZone` at the given instant, in milliseconds.
 * Positive = TZ is ahead of UTC (e.g. Paris in summer returns +7_200_000).
 *
 * Uses the toLocaleString round-trip: format the date as a wall-clock string
 * in each zone, parse those strings back to Date in the server's local zone,
 * then subtract. Works regardless of what the server's local zone is — the
 * parsing bias cancels out because both sides parse the same way.
 */
export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const tzAsLocal = new Date(date.toLocaleString("en-US", { timeZone }));
  const utcAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return tzAsLocal.getTime() - utcAsLocal.getTime();
}

/**
 * Return the calendar date (YYYY-MM-DD) of `date` as it appears in `timeZone`.
 * Uses `en-CA` formatting because it natively emits ISO-8601 date order.
 */
export function formatYmdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Boundaries of "today" in the given timezone, as UTC ISO strings ready for
 * Postgres timestamptz comparisons.
 *
 * @example
 *   const { startIso, endIso } = todayBoundsIso();           // Europe/Paris
 *   const { startIso, endIso } = todayBoundsIso("America/New_York");
 */
export function todayBoundsIso(
  timeZone: string = DEFAULT_DASHBOARD_TIMEZONE,
  now: Date = new Date()
): { startIso: string; endIso: string } {
  const ymd = formatYmdInTimeZone(now, timeZone);
  const offsetMs = getTimeZoneOffsetMs(now, timeZone);
  // `Date.parse("YYYY-MM-DDT00:00:00.000Z")` returns the UTC instant for
  // that wall-clock; subtracting the TZ offset shifts to the UTC instant
  // representing local midnight in `timeZone`.
  const utcMidnightOfYmd = Date.parse(`${ymd}T00:00:00.000Z`);
  const startMs = utcMidnightOfYmd - offsetMs;
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
  };
}

/**
 * Boundaries of the ISO week containing `now` in the given timezone, as UTC
 * ISO strings. Week starts Monday 00:00 local — same convention as
 * `formatLocalWeekStart` / Postgres `date_trunc('week', ...)`.
 */
export function weekBoundsIso(
  timeZone: string = DEFAULT_DASHBOARD_TIMEZONE,
  now: Date = new Date()
): { startIso: string; endIso: string } {
  const today = todayBoundsIso(timeZone, now);
  const todayStart = new Date(today.startIso);
  // getUTCDay returns 0=Sunday..6=Saturday — we want Monday=0..Sunday=6
  // so a Monday-start week aligns with European convention.
  const dow = (todayStart.getUTCDay() + 6) % 7;
  const startMs = todayStart.getTime() - dow * 24 * 60 * 60 * 1000;
  const endMs = startMs + 7 * 24 * 60 * 60 * 1000 - 1;
  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
  };
}
