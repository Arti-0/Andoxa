import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";

interface UnipileUserProfile {
  first_name?: string | null;
  last_name?: string | null;
  headline?: string | null;
  location?: string | null;
  profile_picture_url?: string | null;
  websites?: string[] | null;
  work_experience?: Array<{ company?: string; position?: string }> | null;
  education?: unknown[];
  skills?: unknown[];
  summary?: string | null;
}

/**
 * POST /api/prospects/[id]/enrich
 * Enrich prospect from Unipile LinkedIn profile (GET /users/{identifier}?linkedin_sections=*)
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const id = segments[segments.length - 2];

  if (!id || id === "enrich") {
    throw Errors.notFound("Prospect");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data: prospect, error: fetchError } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, company, job_title, location, website, linkedin")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (fetchError || !prospect) {
    throw Errors.notFound("Prospect");
  }

  if (!prospect.linkedin?.trim()) {
    throw Errors.badRequest(
      "Ce prospect n'a pas d'URL LinkedIn. L'enrichissement nécessite un profil LinkedIn."
    );
  }

  const slug = extractLinkedInSlug(prospect.linkedin);
  if (!slug) {
    throw Errors.badRequest("URL LinkedIn invalide");
  }

  const accountId = await getAccountIdForUser(ctx);

  let profile: UnipileUserProfile;
  try {
    profile = await unipileFetch<UnipileUserProfile>(
      `/users/${encodeURIComponent(slug)}?account_id=${accountId}&linkedin_sections=*`
    );
  } catch (err) {
    const msg =
      err instanceof UnipileApiError
        ? err.message
        : "Impossible de récupérer le profil LinkedIn";
    throw Errors.badRequest(msg);
  }

  const work0 = profile.work_experience?.[0];
  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : prospect.full_name;

  const updatePayload = {
    full_name: fullName || prospect.full_name,
    job_title: profile.headline || work0?.position || prospect.job_title,
    company: work0?.company || prospect.company,
    location: profile.location || prospect.location,
    website: profile.websites?.[0] || prospect.website,
    enrichment_source: "unipile",
    enriched_at: new Date().toISOString(),
    enrichment_metadata: JSON.parse(
      JSON.stringify({
        profile_picture_url: profile.profile_picture_url,
        work_experience: profile.work_experience,
        education: profile.education,
        skills: profile.skills,
        summary: profile.summary,
      })
    ),
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await ctx.supabase
    .from("prospects")
    .update(updatePayload)
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (updateError) {
    throw Errors.internal("Impossible de mettre à jour le prospect");
  }

  return updated;
});
