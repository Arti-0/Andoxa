// andoxa-perf-2b 2026-06-06: getClaims + cached org context + Server-Timing
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";
import type { Workspace, ApiResponse } from "../workspace/types";
import { withRateLimit } from "../rate-limit";
import {
  assertWorkspaceHasActiveBilling,
  BillingInactiveError,
} from "../billing/workspace-billing";
import { getCachedOrg, resolveActiveOrgId } from "../workspace/cached-context";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiContext {
  /** Authenticated user ID */
  userId: string;
  /** User's email */
  email: string;
  /** Current workspace (if available) */
  workspace: Workspace | null;
  /** Workspace ID shorthand */
  workspaceId: string | null;
  /** Supabase client (server) */
  supabase: SupabaseClient<Database>;
}

export interface HandlerOptions {
  /** Require authentication (default: true) */
  requireAuth?: boolean;
  /** Require workspace (default: true for protected routes) */
  requireWorkspace?: boolean;
  /** Rate limit config. Set to false to disable. Default: 100 req/min per user. */
  rateLimit?: false | { requests?: number; window?: string; name?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Classes
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const Errors = {
  unauthorized: () => new ApiError("UNAUTHORIZED", "Authentication required", 401),
  forbidden: (message = "Access denied") =>
    new ApiError("FORBIDDEN", message, 403),
  notFound: (resource = "Resource") =>
    new ApiError("NOT_FOUND", `${resource} not found`, 404),
  badRequest: (message: string, details?: Record<string, unknown>) =>
    new ApiError("BAD_REQUEST", message, 400, details),
  validation: (errors: Record<string, string>) =>
    new ApiError("VALIDATION_ERROR", "Validation failed", 400, { errors }),
  internal: (message = "Internal server error") =>
    new ApiError("INTERNAL_ERROR", message, 500),
  planRequired: (message = "Active plan required") =>
    new ApiError("PLAN_REQUIRED", message, 402),
  /**
   * Thrown when the workspace would exceed a plan limit (seats, prospects,
   * campaigns, …). The client catches this code and opens the upgrade prompt
   * with the relevant context. `details.resource` is the limited resource,
   * `details.used` / `details.limit` carry the cap state for messaging.
   */
  planLimitReached: (
    resource: string,
    used: number,
    limit: number,
    message?: string
  ) =>
    new ApiError(
      "PLAN_LIMIT_REACHED",
      message ??
        `Limite du plan atteinte pour « ${resource} » (${used}/${limit}).`,
      409,
      { resource, used, limit }
    ),
  conflict: (message: string) =>
    new ApiError("CONFLICT", message, 409),
};

// ─────────────────────────────────────────────────────────────────────────────
// Response Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Success envelope. HTTP status is 2xx (default 200). Clients must not infer
 * failure from the body alone: always pair with `response.ok` / status.
 */
function createResponse<T>(data: T, status = 200): NextResponse {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

/**
 * Error envelope for all thrown `ApiError`s and `withRateLimit` denials.
 * Invariant: HTTP status is never 200 — always 4xx/5xx (e.g. 400, 401, 429, 500).
 * Body: `{ success: false, error: { code, message, details? } }`.
 * Callers must not return 200 with `success: false`; consumers rely on status + `success === true` for success.
 */
function createErrorResponse(error: ApiError): NextResponse {
  const body: ApiResponse<never> = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
  return NextResponse.json(body, { status: error.status });
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Builder
// ─────────────────────────────────────────────────────────────────────────────

function getBearerToken(request: NextRequest): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

async function buildApiContext(
  request: NextRequest,
  options: HandlerOptions
): Promise<{ context: ApiContext; timings: { auth: number; org: number } }> {
  // andoxa-perf-2b: sub-phase timings (auth=getClaims, org=resolveActiveOrgId +
  // getCachedOrg) so the context cost can be localized in X-Andoxa-Timing.
  let authMs = 0;
  let orgMs = 0;
  const bearerToken = getBearerToken(request);

  let supabase: SupabaseClient<Database>;

  if (bearerToken) {
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${bearerToken}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    ) as unknown as SupabaseClient<Database>;
  } else {
    let response = NextResponse.next();
    supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
            cookies.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    ) as unknown as SupabaseClient<Database>;
  }

  // getClaims() verifies the JWT locally against the project's asymmetric
  // signing keys — no Auth-server round-trip per request, unlike getUser().
  // For the bearer (extension) path it verifies the passed token the same way.
  const _tAuth0 = performance.now();
  const { data: claimsData, error: authError } = bearerToken
    ? await supabase.auth.getClaims(bearerToken)
    : await supabase.auth.getClaims();
  authMs = performance.now() - _tAuth0;

  const claims = claimsData?.claims ?? null;
  const userId = claims?.sub ?? null;
  const email = (claims?.email as string | undefined) ?? "";

  if (options.requireAuth !== false && (!userId || authError)) {
    throw Errors.unauthorized();
  }

  let workspace: Workspace | null = null;

  // Get workspace if user is authenticated. Active org comes from the JWT
  // app_metadata claim (fallback: profiles lookup); the org row is served from
  // the shared short-TTL cache keyed by org id — same key the proxy uses.
  if (userId) {
    const db = supabase as unknown as SupabaseClient<Database>;
    const _tOrg0 = performance.now();
    const activeOrgId = await resolveActiveOrgId(
      db,
      userId,
      claims as unknown as { app_metadata?: Record<string, unknown> | null }
    );
    const org = activeOrgId ? await getCachedOrg(db, activeOrgId) : null;
    orgMs = performance.now() - _tOrg0;
    if (org) {
      // Workspace type: organizations = team workspace (multi-user)
      workspace = {
        id: org.id,
        name: org.name,
        slug: org.slug ?? "",
        logo_url: org.logo_url,
        plan: (org.plan ?? "trial") as Workspace["plan"],
        subscription_status: org.subscription_status as Workspace["subscription_status"],
        trial_ends_at: org.trial_ends_at,
        credits: org.credits ?? 0,
        owner_id: org.owner_id ?? "",
        created_at: org.created_at,
        updated_at: org.updated_at,
        type: "team",
        metadata: (org.metadata ?? null) as Workspace["metadata"],
      };
    }

    // Check workspace requirement
    if (options.requireWorkspace !== false && !workspace) {
      throw Errors.badRequest("Workspace required");
    }

    if (options.requireWorkspace !== false && workspace) {
      try {
        assertWorkspaceHasActiveBilling(workspace);
      } catch (e) {
        if (e instanceof BillingInactiveError) {
          throw Errors.planRequired(e.message);
        }
        throw e;
      }
    }
  }

  // createServerClient<Database> infers a different schema generic than SupabaseClient<Database>; cast for ApiContext
  return {
    context: {
      userId: userId ?? "",
      email,
      workspace,
      workspaceId: workspace?.id ?? null,
      supabase: supabase as unknown as SupabaseClient<Database>,
    },
    timings: { auth: authMs, org: orgMs },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a standardized API route handler
 *
 * @example
 * ```ts
 * // api/prospects/route.ts
 * export const GET = createApiHandler(async (req, ctx) => {
 *   const prospects = await ctx.supabase
 *     .from('prospects')
 *     .select('*')
 *     .eq('organization_id', ctx.workspaceId);
 *   return prospects.data;
 * });
 *
 * export const POST = createApiHandler(async (req, ctx) => {
 *   const body = await req.json();
 *   // Validation, creation, etc.
 *   return newProspect;
 * });
 * ```
 */
export function createApiHandler<T>(
  handler: (request: NextRequest, context: ApiContext) => Promise<T>,
  options: HandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Phase timings surfaced via `Server-Timing` so each route's cost breakdown
    // (auth/context vs rate-limit vs handler) is visible in Chrome DevTools →
    // Network → Timing, without any extra tooling.
    const t0 = performance.now();
    try {
      const { context, timings } = await buildApiContext(request, options);
      const tCtx = performance.now();

      if (context.userId) {
        Sentry.setUser({ id: context.userId, email: context.email });
      }

      let tRl = tCtx;
      if (options.rateLimit !== false) {
        const identifier = context.userId || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rlResponse = await withRateLimit(request, identifier, {
          name: options.rateLimit?.name ?? "api",
          requests: options.rateLimit?.requests ?? 100,
          window: options.rateLimit?.window ?? "1 m",
        });
        if (rlResponse) return rlResponse;
        tRl = performance.now();
      }

      const result = await handler(request, context);
      const tHandler = performance.now();

      // Return success response
      const response = createResponse(result);
      // Vercel STRIPS `Server-Timing` in production, so emit the same breakdown
      // under `X-Andoxa-Timing` too (custom X- headers pass through Vercel's
      // edge). Server-Timing is kept for local dev (DevTools waterfall).
      const timingValue = [
        `auth;dur=${timings.auth.toFixed(1)}`,
        `org;dur=${timings.org.toFixed(1)}`,
        `ctx;dur=${(tCtx - t0).toFixed(1)}`,
        `rl;dur=${(tRl - tCtx).toFixed(1)}`,
        `handler;dur=${(tHandler - tRl).toFixed(1)}`,
        `total;dur=${(tHandler - t0).toFixed(1)}`,
      ].join(", ");
      response.headers.set("Server-Timing", timingValue);
      response.headers.set("X-Andoxa-Timing", timingValue);
      return response;
    } catch (error) {
      // Handle known API errors
      if (error instanceof ApiError) {
        return createErrorResponse(error);
      }

      console.error("[API Error]", error);
      Sentry.captureException(error);

      return createErrorResponse(Errors.internal());
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse JSON body with validation
 */
export async function parseBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw Errors.badRequest("Invalid JSON body");
  }
}

/**
 * Get search params as object
 */
export function getSearchParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Get pagination params
 */
export function getPagination(request: NextRequest): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const params = getSearchParams(request);
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = Math.min(1000, Math.max(1, parseInt(params.pageSize || "20", 10)));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

