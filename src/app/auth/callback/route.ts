import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { evaluateDashboardEntitlement } from "@/lib/auth/dashboard-entitlement";
import type { OrgDashboardGateRow } from "@/lib/auth/dashboard-entitlement";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

type CookieOptions = Parameters<NextResponse["cookies"]["set"]>[2];

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

/** Preserve Supabase auth Set-Cookie headers when changing the redirect target. */
function redirectPreservingSessionCookies(
  from: NextResponse,
  path: string,
  base: string
): NextResponse {
  const dest = new URL(path, base);
  const out = NextResponse.redirect(dest);
  const multi = from.headers.getSetCookie();
  if (multi.length > 0) {
    for (const line of multi) {
      out.headers.append("Set-Cookie", line);
    }
  } else {
    for (const c of from.cookies.getAll()) {
      out.cookies.set(c.name, c.value, { path: "/" });
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const baseUrl = getRedirectBase(request);
  const { searchParams } = new URL(request.url);
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

  let redirectPath = "/onboarding";
  let response = NextResponse.redirect(new URL(redirectPath, baseUrl));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.redirect(new URL(redirectPath, baseUrl));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !session) {
    logger.error("Failed to exchange code for session:", exchangeError);
    return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_failed`);
  }

  const userId = session.user.id;

  const { data: updatedProfile } = await supabase
    .from("profiles")
    .select("id, active_organization_id")
    .eq("id", userId)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
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

  const { allowedForDashboard } = evaluateDashboardEntitlement({
    org: orgForEntitlement,
    personalSub: subscription,
  });

  const nextParam = searchParams.get("next");
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    const normalizedNext = nextParam.replace(
      /^\/onboarding\/(setup|join)(?=[/?#]|$)/,
      "/onboarding"
    );
    const dashboardish =
      normalizedNext === "/dashboard" ||
      normalizedNext.startsWith("/dashboard/");
    redirectPath =
      dashboardish && !allowedForDashboard ? "/onboarding" : normalizedNext;
  } else if (allowedForDashboard) {
    redirectPath = "/dashboard";
  } else {
    redirectPath = "/onboarding";
  }

  return redirectPreservingSessionCookies(response, redirectPath, baseUrl);
}
