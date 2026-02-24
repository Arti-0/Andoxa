import { createApiHandler, Errors } from "@/lib/api";
import { unipileFetch } from "@/lib/unipile/client";
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
 * GET /api/profile/linkedin
 * Returns the current user's LinkedIn profile info.
 * Sources (in order):
 * 1. profiles.linkedin_url (from LinkedIn OAuth login)
 * 2. Unipile GET /users/me (when user has connected via Hosted Auth)
 * When Unipile returns a profile, we persist linkedin_url to profiles for next time.
 */
export const GET = createApiHandler(
  async (req, ctx) => {
    const { data: profile, error } = await ctx.supabase
      .from("profiles")
      .select("linkedin_url, full_name, avatar_url")
      .eq("id", ctx.userId)
      .single();

    if (error || !profile) {
      throw Errors.notFound("Profil");
    }

    let linkedin_url = (profile as { linkedin_url?: string | null })
      .linkedin_url as string | null;
    let slug = extractLinkedInSlug(linkedin_url);
    let enriched: UnipileUserProfile | null = null;

    try {
      const accountId = await getAccountIdForUser(ctx);

      if (slug && accountId) {
        enriched = await unipileFetch<UnipileUserProfile>(
          `/users/${encodeURIComponent(slug)}?account_id=${accountId}&linkedin_sections=*`
        );
      } else if (accountId) {
        // linkedin_url not in profile: fetch from Unipile /users/me (connected account owner)
        enriched = await unipileFetch<UnipileUserProfile>(
          `/users/me?account_id=${accountId}&linkedin_sections=*`
        );
        const pubId = enriched?.public_identifier;
        if (pubId) {
          linkedin_url = `https://www.linkedin.com/in/${pubId}`;
          slug = pubId;
          // Persist to profiles so we don't need to call Unipile every time
          await ctx.supabase
            .from("profiles")
            .update({
              linkedin_url,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ctx.userId);
        }
      }
    } catch {
      // Unipile not connected or fetch failed – enriched stays null
    }

    return {
      linkedin_url: linkedin_url ?? null,
      full_name: (profile as { full_name?: string | null }).full_name ?? null,
      avatar_url: (profile as { avatar_url?: string | null }).avatar_url ?? null,
      enriched,
    };
  },
  { requireWorkspace: false }
);
