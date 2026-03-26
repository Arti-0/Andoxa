import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleLinkedInCallback } from '@/lib/auth/linkedin-auth-server';
import { extractLinkedInProfileUrlFromMetadata } from '@/lib/auth/linkedin-metadata';
import { logger } from '@/lib/utils/logger';
import { reconcilePendingInvitationForUser } from '@/lib/invitations/reconcile-invitation';
import { canUserAccessDashboardForOrg } from '@/lib/onboarding/dashboard-access';

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

    const meta = session.user.user_metadata as Record<string, unknown> | undefined;
    const linkedinUrlHint = extractLinkedInProfileUrlFromMetadata(meta);

    // Pending invitations: reconcile via LinkedIn URL (RPC).
    // Fixes users who already have a personal pending org — they still join the invited org.
    await reconcilePendingInvitationForUser(supabase, session.user.id, {
      profileLinkedInUrl: profile?.linkedin_url,
      linkedinUrlHint,
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

    const canDashboard =
      !!updatedProfile?.active_organization_id &&
      (await canUserAccessDashboardForOrg(
        supabase,
        session.user.id,
        updatedProfile.active_organization_id
      ));

    const nextParam = searchParams.get('next');
    let next: string;
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      const dashboardish =
        nextParam === '/dashboard' || nextParam.startsWith('/dashboard/');
      next =
        dashboardish && !canDashboard ? '/onboarding/plan' : nextParam;
    } else if (canDashboard || hasActivePlan) {
      next = '/dashboard';
    } else {
      next = '/onboarding/plan';
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
