import {
  addDays,
  addMinutes,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
} from "date-fns";

const SLOT_MINUTES = 30;
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 18;
const DAYS_AHEAD = 14;

export interface Slot {
  start: string;
  end: string;
}

export interface EventRow {
  start_time: string;
  end_time: string;
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
 * Generate default availability slots for a date range.
 * Mon-Fri 9h-18h Europe/Paris, 30min slots.
 */
export function getDefaultSlotsForDateRange(from: Date): Slot[] {
  const slots: Slot[] = [];

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = addDays(from, d);
    const dow = day.getUTCDay();
    if (dow === 0 || dow === 6) continue;

    const offset = getParisOffsetHours(day);
    const utcStartHour = DEFAULT_START_HOUR - offset;
    const utcEndHour = DEFAULT_END_HOUR - offset;

    const y = day.getUTCFullYear();
    const mon = day.getUTCMonth();
    const dayNum = day.getUTCDate();

    const dayStart = new Date(Date.UTC(y, mon, dayNum, utcStartHour, 0, 0));
    const dayEnd = new Date(Date.UTC(y, mon, dayNum, utcEndHour, 0, 0));

    let slotStart = dayStart;
    while (isBefore(slotStart, dayEnd)) {
      const slotEnd = addMinutes(slotStart, SLOT_MINUTES);
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
