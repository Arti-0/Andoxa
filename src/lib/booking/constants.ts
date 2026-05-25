/** Canonical timezone for public booking display and calendar writes. */
export const BOOKING_TIMEZONE = "Europe/Paris" as const;

export const DEFAULT_BOOKING_TITLE = "Échange découverte";

export const DEFAULT_BOOKING_DESCRIPTION =
  "Un premier échange pour faire connaissance et voir comment je peux vous aider.";

export const DEFAULT_MEETING_MODE = "Visioconférence";

export const DEFAULT_MIN_NOTICE_HOURS = 4;

export const DEFAULT_SLOT_MINUTES = 30;

/** Rolling window for public slot generation when no end date is configured. */
export const DEFAULT_DAYS_AHEAD = 365;

/** Stored values that map to {@link DEFAULT_DAYS_AHEAD} (implicit UI defaults). */
export const LEGACY_IMPLICIT_DAYS_AHEAD = [14, 90] as const;
