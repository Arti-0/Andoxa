import {
  addDays,
  addMinutes,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
} from "date-fns";

const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 18;
const DEFAULT_DAYS_AHEAD = 14;
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

export interface Slot {
  start: string;
  end: string;
}

export interface EventRow {
  start_time: string;
  end_time: string;
}

export interface DaySchedule {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface AvailabilityConfig {
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  workingDays?: number[];
  daysAhead?: number;
  /**
   * Per-day schedules keyed by JS getDay() (0=Sun..6=Sat).
   * When present, overrides startHour/endHour/workingDays.
   */
  daySchedules?: Record<number, DaySchedule>;
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

/**
 * Generate availability slots for a date range.
 * Configurable hours, days, slot duration. Defaults to Mon-Fri 9h-18h Europe/Paris, 30min slots.
 */
export function getDefaultSlotsForDateRange(from: Date, config?: AvailabilityConfig): Slot[] {
  const slotMinutes = config?.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const fallbackStartHour = config?.startHour ?? DEFAULT_START_HOUR;
  const fallbackEndHour = config?.endHour ?? DEFAULT_END_HOUR;
  const workingDays = config?.workingDays ?? DEFAULT_WORKING_DAYS;
  const daysAhead = config?.daysAhead ?? DEFAULT_DAYS_AHEAD;
  const daySchedules = config?.daySchedules;

  const slots: Slot[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const day = addDays(from, d);
    const dow = day.getUTCDay();

    // Per-day schedule takes precedence; otherwise legacy single-window applies.
    let startHour = fallbackStartHour;
    let endHour = fallbackEndHour;
    if (daySchedules && daySchedules[dow]) {
      const sched = daySchedules[dow];
      if (!sched.enabled) continue;
      startHour = sched.startHour;
      endHour = sched.endHour;
    } else if (!workingDays.includes(dow)) {
      continue;
    }

    const offset = getParisOffsetHours(day);
    const utcStartHour = startHour - offset;
    const utcEndHour = endHour - offset;

    const y = day.getUTCFullYear();
    const mon = day.getUTCMonth();
    const dayNum = day.getUTCDate();

    const dayStart = new Date(Date.UTC(y, mon, dayNum, utcStartHour, 0, 0));
    const dayEnd = new Date(Date.UTC(y, mon, dayNum, utcEndHour, 0, 0));

    let slotStart = dayStart;
    while (isBefore(slotStart, dayEnd)) {
      const slotEnd = addMinutes(slotStart, slotMinutes);
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
      slotStart = slotEnd;
    }
  }

  return slots;
}

/**
 * Filter out slots that overlap with existing events.
 */
export function excludeBookedSlots(
  slots: Slot[],
  events: EventRow[]
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
