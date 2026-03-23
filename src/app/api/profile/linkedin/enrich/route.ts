import { createApiHandler, Errors } from "@/lib/api";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";

interface UnipileUserProfile {
  first_name?: string | null;
  last_name?: string | null;
  headline?: string | null;
  location?: string | null;
  profile_picture_url?: string | null;
  public_identifier?: string | null;
  websites?: string[] | null;
  work_experience?: Array<{ company?: string; position?: string }> | null;
  education?: unknown[];
  skills?: unknown[];
  summary?: string | null;
}

/**
 * POST /api/profile/linkedin/enrich
 * Fetch user's LinkedIn profile from Unipile and update profile.
 * Uses GET /users/me when linkedin_url is empty (connected via Unipile Hosted Auth).
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    const { data: profile, error: fetchError } = await ctx.supabase
      .from("profiles")
      .select("id, linkedin_url, full_name, avatar_url")
      .eq("id", ctx.userId)
      .single();

    if (fetchError || !profile) {
      throw Errors.notFound("Profil");
    }

    const accountId = await getAccountIdForUser(ctx);
    let linkedin_url = (profile as { linkedin_url?: string | null })
      .linkedin_url as string | null;
    const slug = extractLinkedInSlug(linkedin_url);

    let unipileProfile: UnipileUserProfile;
    try {
      if (slug) {
        unipileProfile = await unipileFetch<UnipileUserProfile>(
          `/users/${encodeURIComponent(slug)}?account_id=${accountId}&linkedin_sections=*`
        );
      } else {
        unipileProfile = await unipileFetch<UnipileUserProfile>(
          `/users/me?account_id=${accountId}&linkedin_sections=*`
        );
        const pubId = unipileProfile?.public_identifier;
        if (pubId) {
          linkedin_url = `https://www.linkedin.com/in/${pubId}`;
        }
      }
    } catch (err) {
      const msg =
        err instanceof UnipileApiError
          ? err.message
          : "Impossible de récupérer le profil LinkedIn. Connectez votre compte LinkedIn depuis la page Installation.";
      throw Errors.badRequest(msg);
    }

    const fullNameFromUnipile =
      unipileProfile.first_name && unipileProfile.last_name
        ? `${unipileProfile.first_name} ${unipileProfile.last_name}`.trim()
        : null;
    const avatarFromUnipile = unipileProfile.profile_picture_url ?? null;
    const currentFullName = (profile as { full_name?: string | null })
      .full_name;
    const currentAvatar = (profile as { avatar_url?: string | null }).avatar_url;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (!currentFullName?.trim() && fullNameFromUnipile) {
      updates.full_name = fullNameFromUnipile;
    }
    if (!currentAvatar?.trim() && avatarFromUnipile) {
      updates.avatar_url = avatarFromUnipile;
    }
    if (linkedin_url && !(profile as { linkedin_url?: string | null }).linkedin_url?.trim()) {
      updates.linkedin_url = linkedin_url;
    }

    if (Object.keys(updates).length > 1) {
      const { error: updateError } = await ctx.supabase
        .from("profiles")
        .update(updates)
        .eq("id", ctx.userId);
      if (updateError) {
        console.error("[profile/linkedin/enrich] update error:", updateError);
      }
    }

    return {
      enriched: unipileProfile,
      updated: Object.keys(updates).length > 1,
    };
  },
  { requireWorkspace: false }
);
