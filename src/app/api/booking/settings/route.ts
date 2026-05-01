import { createApiHandler, Errors, parseBody } from "@/lib/api";

/**
 * GET /api/booking/settings
 * Returns the user's booking page settings: slot duration, working hours/days,
 * page title and description. Stored in profiles.metadata.
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

    // Default per-day schedule: Mon-Fri 9-18, weekends disabled
    const defaultDaySchedules: Record<number, { enabled: boolean; startHour: number; endHour: number }> = {
      0: { enabled: false, startHour: 9, endHour: 18 }, // Sun
      1: { enabled: true,  startHour: 9, endHour: 18 }, // Mon
      2: { enabled: true,  startHour: 9, endHour: 18 },
      3: { enabled: true,  startHour: 9, endHour: 18 },
      4: { enabled: true,  startHour: 9, endHour: 18 },
      5: { enabled: true,  startHour: 9, endHour: 18 }, // Fri
      6: { enabled: false, startHour: 9, endHour: 18 }, // Sat
    };

    return {
      title: (booking.title as string | undefined) ?? `RDV avec ${profile?.full_name ?? "moi"}`,
      description: (booking.description as string | undefined) ?? "",
      slug: profile?.booking_slug ?? null,
      availability: {
        slotMinutes: (availability.slotMinutes as number | undefined) ?? 30,
        daysAhead: (availability.daysAhead as number | undefined) ?? 14,
        daySchedules:
          (availability.daySchedules as typeof defaultDaySchedules | undefined) ?? defaultDaySchedules,
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
        daySchedules?: Record<number, { enabled: boolean; startHour: number; endHour: number }>;
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
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq("id", ctx.userId);

    if (updateError) throw Errors.internal("Échec de la mise à jour");

    return { success: true };
  },
  { requireWorkspace: false },
);
