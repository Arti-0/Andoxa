import { createApiHandler, Errors } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/extension/token
 * Retourne le access_token Supabase de la session navigateur pour l’extension
 * (Authorization: Bearer sur les routes /api/*).
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    if (!ctx.userId) throw Errors.unauthorized();

    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw Errors.unauthorized();
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, active_organization_id, avatar_url")
      .eq("id", ctx.userId)
      .single();

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? null;
    const expiresIn =
      expiresAt != null ? Math.max(0, expiresAt - nowSec) : null;

    return {
      token: session.access_token,
      expires_at: expiresAt,
      expires_in: expiresIn,
      user: {
        id: ctx.userId,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        org_id: profile?.active_organization_id ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    };
  },
  { requireWorkspace: false }
);
