import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

/**
 * Sign in with LinkedIn OAuth (OIDC)
 * Redirects user to LinkedIn for authentication
 * CLIENT-SIDE ONLY - Use this in client components
 */
export async function signInWithLinkedIn() {
  const supabase = createClient();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: `${baseUrl.replace(/\/$/, "")}/auth/callback`,
      scopes: 'openid profile email',
    },
  });

  if (error) {
    logger.error('LinkedIn OAuth error:', error);
    throw error;
  }

  return data;
}

/**
 * Sign out from LinkedIn
 * CLIENT-SIDE ONLY - Use this in client components
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error('Sign out error:', error);
    throw error;
  }
}

