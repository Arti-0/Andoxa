import type { SupabaseClient } from "@supabase/supabase-js";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type { Database } from "@/lib/types/supabase";

type LinkedInProfileRelationFields = {
  provider_id?: string;
  is_relationship?: boolean;
};

/**
 * Resolves LinkedIn provider_id via Unipile profile, checks `linkedin_relations`,
 * and if Unipile reports `is_relationship` but the row is missing, upserts it.
 * Used at import, invite, workflow, and messagerie context — one profile GET per call.
 */
export async function ensureLinkedInRelationFromUnipileProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  unipileAccountId: string,
  linkedinPublicIdentifier: string
): Promise<{ providerId: string | null; isFirstDegree: boolean }> {
  let prof: LinkedInProfileRelationFields;
  try {
    prof = await unipileFetch<LinkedInProfileRelationFields>(
      `/users/${encodeURIComponent(linkedinPublicIdentifier)}?account_id=${encodeURIComponent(unipileAccountId)}`
    );
  } catch (e) {
    if (e instanceof UnipileApiError) {
      return { providerId: null, isFirstDegree: false };
    }
    throw e;
  }

  const providerId = prof?.provider_id?.trim() ?? null;
  if (!providerId) {
    return { providerId: null, isFirstDegree: false };
  }

  const { data: existing } = await supabase
    .from("linkedin_relations")
    .select("id")
    .eq("user_id", userId)
    .eq("attendee_id", providerId)
    .maybeSingle();

  if (existing) {
    return { providerId, isFirstDegree: true };
  }

  if (prof.is_relationship !== true) {
    return { providerId, isFirstDegree: false };
  }

  const { error } = await supabase.from("linkedin_relations").upsert(
    [
      {
        user_id: userId,
        attendee_id: providerId,
        connected_at: new Date().toISOString(),
      },
    ],
    { onConflict: "user_id,attendee_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("[LinkedIn] ensure relation from profile upsert:", error);
  }

  return { providerId, isFirstDegree: true };
}
