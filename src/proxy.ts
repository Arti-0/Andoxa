import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import {
    evaluateDashboardEntitlement,
    shouldRedirectToOrgInactivePage,
    type OrgDashboardGateRow,
} from '@/lib/auth/dashboard-entitlement';
import { resolveAppOrigin } from '@/lib/config/app-url';
import { getCachedOrg, resolveActiveOrgId } from '@/lib/workspace/cached-context';

type ResponseCookieOptions = Parameters<
    ReturnType<typeof NextResponse.next>['cookies']['set']
>[2];

// ─────────────────────────────────────────────────────────────────────────────
// Route Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marketing, auth, checkout: no session required. Onboarding is auth-only (handled below).
 */
const PUBLIC_ROUTES = [
    '/',
    '/extension',
    '/auth',
    '/auth/login',
    '/auth/invite',
    
    '/pricing',
    '/comparatif',
    '/resources',
    // /about page was removed in the site redesign; kept here so the dead route
    // returns a clean 404 instead of redirecting anonymous visitors to login.
    '/about',
    '/help',
    '/privacy',
    '/mentions-legales',
    '/cgu',
    '/cgv',
    '/security',
    '/changelog',
    '/contact',
    '/booking',
    '/unsubscribe',
    '/checkout',
    '/event',
    // Backend-free preview of the redesigned onboarding (see app/onboarding-preview).
    '/onboarding-preview',
];

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks (no Supabase session — must never run auth gates)
// ─────────────────────────────────────────────────────────────────────────────
// Stripe: POST /api/paiements/webhook (signing secret). Unipile: /api/webhooks/unipile.
// API routes are matched separately (see `config.matcher`) so we can answer OPTIONS
// (CORS preflight) for the browser extension without running auth gates.

const API_CORS_PREFLIGHT = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods':
        'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers':
        'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '86400',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const isMatchingRoute = (pathname: string, routes: string[]) =>
    routes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

function isOnboardingPath(pathname: string) {
    return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
}

/**
 * Builds redirect URL, avoiding localhost in production when behind a proxy.
 * Uses NEXT_PUBLIC_APP_URL in production when available.
 */
function createRedirectUrl(path: string, request: NextRequest): URL {
    return new URL(path, resolveAppOrigin(request));
}

function isProtectedAssetPath(pathname: string) {
    return (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/assets') ||
        pathname === '/favicon.ico' ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml' ||
        pathname.includes('.')
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy — single place for session refresh + navigation gates (before route handlers)
// ─────────────────────────────────────────────────────────────────────────────

// andoxa-perf-2b: getClaims + JWT-resolved active org + cached org context. 2026-06-06
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const proxyStart = performance.now();

    if (pathname.startsWith('/api/')) {
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 204,
                headers: API_CORS_PREFLIGHT,
            });
        }
        return NextResponse.next({ request });
    }

    let response = NextResponse.next({ request });

    if (
        isMatchingRoute(pathname, PUBLIC_ROUTES) ||
        pathname.startsWith('/api/webhooks') ||
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
                    cookiesToSet: Array<{
                        name: string;
                        value: string;
                        options?: ResponseCookieOptions;
                    }>
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

    // getClaims() verifies the JWT locally against the project's asymmetric
    // signing keys (ES256) — no Auth-server round-trip, unlike getUser(). Token
    // refresh is still handled by the supabase-ssr client via the cookie
    // getAll/setAll wiring above, so sessions are kept fresh.
    const { data: claimsData } = await supabase.auth.getClaims();
    const afterAuth = performance.now();
    const claims = claimsData?.claims ?? null;
    const userId = claims?.sub ?? null;
    if (!userId) {
        const loginUrl = createRedirectUrl('/auth/login', request);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Post-checkout wait page: allow authenticated users without full dashboard entitlement
    if (pathname === '/success') {
        return response;
    }

    const db = supabase as unknown as SupabaseClient<Database>;

    // Active org from the JWT app_metadata claim (fresh after a workspace switch),
    // falling back to a profiles lookup. The org row itself is served from the
    // shared short-TTL cache, keyed by org id.
    const activeOrganizationId = await resolveActiveOrgId(
        db,
        userId,
        claims as unknown as { app_metadata?: Record<string, unknown> | null }
    );

    const [organization, subscriptionResult] = await Promise.all([
        activeOrganizationId
            ? getCachedOrg(db, activeOrganizationId)
            : Promise.resolve(null),
        supabase
            .from('user_subscriptions')
            .select('plan_id, status')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing'])
            .maybeSingle(),
    ]);

    const subscription = subscriptionResult.data;
    const afterCtx = performance.now();

    const orgGate: OrgDashboardGateRow | null = organization
        ? {
              status: organization.status ?? '',
              subscription_status: organization.subscription_status,
              deleted_at: organization.deleted_at,
              trial_ends_at: organization.trial_ends_at,
          }
        : null;

    const { allowedForDashboard: hasActiveOrg } = evaluateDashboardEntitlement({
        org: orgGate,
        personalSub: subscription,
    });

    if (isOnboardingPath(pathname)) {
        // User authentifié → laisser le Server Component décider
        // (deriveScenario gère les redirections : terminé → /dashboard, etc.)
        return response;
    }

    if (!hasActiveOrg) {
        if (
            shouldRedirectToOrgInactivePage({
                profileOrgId: activeOrganizationId,
                org: orgGate,
                allowedForDashboard: hasActiveOrg,
            })
        ) {
            const inactive = createRedirectUrl(
                '/auth/inactive?reason=organization',
                request
            );
            return NextResponse.redirect(inactive);
        }
        return NextResponse.redirect(createRedirectUrl('/onboarding', request));
    }

    // Proxy cost breakdown for the entitled pass-through (visible on every
    // protected navigation, incl. RSC `?_rsc=` requests) → DevTools Network →
    // Timing → Server Timing. `auth` = getClaims, `ctx` = org cache + sub query.
    const proxyTiming =
        `proxy-auth;dur=${(afterAuth - proxyStart).toFixed(1)}, ` +
        `proxy-ctx;dur=${(afterCtx - afterAuth).toFixed(1)}, ` +
        `proxy-total;dur=${(performance.now() - proxyStart).toFixed(1)}`;
    // Vercel strips `Server-Timing` in prod → also emit under `X-Andoxa-Timing`.
    response.headers.set('Server-Timing', proxyTiming);
    response.headers.set('X-Andoxa-Timing', proxyTiming);

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|assets|robots.txt|sitemap.xml).*)',
        '/api/:path*',
    ],
};
