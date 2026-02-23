import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Route Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/auth",
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
];

const ONBOARDING_ROUTES = ["/onboarding"];

const CHECKOUT_ROUTES = ["/checkout"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const isMatchingRoute = (pathname: string, routes: string[]) =>
  routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

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

// ─────────────────────────────────────────────────────────────────────────────
// Proxy Logic - MINIMALIST: Only Auth Check + Session Refresh
// ─────────────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // 1. Skip checks for public routes
  if (isMatchingRoute(pathname, PUBLIC_ROUTES)) {
    return response;
  }

  // 2. Initialize Supabase client for session refresh
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

  // 3. Refresh session (IMPORTANT: prevents random logouts)
  // Do not run code between createServerClient and getClaims()
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // 4. Check authentication
  // Allow onboarding and checkout routes for authenticated users (they handle their own logic)
  if (!user) {
    // Not authenticated - redirect to login (except public routes already handled)
    const loginUrl = createRedirectUrl("/auth/login", request);
    loginUrl.searchParams.set("next", pathname); // Return to current page after login
    return NextResponse.redirect(loginUrl);
  }

  // 5. User is authenticated - allow access
  // NO BUSINESS LOGIC HERE - no org checks, no plan checks, no status checks
  // All that logic is handled in Guard Layouts (app/(protected)/layout.tsx, etc.)

  // IMPORTANT: Return the response object as-is to preserve cookies
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|assets|robots.txt|sitemap.xml).*)",
  ],
};
