import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

function oauthBaseUrl(): string {
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const isProd = process.env.NODE_ENV === "production";
  return (
    isProd && envAppUrl
      ? envAppUrl.replace(/\/$/, "")
      : typeof window !== "undefined"
        ? window.location.origin
        : ""
  ).replace(/\/$/, "");
}

/**
 * Link LinkedIn (OIDC) to the current session — use during onboarding, not `signInWithOAuth`.
 * Redirect returns through `/auth/callback` then `next` (e.g. setup step 3).
 */
export async function linkLinkedInFromOnboarding(
  nextPath = "/onboarding?step=7&linked=1"
) {
  const supabase = createClient();
  const baseUrl = oauthBaseUrl();
  const next = encodeURIComponent(nextPath.startsWith("/") ? nextPath : `/${nextPath}`);
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "linkedin_oidc",
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${next}`,
      scopes: "openid profile email",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    logger.error("LinkedIn linkIdentity error:", error);
    throw error;
  }

  return data;
}

/**
 * Sign in with LinkedIn OAuth (OIDC)
 * Redirects user to LinkedIn for authentication
 * CLIENT-SIDE ONLY - Use this in client components
 */
export async function signInWithLinkedIn() {
  const supabase = createClient();
  const baseUrl = oauthBaseUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
      scopes: "openid profile email",
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

