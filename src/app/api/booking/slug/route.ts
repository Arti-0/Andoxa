import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/booking/slug — booking_slug du profil connecté + org_slug pour
 * construire l'URL longue format /booking/<org>/<user>.
 *
 * Backwards-compatible response: clients reading only `booking_slug` keep
 * working; the new `org_slug` field is additive.
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    if (!ctx.userId) throw Errors.unauthorized();

    const { data: profile, error } = await ctx.supabase
      .from("profiles")
      .select("booking_slug, active_organization_id")
      .eq("id", ctx.userId)
      .single();

    if (error) throw Errors.internal("Profil introuvable");

    let orgSlug: string | null = null;
    if (profile?.active_organization_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orgRow } = await (ctx.supabase as any)
        .from("organizations")
        .select("slug")
        .eq("id", profile.active_organization_id)
        .maybeSingle();
      orgSlug = (orgRow?.slug as string | undefined) ?? null;
    }

    return {
      booking_slug: profile?.booking_slug ?? null,
      org_slug: orgSlug,
    };
  },
  { requireWorkspace: false }
);
