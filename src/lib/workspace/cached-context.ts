/**
 * Cached workspace/org context (Layer 2b)
 *
 * The proxy and every `createApiHandler` call resolve the same active-org row.
 * That row changes rarely (billing events, org rename), so we cache it in
 * Upstash with a short TTL and explicit invalidation.
 *
 * Correctness model:
 *  - The cache key is the **org id**, not the user id. A workspace switch makes
 *    requests resolve a *different* org id (carried fresh in the JWT
 *    `app_metadata.active_organization_id` claim, mirrored by the
 *    `sync_active_org_to_user_metadata` trigger), so the key changes and there
 *    is no stale-tenant window — no switch-time invalidation needed.
 *  - Billing changes (Stripe webhook) and org edits (rename/logo) call
 *    `invalidateOrgContext(orgId)` so plan/status changes propagate immediately.
 *  - TTL is the backstop if an invalidation is ever missed.
 *  - `credits` is included for display only; spend enforcement uses
 *    `checkPlanLimit` (plan limit + monthly usage), never this cached value.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { cache } from "@/lib/cache/redis";

/** Short — billing/rename invalidate explicitly; this only bounds missed invalidations. */
const ORG_CTX_TTL_SECONDS = 30;

export interface CachedOrgRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  plan: string | null;
  status: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  deleted_at: string | null;
  credits: number | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: unknown;
}

type ClaimsLike = { app_metadata?: Record<string, unknown> | null } | null | undefined;

const orgKey = (orgId: string) => `orgctx:${orgId}`;

/**
 * Resolve the active organization id. Prefers the JWT `app_metadata` claim
 * (no DB round-trip, always fresh after a workspace switch + session refresh);
 * falls back to a `profiles` lookup when the claim is absent (e.g. a freshly
 * onboarded user whose token hasn't refreshed yet).
 */
export async function resolveActiveOrgId(
  supabase: SupabaseClient<Database>,
  userId: string,
  claims: ClaimsLike
): Promise<string | null> {
  const fromJwt = claims?.app_metadata?.active_organization_id;
  if (typeof fromJwt === "string" && fromJwt.length > 0) return fromJwt;

  const { data } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", userId)
    .maybeSingle();
  return ((data?.active_organization_id as string | null) ?? null) || null;
}

/**
 * Org row by id, cached for a short TTL. Shared key across the proxy and all
 * API routes, so concurrent requests for the same org reuse one cached row.
 */
export async function getCachedOrg(
  supabase: SupabaseClient<Database>,
  orgId: string
): Promise<CachedOrgRow | null> {
  return cache.wrap<CachedOrgRow | null>(
    orgKey(orgId),
    async () => {
      const { data } = await supabase
        .from("organizations")
        .select(
          "id, name, slug, logo_url, plan, status, subscription_status, trial_ends_at, deleted_at, credits, owner_id, created_at, updated_at, metadata"
        )
        .eq("id", orgId)
        .maybeSingle();
      return (data as CachedOrgRow | null) ?? null;
    },
    { ttl: ORG_CTX_TTL_SECONDS }
  );
}

/** Drop the cached org row. Call after any write to the organization. */
export async function invalidateOrgContext(orgId: string): Promise<void> {
  await cache.del(orgKey(orgId));
}
