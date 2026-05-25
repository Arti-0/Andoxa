import {
  addDays,
  addMinutes,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
} from "date-fns";

import { DEFAULT_DAYS_AHEAD, DEFAULT_SLOT_MINUTES } from "./constants";
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
const DEFAULT_RANGES: TimeRange[] = [
  { start: "09:00", end: "12:00" },
  { start: "14:00", end: "18:00" },
];

export interface Slot {
  start: string;
  end: string;
}

export interface EventRow {
  start_time: string;
  end_time: string;
}

/** A single bookable window inside a day. */
export interface TimeRange {
  /** "HH:MM" 24h format. */
  start: string;
  end: string;
}

/** Per-day-of-week schedule. */
export interface DaySchedule {
  enabled: boolean;
  /** Multiple ranges per day (e.g. 9:00-12:00 + 14:00-18:00). */
  ranges?: TimeRange[];
  /** @deprecated legacy single-range fields, still read for back-compat. */
  startHour?: number;
  endHour?: number;
}

/** Date-specific override (Calendly "Date overrides"). */
export interface AvailabilityException {
  /** "YYYY-MM-DD" */
  date: string;
  /** null = day is closed regardless of weekday schedule. */
  ranges: TimeRange[] | null;
}

export interface AvailabilityConfig {
  /** @deprecated legacy single-window day fallback. */
  startHour?: number;
  /** @deprecated legacy single-window day fallback. */
  endHour?: number;
  slotMinutes?: number;
  workingDays?: number[];
  daysAhead?: number;
  /**
   * Minimum lead time in hours before a slot can be booked. Default 4 (set
   * in the slots endpoint). 0 = bookable up to slot start.
   */
  minNoticeHours?: number;
  /**
   * Per-day-of-week schedule keyed by JS getDay() (0=Sun..6=Sat).
   * When present, overrides startHour/endHour/workingDays.
   */
  daySchedules?: Record<number, DaySchedule>;
  /**
   * Date-specific exceptions. Each row replaces the day-of-week schedule
   * for that exact date. `ranges: null` marks the day as closed.
   */
  exceptions?: AvailabilityException[];
}

/* ============================================================
   Range helpers
   ============================================================ */

/** "HH:MM" → decimal hours */
function rangeToHours(t: string): number {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  if (Number.isNaN(h)) return 0;
  return h + (Number.isNaN(m) ? 0 : m / 60);
}

/** Pull the canonical list of ranges out of a (possibly legacy) DaySchedule. */
export function dayScheduleRanges(sched: DaySchedule | undefined): TimeRange[] {
  if (!sched || !sched.enabled) return [];
  if (sched.ranges && sched.ranges.length > 0) return sched.ranges;
  if (typeof sched.startHour === "number" && typeof sched.endHour === "number") {
    return [
      {
        start: `${String(sched.startHour).padStart(2, "0")}:00`,
        end: `${String(sched.endHour).padStart(2, "0")}:00`,
      },
    ];
  }
  return [];
}

/** Paris offset: UTC+1 winter, UTC+2 summer (approx Mar-Oct) */
function getParisOffsetHours(date: Date): number {
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  if (m >= 3 && m <= 9) return 2;
  if (m === 2 && d >= 25) return 2;
  if (m === 10 && d < 25) return 2;
  return 1;
}

function dayISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/* ============================================================
   Slot generation
   ============================================================ */

/**
 * Generate availability slots for a date range, honouring:
 *   1. Date exceptions (highest priority)
 *   2. Per-day-of-week schedules with multiple ranges
 *   3. Legacy startHour/endHour fallback
 */
export function getDefaultSlotsForDateRange(
  from: Date,
  config?: AvailabilityConfig,
): Slot[] {
  const slotMinutes = config?.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const fallbackStartHour = config?.startHour;
  const fallbackEndHour = config?.endHour;
  const workingDays = config?.workingDays ?? DEFAULT_WORKING_DAYS;
  const daysAhead = config?.daysAhead ?? DEFAULT_DAYS_AHEAD;
  const daySchedules = config?.daySchedules;
  const exceptions = config?.exceptions ?? [];
  const exceptionsByDate = new Map(
    exceptions.map((e) => [e.date, e.ranges]),
  );

  const slots: Slot[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const day = addDays(from, d);
    const iso = dayISO(day);
    const dow = day.getUTCDay();

    // 1. Date override?
    let ranges: TimeRange[];
    if (exceptionsByDate.has(iso)) {
      const exc = exceptionsByDate.get(iso);
      if (exc === null) continue; // explicitly closed for the day
      ranges = exc!;
    } else if (daySchedules && daySchedules[dow]) {
      ranges = dayScheduleRanges(daySchedules[dow]);
      if (ranges.length === 0) continue;
    } else if (typeof fallbackStartHour === "number" && typeof fallbackEndHour === "number") {
      if (!workingDays.includes(dow)) continue;
      ranges = [
        {
          start: `${String(fallbackStartHour).padStart(2, "0")}:00`,
          end: `${String(fallbackEndHour).padStart(2, "0")}:00`,
        },
      ];
    } else {
      // No schedule + no fallback → use the universal Mon-Fri 9-12,14-18
      if (!workingDays.includes(dow)) continue;
      ranges = DEFAULT_RANGES;
    }

    const offset = getParisOffsetHours(day);
    const y = day.getUTCFullYear();
    const mon = day.getUTCMonth();
    const dayNum = day.getUTCDate();

    for (const r of ranges) {
      const sH = rangeToHours(r.start);
      const eH = rangeToHours(r.end);
      if (eH <= sH) continue;
      const utcStartHour = sH - offset;
      const utcEndHour = eH - offset;
      const startMinuteFraction = (sH - Math.floor(sH)) * 60;
      const endMinuteFraction = (eH - Math.floor(eH)) * 60;
      const dayStart = new Date(
        Date.UTC(y, mon, dayNum, Math.floor(utcStartHour), startMinuteFraction, 0),
      );
      const dayEnd = new Date(
        Date.UTC(y, mon, dayNum, Math.floor(utcEndHour), endMinuteFraction, 0),
      );

      let slotStart = dayStart;
      while (isBefore(slotStart, dayEnd)) {
        const slotEnd = addMinutes(slotStart, slotMinutes);
        if (isAfter(slotEnd, dayEnd)) break;
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
        slotStart = slotEnd;
      }
    }
  }

  return slots;
}

/**
 * Filter out slots that overlap with existing events.
 */
export function excludeBookedSlots(
  slots: Slot[],
  events: EventRow[],
): Slot[] {
  return slots.filter((slot) => {
    const slotStart = parseISO(slot.start);
    const slotEnd = parseISO(slot.end);

    const overlaps = events.some((ev) => {
      const evStart = parseISO(ev.start_time);
      const evEnd = parseISO(ev.end_time);
      return (
        isWithinInterval(slotStart, { start: evStart, end: evEnd }) ||
        isWithinInterval(slotEnd, { start: evStart, end: evEnd }) ||
        (isBefore(slotStart, evStart) && isAfter(slotEnd, evEnd))
      );
    });

    return !overlaps;
  });
}
