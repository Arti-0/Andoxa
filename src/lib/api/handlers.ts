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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Result shape of profiles select with organizations join (Database type has no profiles table) */
interface ProfileWithOrg {
  active_organization_id: string | null;
  organizations: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    plan: string | null;
    subscription_status: string | null;
    trial_ends_at: string | null;
    credits?: number;
    owner_id: string | null;
    created_at: string;
    updated_at: string;
    metadata?: unknown;
  } | null;
}

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
): Promise<ApiContext> {
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

  const {
    data: { user },
    error: authError,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (options.requireAuth !== false && (!user || authError)) {
    throw Errors.unauthorized();
  }

  let workspace: Workspace | null = null;

  // Get workspace if user is authenticated
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select(
        `
        active_organization_id,
        organizations:active_organization_id (
          id,
          name,
          slug,
          logo_url,
          plan,
          subscription_status,
          trial_ends_at,
          credits,
          owner_id,
          created_at,
          updated_at,
          metadata
        )
      `
      )
      .eq("id", user.id)
      .single();

    const profile = data as ProfileWithOrg | null;
    if (profile?.organizations) {
      const org = profile.organizations;
      // Workspace type: organizations = team workspace (multi-user)
      workspace = {
        id: org.id,
        name: org.name,
        slug: org.slug ?? "",
        logo_url: org.logo_url,
        plan: (org.plan ?? "free") as Workspace["plan"],
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
    userId: user?.id ?? "",
    email: user?.email ?? "",
    workspace,
    workspaceId: workspace?.id ?? null,
    supabase: supabase as unknown as SupabaseClient<Database>,
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
    try {
      const context = await buildApiContext(request, options);

      if (context.userId) {
        Sentry.setUser({ id: context.userId, email: context.email });
      }

      if (options.rateLimit !== false) {
        const identifier = context.userId || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rlResponse = await withRateLimit(request, identifier, {
          name: options.rateLimit?.name ?? "api",
          requests: options.rateLimit?.requests ?? 100,
          window: options.rateLimit?.window ?? "1 m",
        });
        if (rlResponse) return rlResponse;
      }

      const result = await handler(request, context);

      // Return success response
      return createResponse(result);
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
  const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || "20", 10)));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

