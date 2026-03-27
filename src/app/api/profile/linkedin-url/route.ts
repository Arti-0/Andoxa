import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { normalizeInvitationLinkedInUrl } from "@/lib/invitations/normalize";

/**
 * POST /api/profile/linkedin-url
 * Persist public LinkedIn profile URL (OIDC does not provide it).
 */
export const POST = createApiHandler(
  async (req: NextRequest, ctx) => {
    const body = await parseBody<{ linkedin_url?: string }>(req);
    const raw = body.linkedin_url?.trim();
    if (!raw) {
      throw Errors.badRequest("linkedin_url is required");
    }

    const normalized = normalizeInvitationLinkedInUrl(raw);
    const lower = normalized.toLowerCase();
    if (!lower.includes("linkedin.com") || !lower.includes("/in/")) {
      throw Errors.badRequest(
        "URL de profil LinkedIn invalide (attendu : …/in/votre-identifiant)"
      );
    }

    const { error: upErr } = await ctx.supabase.from("profiles").upsert(
      {
        id: ctx.userId,
        linkedin_url: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upErr) {
      throw Errors.internal("Impossible d’enregistrer le profil LinkedIn");
    }

    return {
      linkedin_url: normalized,
    };
  },
  { requireWorkspace: false }
);
