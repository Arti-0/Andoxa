import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleLinkedInCallback } from '@/lib/auth/linkedin-auth-server';
import { logger } from '@/lib/utils/logger';

/**
 * Gets the canonical base URL for redirects.
 * In production: prefers NEXT_PUBLIC_APP_URL, then x-forwarded-* headers, then request URL.
 * Avoids redirecting to localhost when deployed behind a proxy (e.g. Vercel).
 */
function getRedirectBase(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) return `${forwardedProto === "https" ? "https" : "http"}://${forwardedHost}`;

  const { origin } = new URL(request.url);
  return origin;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = getRedirectBase(request);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      logger.error('OAuth callback error:', { error, errorDescription });
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Check for authorization code
    if (!code) {
      logger.error('OAuth callback missing code');
      return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`);
    }

    const supabase = await createClient();

    // Exchange code for session
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !session) {
      logger.error('Failed to exchange code for session:', exchangeError);
      return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_failed`);
    }

    // Handle LinkedIn callback to create/update profile
    // Pass the session directly to avoid using getSession() which is insecure
    try {
      await handleLinkedInCallback(session);
    } catch (profileError) {
      logger.error('Failed to handle LinkedIn callback:', profileError);
      // Continue anyway - session is valid, profile can be updated later
    }

    // Check profile status to determine redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, active_organization_id')
      .eq('id', session.user.id)
      .maybeSingle();

    // Check if user has an active plan
    let hasActivePlan = false;

    // Check user subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan_id, status')
      .eq('user_id', session.user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
      hasActivePlan = true;
    }

    // Check organization plan if user has an organization
    if (profile?.active_organization_id && !hasActivePlan) {
      const { data: organization } = await supabase
        .from('organizations')
        .select('plan, subscription_status')
        .eq('id', profile.active_organization_id)
        .maybeSingle();

      const validPlans = ['essential', 'pro', 'business'];
      if (organization?.plan && validPlans.includes(organization.plan) && organization.subscription_status !== 'canceled') {
        hasActivePlan = true;
      }
    }

    // Determine redirect URL
    let next: string;

    const nextParam = searchParams.get('next');
    if (nextParam && nextParam.startsWith('/')) {
      next = nextParam;
    } else if (!hasActivePlan) {
      next = '/onboarding/plan';
    } else {
      next = '/dashboard';
    }

    return NextResponse.redirect(`${baseUrl}${next}`);
  } catch (error) {
    logger.error('Callback route error:', error);
    const fallbackBase = getRedirectBase(request);
    return NextResponse.redirect(
      `${fallbackBase}/auth/login?error=callback_error`
    );
  }
}

