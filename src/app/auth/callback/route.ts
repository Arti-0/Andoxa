import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleLinkedInCallback } from '@/lib/auth/linkedin-auth-server';
import { logger } from '@/lib/utils/logger';
import { reconcilePendingInvitationForUser } from '@/lib/invitations/reconcile-invitation';

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

    if (error) {
      logger.error('OAuth callback error:', { error, errorDescription });
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code) {
      logger.error('OAuth callback missing code');
      return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`);
    }

    const supabase = await createClient();

    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !session) {
      logger.error('Failed to exchange code for session:', exchangeError);
      return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_failed`);
    }

    try {
      await handleLinkedInCallback(session, supabase);
    } catch (profileError) {
      logger.error('Failed to handle LinkedIn callback:', profileError);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, active_organization_id, linkedin_url')
      .eq('id', session.user.id)
      .maybeSingle();

    // Pending invitations: always reconcile (normalized email/LinkedIn).
    // Fixes users who already have a personal pending org — they still join the invited org.
    await reconcilePendingInvitationForUser(supabase, session.user.id, {
      userEmail: session.user.email,
      profileLinkedInUrl: profile?.linkedin_url,
    });

    // Re-fetch profile after potential invitation join
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('id, active_organization_id')
      .eq('id', session.user.id)
      .maybeSingle();

    let hasActivePlan = false;

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan_id, status')
      .eq('user_id', session.user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
      hasActivePlan = true;
    }

    if (updatedProfile?.active_organization_id && !hasActivePlan) {
      const { data: organization } = await supabase
        .from('organizations')
        .select('plan, subscription_status')
        .eq('id', updatedProfile.active_organization_id)
        .maybeSingle();

      const validPlans = ['essential', 'pro', 'business'];
      if (organization?.plan && validPlans.includes(organization.plan) && organization.subscription_status !== 'canceled') {
        hasActivePlan = true;
      }
    }

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
