import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/booking/slug — booking_slug du profil connecté (lecture seule).
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    if (!ctx.userId) throw Errors.unauthorized();

    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("booking_slug")
      .eq("id", ctx.userId)
      .single();

    if (error) throw Errors.internal("Profil introuvable");

    return { booking_slug: data?.booking_slug ?? null };
  },
  { requireWorkspace: false }
);
