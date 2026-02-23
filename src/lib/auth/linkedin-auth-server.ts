import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type { Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

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

  // If session is provided, use it. Otherwise, verify user and get session
  let userSession = session;
  
  if (!userSession) {
    // Verify user first (secure way)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.error('Failed to get user after LinkedIn callback:', userError);
      throw new Error('Failed to authenticate with LinkedIn');
    }
    
    // Get session to access provider tokens
    const { data: { session: fetchedSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !fetchedSession) {
      logger.error('Failed to get session after LinkedIn callback:', sessionError);
      throw new Error('Failed to authenticate with LinkedIn');
    }
    
    userSession = fetchedSession;
  }
  
  const user = userSession.user;
  
  // Get LinkedIn profile data from the user metadata
  // Supabase automatically populates user_metadata with provider data
  const linkedinData = user.user_metadata;
  const linkedinId = linkedinData?.sub || linkedinData?.linkedin_id;
  const linkedinUrl = linkedinData?.profile_url || linkedinData?.linkedin_url;
  
  // Get provider token if available (for future use with LinkedIn API)
  const providerToken = userSession.provider_token;
  const providerRefreshToken = userSession.provider_refresh_token;
  
  // Create or update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: linkedinData?.name || linkedinData?.full_name || user.user_metadata?.full_name,
      avatar_url: linkedinData?.picture || linkedinData?.avatar_url || user.user_metadata?.avatar_url,
      linkedin_id: linkedinId,
      linkedin_url: linkedinUrl,
      // Store tokens (in production, these should be encrypted)
      linkedin_access_token_encrypted: providerToken || null,
      linkedin_refresh_token_encrypted: providerRefreshToken || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });
  
  if (profileError) {
    logger.error('Failed to create/update profile:', profileError);
    // Don't throw - session is still valid, profile update can be retried
  }
  
  return userSession;
}

