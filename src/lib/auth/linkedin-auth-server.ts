import { createClient } from "@/lib/supabase/server";
import {
  extractLinkedInProfileUrlFromMetadata,
  extractLinkedInSubFromMetadata,
} from "@/lib/auth/linkedin-metadata";
import { normalizeInvitationLinkedInUrl } from "@/lib/invitations/normalize";
import { logger } from "@/lib/utils/logger";
import type { Session } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Handle LinkedIn OAuth callback
 * Called after user returns from LinkedIn authentication
 * Creates or updates user profile with LinkedIn data
 * SERVER-SIDE ONLY - Use this in server components/route handlers
 *
 * IMPORTANT: Pass the supabase client that performed exchangeCodeForSession so it has the new session.
 * A fresh createClient() may not yet see the session cookies in the same request.
 *
 * @param session - The session from exchangeCodeForSession (required when supabaseClient provided)
 * @param supabaseClient - Optional. Use the client from the callback route that has the new session.
 */
export async function handleLinkedInCallback(
  session?: Session,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient ?? (await createClient());

  let userSession = session;

  if (!userSession) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Failed to get user after LinkedIn callback:", userError);
      throw new Error("Failed to authenticate with LinkedIn");
    }

    const {
      data: { session: fetchedSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !fetchedSession) {
      logger.error("Failed to get session after LinkedIn callback:", sessionError);
      throw new Error("Failed to authenticate with LinkedIn");
    }

    userSession = fetchedSession;
  }

  const user = userSession.user;
  const linkedinData = user.user_metadata as Record<string, unknown> | undefined;

  const rawUrlFromMeta = extractLinkedInProfileUrlFromMetadata(linkedinData);
  const linkedinIdFromMeta = extractLinkedInSubFromMetadata(linkedinData);

  const normalizedFromMeta = rawUrlFromMeta
    ? normalizeInvitationLinkedInUrl(rawUrlFromMeta)
    : null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("linkedin_url, linkedin_id")
    .eq("id", user.id)
    .maybeSingle();

  const existingRow = existing as {
    linkedin_url: string | null;
    linkedin_id: string | null;
  } | null;

  const fromMetaLooksLinkedIn =
    !!normalizedFromMeta &&
    normalizedFromMeta.toLowerCase().includes("linkedin.com");
  const linkedinUrl =
    (fromMetaLooksLinkedIn ? normalizedFromMeta : null) ??
    (existingRow?.linkedin_url?.trim()
      ? normalizeInvitationLinkedInUrl(existingRow.linkedin_url)
      : null);

  const linkedinId =
    (linkedinIdFromMeta && linkedinIdFromMeta.length > 0
      ? linkedinIdFromMeta
      : null) ?? existingRow?.linkedin_id ?? null;

  const providerToken = userSession.provider_token;
  const providerRefreshToken = userSession.provider_refresh_token;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name:
        (linkedinData?.name as string | undefined) ||
        (linkedinData?.full_name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined),
      avatar_url:
        (linkedinData?.picture as string | undefined) ||
        (linkedinData?.avatar_url as string | undefined) ||
        (user.user_metadata?.avatar_url as string | undefined),
      linkedin_id: linkedinId,
      linkedin_url: linkedinUrl,
      linkedin_access_token_encrypted: providerToken || null,
      linkedin_refresh_token_encrypted: providerRefreshToken || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) {
    logger.error("Failed to create/update profile:", profileError);
  }

  return userSession;
}
