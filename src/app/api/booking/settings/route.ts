import { createApiHandler, Errors, parseBody } from "@/lib/api";
import type { Json } from "@/lib/types/supabase";
import {
  dayScheduleRanges,
  type AvailabilityException,
  type DaySchedule,
  type TimeRange,
} from "@/lib/booking/slots";
import {
  resolveMeetingDisplay,
  resolveAvailabilityDefaults,
} from "@/lib/booking/meeting-display";
import { orgHasActiveOnBookingWhatsAppWorkflow } from "@/lib/workflows/on-booking-whatsapp";

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
      .select("metadata, full_name, booking_slug, active_organization_id")
      .eq("id", ctx.userId)
      .single();

    if (error) throw Errors.internal("Profil introuvable");

    const meta = ((profile?.metadata ?? {}) as Record<string, unknown>) || {};
    const hostName = profile?.full_name ?? "moi";
    const meeting = resolveMeetingDisplay(meta, hostName);
    const availabilityDefaults = resolveAvailabilityDefaults(meta);
    const availability = (meta.availability ?? {}) as Record<string, unknown>;
    const orgId =
      ctx.workspaceId ??
      (profile as { active_organization_id?: string | null })
        .active_organization_id ??
      null;
    const hasOnBookingWaWorkflow = orgId
      ? await orgHasActiveOnBookingWhatsAppWorkflow(ctx.supabase, orgId)
      : false;

    return {
      title: meeting.title,
      description: meeting.description,
      mode: meeting.mode,
      slug: profile?.booking_slug ?? null,
      show_post_booking_wa_notice: meeting.showPostBookingWaNotice,
      has_on_booking_wa_workflow: hasOnBookingWaWorkflow,
      availability: {
        slotMinutes: availabilityDefaults.slotMinutes,
        daysAhead: availabilityDefaults.daysAhead,
        minNoticeHours: availabilityDefaults.minNoticeHours,
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
      mode?: string;
      /** Toggle for the on_booking WA workflow hint. */
      show_post_booking_wa_notice?: boolean;
      availability?: {
        slotMinutes?: number;
        daysAhead?: number;
        /** Minimum lead time in hours before a slot can be booked. */
        minNoticeHours?: number;
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
        ...(body.mode !== undefined ? { mode: body.mode } : {}),
        ...(body.show_post_booking_wa_notice !== undefined
          ? { show_post_booking_wa_notice: body.show_post_booking_wa_notice }
          : {}),
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
