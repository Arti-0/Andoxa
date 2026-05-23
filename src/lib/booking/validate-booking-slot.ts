import {
  excludeBookedSlots,
  getDefaultSlotsForDateRange,
  type AvailabilityConfig,
  type EventRow,
  type Slot,
} from "./slots";
import { resolveAvailabilityDefaults } from "./meeting-display";

export type SlotValidationResult =
  | { ok: true; slot: Slot }
  | { ok: false; error: string };

/**
 * Ensures a requested slot matches generated availability (same rules as GET
 * /api/booking/[slug]/slots) and is not double-booked.
 */
export function validateBookingSlotRequest(
  slotStartIso: string,
  slotEndIso: string,
  availability: AvailabilityConfig,
  bookedEvents: EventRow[]
): SlotValidationResult {
  const slotStart = new Date(slotStartIso);
  const slotEnd = new Date(slotEndIso);
  if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
    return { ok: false, error: "Invalid slot dates" };
  }
  if (slotStart >= slotEnd) {
    return { ok: false, error: "Invalid slot" };
  }
  if (slotStart < new Date()) {
    return { ok: false, error: "Slot is in the past" };
  }

  const { minNoticeHours, daysAhead } = resolveAvailabilityDefaults({
    availability,
  });
  const from = new Date();
  const allSlots = getDefaultSlotsForDateRange(from, {
    ...availability,
    daysAhead,
  });
  const available = excludeBookedSlots(allSlots, bookedEvents);

  const earliestStart = new Date(from.getTime() + minNoticeHours * 3_600_000);
  const match = available.find(
    (s) =>
      s.start === slotStartIso &&
      s.end === slotEndIso &&
      new Date(s.start) > earliestStart
  );

  if (!match) {
    return { ok: false, error: "This slot is no longer available" };
  }

  return { ok: true, slot: match };
}
