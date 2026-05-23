import { BOOKING_TIMEZONE } from "./constants";

/** YYYY-MM-DD in the canonical booking timezone. */
export function dateYmdInBookingTz(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Wall-clock ISO without offset — pair with Google Calendar `timeZone: Europe/Paris`. */
export function wallClockIsoInBookingTz(
  dateYmd: string,
  hour: number,
  minute: number,
  second = 0
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateYmd}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export function wallClockRangeInBookingTz(
  dateYmd: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): { startIso: string; endIso: string } {
  return {
    startIso: wallClockIsoInBookingTz(dateYmd, startHour, startMinute),
    endIso: wallClockIsoInBookingTz(dateYmd, endHour, endMinute),
  };
}

/** Read a Date's wall clock in BOOKING_TIMEZONE as naive ISO. */
export function wallClockIsoFromDateInBookingTz(date: Date): string {
  const ymd = dateYmdInBookingTz(date);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return wallClockIsoInBookingTz(
    ymd,
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second"))
  );
}
