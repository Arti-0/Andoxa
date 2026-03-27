import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleLinkedInCallback } from "@/lib/auth/linkedin-auth-server";
import { logger } from "@/lib/utils/logger";
import type { OrgDashboardGateRow } from "@/lib/onboarding/dashboard-access";
import { personalSubscriptionAllowsDashboard } from "@/lib/onboarding/dashboard-access";

function getRedirectBase(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto === "https" ? "https" : "http"}://${forwardedHost}`;
  }

  const { origin } = new URL(request.url);
  return origin;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = getRedirectBase(request);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      logger.error("OAuth callback error:", { error, errorDescription });
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code) {
      logger.error("OAuth callback missing code");
      return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`);
    }

    const supabase = await createClient();

    const {
      data: { session },
      error: exchangeError,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !session) {
      logger.error("Failed to exchange code for session:", exchangeError);
      return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_failed`);
    }

    try {
      await handleLinkedInCallback(session, supabase);
    } catch (profileError) {
      logger.error("Failed to handle LinkedIn callback:", profileError);
    }

    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("id, active_organization_id")
      .eq("id", session.user.id)
      .maybeSingle();

    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan_id, status")
      .eq("user_id", session.user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    let orgForEntitlement: OrgDashboardGateRow | null = null;

    if (updatedProfile?.active_organization_id) {
      const { data: organization } = await supabase
        .from("organizations")
        .select("status, subscription_status, deleted_at, trial_ends_at")
        .eq("id", updatedProfile.active_organization_id)
        .maybeSingle();
      if (organization) {
        orgForEntitlement = organization as OrgDashboardGateRow;
      }
    }

    const landOnDashboard =
      personalSubscriptionAllowsDashboard(subscription) ||
      orgForEntitlement?.status === "active";

    const nextParam = searchParams.get("next");
    let next: string;
    if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
      const dashboardish =
        nextParam === "/dashboard" || nextParam.startsWith("/dashboard/");
      next = dashboardish && !landOnDashboard ? "/onboarding" : nextParam;
    } else if (landOnDashboard) {
      next = "/dashboard";
    } else {
      next = "/onboarding";
    }

    return NextResponse.redirect(`${baseUrl}${next}`);
  } catch (error) {
    logger.error("Callback route error:", error);
    const fallbackBase = getRedirectBase(request);
    return NextResponse.redirect(`${fallbackBase}/auth/login?error=callback_error`);
  }
}
