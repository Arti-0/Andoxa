import { createApiHandler, Errors, parseBody } from "@/lib/api";
import type { Json } from "@/lib/types/supabase";
import {
  dayScheduleRanges,
  type AvailabilityException,
  type DaySchedule,
  type TimeRange,
} from "@/lib/booking/slots";

type DaySchedulesMap = Record<number, DaySchedule>;

const DEFAULT_RANGES: TimeRange[] = [
  { start: "09:00", end: "12:00" },
  { start: "14:00", end: "18:00" },
];

const DEFAULT_DAY_SCHEDULES: DaySchedulesMap = {
  0: { enabled: false, ranges: DEFAULT_RANGES }, // Sun
  1: { enabled: true,  ranges: DEFAULT_RANGES }, // Mon
  2: { enabled: true,  ranges: DEFAULT_RANGES },
  3: { enabled: true,  ranges: DEFAULT_RANGES },
  4: { enabled: true,  ranges: DEFAULT_RANGES },
  5: { enabled: true,  ranges: DEFAULT_RANGES }, // Fri
  6: { enabled: false, ranges: DEFAULT_RANGES }, // Sat
};

/** Normalise a raw schedule (possibly using legacy `startHour`/`endHour`)
 *  into the canonical `{ enabled, ranges }` shape. */
function normaliseSchedule(raw: unknown): DaySchedule {
  if (!raw || typeof raw !== "object") {
    return { enabled: false, ranges: [] };
  }
  const sched = raw as DaySchedule;
  const ranges = dayScheduleRanges(sched);
  return { enabled: !!sched.enabled, ranges };
}

function normaliseDaySchedules(raw: unknown): DaySchedulesMap {
  if (!raw || typeof raw !== "object") return DEFAULT_DAY_SCHEDULES;
  const out: DaySchedulesMap = {};
  for (let i = 0; i < 7; i++) {
    const k = i as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const entry = (raw as Record<string, unknown>)[String(i)];
    out[k] = entry ? normaliseSchedule(entry) : DEFAULT_DAY_SCHEDULES[k];
  }
  return out;
}

/**
 * GET /api/booking/settings
 * Returns the user's booking page settings: slot duration, weekly schedule,
 * date exceptions, page title and description. Stored in profiles.metadata.
 *
 * Legacy {startHour, endHour} per-day rows are converted on the fly to
 * the canonical {enabled, ranges} shape so the UI never has to handle the
 * old format.
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    if (!ctx.userId) throw Errors.unauthorized();

    const { data: profile, error } = await ctx.supabase
      .from("profiles")
      .select("metadata, full_name, booking_slug")
      .eq("id", ctx.userId)
      .single();

    if (error) throw Errors.internal("Profil introuvable");

    const meta = ((profile?.metadata ?? {}) as Record<string, unknown>) || {};
    const availability = (meta.availability ?? {}) as Record<string, unknown>;
    const booking = (meta.booking ?? {}) as Record<string, unknown>;

    return {
      title: (booking.title as string | undefined) ?? `RDV avec ${profile?.full_name ?? "moi"}`,
      description: (booking.description as string | undefined) ?? "",
      slug: profile?.booking_slug ?? null,
      availability: {
        slotMinutes: (availability.slotMinutes as number | undefined) ?? 30,
        daysAhead: (availability.daysAhead as number | undefined) ?? 14,
        daySchedules: normaliseDaySchedules(availability.daySchedules),
        exceptions: Array.isArray(availability.exceptions)
          ? (availability.exceptions as AvailabilityException[])
          : ([] as AvailabilityException[]),
      },
    };
  },
  { requireWorkspace: false },
);

/**
 * PATCH /api/booking/settings
 * Updates the booking page settings (merged into metadata.booking and metadata.availability).
 */
export const PATCH = createApiHandler(
  async (req, ctx) => {
    if (!ctx.userId) throw Errors.unauthorized();

    const body = await parseBody<{
      title?: string;
      description?: string;
      availability?: {
        slotMinutes?: number;
        daysAhead?: number;
        daySchedules?: DaySchedulesMap;
        exceptions?: AvailabilityException[];
      };
    }>(req);

    // Read current metadata
    const { data: existing, error: readError } = await ctx.supabase
      .from("profiles")
      .select("metadata")
      .eq("id", ctx.userId)
      .single();

    if (readError) throw Errors.internal("Profil introuvable");

    const meta = ((existing?.metadata ?? {}) as Record<string, unknown>) || {};
    const currentBooking = (meta.booking ?? {}) as Record<string, unknown>;
    const currentAvailability = (meta.availability ?? {}) as Record<string, unknown>;

    const nextMeta: Record<string, unknown> = {
      ...meta,
      booking: {
        ...currentBooking,
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
      availability: {
        ...currentAvailability,
        ...(body.availability ?? {}),
      },
    };

    const { error: updateError } = await ctx.supabase
      .from("profiles")
      .update({ metadata: nextMeta as Json, updated_at: new Date().toISOString() })
      .eq("id", ctx.userId);

    if (updateError) throw Errors.internal("Échec de la mise à jour");

    return { success: true };
  },
  { requireWorkspace: false },
);
