import {
  DEFAULT_BOOKING_DESCRIPTION,
  DEFAULT_BOOKING_TITLE,
  DEFAULT_MEETING_MODE,
  DEFAULT_MIN_NOTICE_HOURS,
  DEFAULT_SLOT_MINUTES,
  DEFAULT_DAYS_AHEAD,
  LEGACY_IMPLICIT_DAYS_AHEAD,
} from "./constants";
import type { AvailabilityConfig } from "./slots";

export type MeetingTypeMeta = {
  title?: string;
  description?: string;
  duration?: number;
  mode?: string;
  role?: string;
};

export type BookingMeta = {
  title?: string;
  description?: string;
  mode?: string;
  show_post_booking_wa_notice?: boolean;
};

export type ResolvedMeetingDisplay = {
  title: string;
  description: string;
  duration: number;
  mode: string;
  role: string;
  showPostBookingWaNotice: boolean;
};

/**
 * Single source for meeting copy shown on the public booking page, settings
 * modal, and event payloads created from a booking.
 */
export function resolveMeetingDisplay(
  meta: Record<string, unknown> | null | undefined,
  hostName: string
): ResolvedMeetingDisplay {
  const mt = (meta?.meetingType ?? {}) as MeetingTypeMeta;
  const booking = (meta?.booking ?? {}) as BookingMeta;
  const availability = (meta?.availability ?? {}) as AvailabilityConfig;
  const slotMinutes =
    typeof availability.slotMinutes === "number"
      ? availability.slotMinutes
      : DEFAULT_SLOT_MINUTES;

  const fallbackTitle =
    hostName.trim().length > 0
      ? `RDV avec ${hostName.trim()}`
      : DEFAULT_BOOKING_TITLE;

  return {
    title: booking.title ?? mt.title ?? fallbackTitle,
    description:
      booking.description ?? mt.description ?? DEFAULT_BOOKING_DESCRIPTION,
    duration: mt.duration ?? slotMinutes,
    mode: booking.mode ?? mt.mode ?? DEFAULT_MEETING_MODE,
    role: mt.role ?? "",
    showPostBookingWaNotice: booking.show_post_booking_wa_notice ?? true,
  };
}

export function resolveAvailabilityDefaults(
  meta: Record<string, unknown> | null | undefined
): Required<
  Pick<AvailabilityConfig, "slotMinutes" | "daysAhead" | "minNoticeHours">
> {
  const availability = (meta?.availability ?? {}) as AvailabilityConfig;
  const storedDaysAhead = availability.daysAhead;
  const daysAhead =
    storedDaysAhead == null ||
    storedDaysAhead === LEGACY_IMPLICIT_DAYS_AHEAD
      ? DEFAULT_DAYS_AHEAD
      : storedDaysAhead;
  return {
    slotMinutes: availability.slotMinutes ?? DEFAULT_SLOT_MINUTES,
    daysAhead,
    minNoticeHours:
      typeof availability.minNoticeHours === "number" &&
      availability.minNoticeHours >= 0
        ? availability.minNoticeHours
        : DEFAULT_MIN_NOTICE_HOURS,
  };
}
