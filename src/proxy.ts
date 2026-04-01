import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
    evaluateDashboardEntitlement,
    shouldRedirectToOrgInactivePage,
    type OrgDashboardGateRow,
} from '@/lib/auth/dashboard-entitlement';

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
    '/auth',
    '/auth/login',
    '/auth/invite',
    '/login',
    '/pricing',
    '/about',
    '/help',
    '/privacy',
    '/terms',
    '/cgv',
    '/security',
    '/changelog',
    '/contact',
    '/booking',
    '/unsubscribe',
    '/checkout',
];

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks (no Supabase session — must never run auth gates)
// ─────────────────────────────────────────────────────────────────────────────
// Stripe: POST /api/paiements/webhook (signing secret). Unipile: /api/webhooks/unipile.
// All /api/* are excluded from this file's matcher; listed here for documentation only.

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
    const base =
        process.env.NEXT_PUBLIC_APP_URL ||
        (request.headers.get('x-forwarded-host')
            ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
            : request.url);
    const url = new URL(path, base);
    if (process.env.NODE_ENV === 'development') {
        url.protocol = 'http:';
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

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
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

    console.log(
        '[proxy] cookie value preview:',
        request.cookies
            .get('sb-uggsuchjyysjpcyeqqgy-auth-token')
            ?.value?.slice(0, 50)
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();
    console.log(
        '[proxy]',
        pathname,
        'user:',
        user?.id ?? 'null',
        'cookies:',
        request.cookies.getAll().map((c) => c.name)
    );
    if (!user) {
        const loginUrl = createRedirectUrl('/auth/login', request);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('id', user.id)
        .maybeSingle();

    const profileOrgId = profile?.active_organization_id ?? null;

    // Post-checkout wait page: allow authenticated users without full dashboard entitlement
    if (pathname === '/success') {
        return response;
    }

    const activeOrganizationId = profileOrgId;
    let organization: OrgRow | null = null;

    if (activeOrganizationId) {
        const { data: org } = await supabase
            .from('organizations')
            .select(
                'id, status, subscription_status, trial_ends_at, deleted_at'
            )
            .eq('id', activeOrganizationId)
            .maybeSingle();
        organization = org as OrgRow | null;
    }

    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

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

    console.log('[proxy]', {
        pathname,
        userId: user.id,
        profileOrgId,
        activeOrganizationId,
        orgStatus: organization?.status ?? 'null',
        orgSubStatus: organization?.subscription_status ?? 'null',
        orgDeletedAt: organization?.deleted_at ?? 'null',
        hasActiveOrg,
    });

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

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|assets|robots.txt|sitemap.xml).*)',
    ],
};
