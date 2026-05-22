import { createApiHandler, Errors, parseBody } from "@/lib/api";
import {
  bookingPublicPathCollides,
  normalizeBookingPublicPath,
} from "@/lib/booking/public-path";

/**
 * GET /api/booking/slug — public booking path + internal slug for the current user.
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    if (!ctx.userId) throw Errors.unauthorized();

    const { data: profile, error } = await ctx.supabase
      .from("profiles")
      .select("booking_slug, booking_public_path")
      .eq("id", ctx.userId)
      .single();

    if (error) throw Errors.internal("Profil introuvable");

    const row = profile as {
      booking_slug: string | null;
      booking_public_path: string | null;
    };

    return {
      booking_slug: row.booking_slug ?? null,
      booking_public_path: row.booking_public_path ?? row.booking_slug ?? null,
    };
  },
  { requireWorkspace: false },
);

/**
 * PATCH /api/booking/slug — set the user's public booking path (1–2 segments).
 *
 * Pushes the previous path into `previous_booking_paths` so old links keep
 * resolving. Internal `booking_slug` is unchanged (used by booking APIs).
 */
type PatchBody = { booking_public_path?: string; /** @deprecated */ booking_slug?: string };

export const PATCH = createApiHandler(
  async (req, ctx) => {
    if (!ctx.userId) throw Errors.unauthorized();

    const body = await parseBody<PatchBody>(req);
    const rawInput =
      typeof body.booking_public_path === "string"
        ? body.booking_public_path
        : typeof body.booking_slug === "string"
          ? body.booking_slug
          : "";

    const parsed = normalizeBookingPublicPath(rawInput);
    if (!parsed.ok) {
      throw Errors.validation({ booking_public_path: parsed.message });
    }
    const nextPath = parsed.path;

    const { data: current, error: currentErr } = await ctx.supabase
      .from("profiles")
      .select("booking_public_path, previous_booking_paths")
      .eq("id", ctx.userId)
      .single();
    if (currentErr) throw Errors.internal("Profil introuvable");

    const row = current as {
      booking_public_path: string | null;
      previous_booking_paths?: string[] | null;
    };

    if (row.booking_public_path === nextPath) {
      return { booking_public_path: nextPath };
    }

    const collides = await bookingPublicPathCollides(
      ctx.supabase,
      nextPath,
      ctx.userId,
    );
    if (collides) {
      throw Errors.validation({ booking_public_path: "Ce lien est déjà utilisé" });
    }

    const prev = (row.previous_booking_paths ?? []) as string[];
    const aliases = row.booking_public_path
      ? Array.from(new Set([...prev, row.booking_public_path])).filter(
          (p) => p !== nextPath,
        )
      : prev.filter((p) => p !== nextPath);

    const { error: updateErr } = await ctx.supabase
      .from("profiles")
      .update({
        booking_public_path: nextPath,
        previous_booking_paths: aliases,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.userId);
    if (updateErr) throw Errors.internal("Impossible de mettre à jour le lien");

    return { booking_public_path: nextPath };
  },
  { requireWorkspace: false },
);
