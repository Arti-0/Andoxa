import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";

export interface UnipileUserProfile {
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
  contact_info?: {
    emails?: string[] | null;
    phones?: string[] | null;
    adresses?: string[] | null;
    socials?: Array<{ type?: string; name?: string }> | null;
  } | null;
}

export type EnrichProspectResult =
  | { ok: true }
  | { ok: false; error: string; retryable: boolean };

/**
 * Fetches LinkedIn profile via Unipile and updates the prospect row.
 * Used by POST /api/prospects/[id]/enrich and the enrichment_jobs worker.
 */
export async function enrichProspectFromUnipile(params: {
  supabase: SupabaseClient<Database>;
  organizationId: string;
  prospectId: string;
  accountId: string;
}): Promise<EnrichProspectResult> {
  const { supabase, organizationId, prospectId, accountId } = params;

  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("id, full_name, company, job_title, location, website, linkedin, email, phone")
    .eq("id", prospectId)
    .eq("organization_id", organizationId)
    .single();

  if (fetchError || !prospect) {
    return { ok: false, error: "Prospect introuvable", retryable: false };
  }

  if (!prospect.linkedin?.trim()) {
    return { ok: false, error: "Pas d'URL LinkedIn", retryable: false };
  }

  const slug = extractLinkedInSlug(prospect.linkedin);
  if (!slug) {
    return { ok: false, error: "URL LinkedIn invalide", retryable: false };
  }

  let profile: UnipileUserProfile;
  try {
    profile = await unipileFetch<UnipileUserProfile>(
      `/users/${encodeURIComponent(slug)}?account_id=${accountId}&linkedin_sections=*`
    );
  } catch (err) {
    const msg =
      err instanceof UnipileApiError ? err.message : "Erreur Unipile";
    const code = err instanceof UnipileApiError ? err.status : 0;
    const retryable = code === 429 || (code >= 500 && code < 600) || code === 0;
    return { ok: false, error: msg, retryable };
  }

  const work0 = profile.work_experience?.[0];
  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : prospect.full_name;

  const contactEmail =
    profile.contact_info?.emails?.[0]?.trim() || null;
  const contactPhone =
    profile.contact_info?.phones?.[0]?.trim() || null;

  const updatePayload = {
    full_name: fullName || prospect.full_name,
    job_title: profile.headline || work0?.position || prospect.job_title,
    company: work0?.company || prospect.company,
    location: profile.location || prospect.location,
    website: profile.websites?.[0] || prospect.website,

    ...(contactEmail && !prospect.email?.trim()
      ? { email: contactEmail.toLowerCase() }
      : {}),

    ...(contactPhone && !prospect.phone?.trim()
      ? { phone: contactPhone }
      : {}),

    enrichment_source: "unipile",
    enriched_at: new Date().toISOString(),
    enrichment_metadata: JSON.parse(
      JSON.stringify({
        profile_picture_url: profile.profile_picture_url,
        work_experience: profile.work_experience,
        education: profile.education,
        skills: profile.skills,
        summary: profile.summary,
        contact_info: profile.contact_info,
      })
    ),
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("prospects")
    .update(updatePayload)
    .eq("id", prospectId)
    .eq("organization_id", organizationId);

  if (updateError) {
    return { ok: false, error: updateError.message, retryable: true };
  }

  return { ok: true };
}
