import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Route Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Marketing, auth, checkout: no session required. Onboarding is auth-only (handled below). */
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/auth/login",
  "/login",
  "/pricing",
  "/about",
  "/help",
  "/privacy",
  "/terms",
  "/cgv",
  "/security",
  "/changelog",
  "/contact",
  "/booking",
  "/unsubscribe",
  "/checkout",
  "/success",
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const isMatchingRoute = (pathname: string, routes: string[]) =>
  routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

function isOnboardingPath(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

function isAllowedOnboardingRoute(pathname: string) {
  return (
    pathname === "/onboarding" ||
    pathname === "/onboarding/new" ||
    pathname === "/onboarding/join" ||
    pathname === "/onboarding/plan"
  );
}

/**
 * Builds redirect URL, avoiding localhost in production when behind a proxy.
 * Uses NEXT_PUBLIC_APP_URL in production when available.
 */
function createRedirectUrl(path: string, request: NextRequest): URL {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (request.headers.get("x-forwarded-host")
      ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host")}`
      : request.url);
  const url = new URL(path, base);
  if (process.env.NODE_ENV === "development") {
    url.protocol = "http:";
  }
  return url;
}

type OrgRow = {
  id: string;
  status: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  deleted_at: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

function isProtectedAssetPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes(".")
  );
}

function allowsDashboardAccess(org: OrgRow | null) {
  if (!org) return false;
  if (org.status !== "active") return false;

  if (org.subscription_status == null) return false;
  return ACTIVE_SUBSCRIPTION_STATUSES.has(org.subscription_status);
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy — single place for session refresh + navigation gates (before route handlers)
// ─────────────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (
    isMatchingRoute(pathname, PUBLIC_ROUTES) ||
    pathname.startsWith("/api/webhooks") ||
    isProtectedAssetPath(pathname)
  ) {
    return response;
  }

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
          cookiesToSet: Array<{ name: string; value: string; options?: any }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = createRedirectUrl("/auth/login", request);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  let activeOrganizationId = profile?.active_organization_id ?? null;
  let organization: OrgRow | null = null;

  // Self-heal profiles.active_organization_id if the user is already a member.
  if (!activeOrganizationId) {
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    const fallbackOrgId = memberships?.[0]?.organization_id ?? null;
    if (fallbackOrgId) {
      activeOrganizationId = fallbackOrgId;
      await supabase
        .from("profiles")
        .update({
          active_organization_id: fallbackOrgId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  }

  if (activeOrganizationId) {
    const { data: memberForActiveOrg } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("organization_id", activeOrganizationId)
      .maybeSingle();

    // If the active org points to a non-member org, pivot to any real membership.
    if (!memberForActiveOrg) {
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);

      const fallbackOrgId = memberships?.[0]?.organization_id ?? null;
      if (fallbackOrgId) {
        activeOrganizationId = fallbackOrgId;
        await supabase
          .from("profiles")
          .update({
            active_organization_id: fallbackOrgId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } else {
        activeOrganizationId = null;
      }
    }
  }

  if (activeOrganizationId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id, status, subscription_status, trial_ends_at, deleted_at")
      .eq("id", activeOrganizationId)
      .maybeSingle();
    organization = org as OrgRow | null;
  }

  const hasActiveOrg = allowsDashboardAccess(organization);

  if (isOnboardingPath(pathname)) {
    if (!isAllowedOnboardingRoute(pathname)) {
      return NextResponse.redirect(createRedirectUrl("/onboarding/new", request));
    }
    // Active users don't need onboarding anymore.
    if (hasActiveOrg) {
      return NextResponse.redirect(createRedirectUrl("/dashboard", request));
    }
    return response;
  }

  // Non-onboarding routes require an active paid organization membership.
  if (!hasActiveOrg) {
    return NextResponse.redirect(createRedirectUrl("/onboarding", request));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|assets|robots.txt|sitemap.xml).*)",
  ],
};
