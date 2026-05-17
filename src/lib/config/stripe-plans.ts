/**
 * Stripe plan ↔ price-ID mapping.
 *
 * The destination Stripe account is set up with two recurring products:
 *
 *   - **Solo**  — single-seat subscription. Two prices: monthly + annual.
 *   - **Team**  — per-seat subscription (Stripe `quantity`). Two prices: monthly + annual.
 *
 * Custom doesn't hit Stripe (contact-sales). Trial is a 14-day Stripe trial
 * applied to the Solo monthly price.
 *
 * Price IDs are read from environment variables so you only have to create the
 * products in the Stripe dashboard and paste 4 IDs into your env — no code
 * change required.
 *
 * Required env vars (set in `.env.local` for dev and in Vercel for prod/preview):
 *
 *   STRIPE_SECRET_KEY              # restricted API key, `rk_…`
 *   STRIPE_WEBHOOK_SECRET          # the webhook endpoint's signing secret
 *   STRIPE_PRICE_SOLO_MONTHLY      # price_xxx — Solo monthly
 *   STRIPE_PRICE_SOLO_ANNUAL       # price_xxx — Solo annual
 *   STRIPE_PRICE_TEAM_MONTHLY      # price_xxx — Team per-seat monthly
 *   STRIPE_PRICE_TEAM_ANNUAL       # price_xxx — Team per-seat annual
 *   NEXT_PUBLIC_APP_URL            # base URL for success/cancel redirects
 *
 * All lookups are runtime, not build-time, so missing env vars degrade
 * gracefully (the checkout route returns a 503-style "not configured" fallback).
 */

import type { PlanId } from "@/lib/config/plans-config";

/** Plans that have a Stripe price attached (Custom is contact-sales). */
export type PaidPlan = Extract<PlanId, "solo" | "team">;

/** Billing cadence. We accept the legacy `yearly` alias for `annual`. */
export type BillingCadence = "monthly" | "annual";
export type BillingCadenceInput = BillingCadence | "yearly";

export const SITE_PLAN_LABEL: Record<PaidPlan, string> = {
  solo: "Solo",
  team: "Team",
};

/**
 * Resolve the env-var name that holds the Stripe price ID for a given
 * plan + cadence combination.
 *
 * @internal exported for tests + ops scripts that want to enumerate env vars.
 */
export function priceEnvVarName(plan: PaidPlan, cadence: BillingCadence): string {
  if (plan === "solo") {
    return cadence === "annual"
      ? "STRIPE_PRICE_SOLO_ANNUAL"
      : "STRIPE_PRICE_SOLO_MONTHLY";
  }
  return cadence === "annual"
    ? "STRIPE_PRICE_TEAM_ANNUAL"
    : "STRIPE_PRICE_TEAM_MONTHLY";
}

/**
 * Normalize a billing cadence string (accepts the legacy `yearly`).
 * Returns `null` if the input is not a valid cadence.
 */
export function normalizeBillingCadence(
  value: string | null | undefined
): BillingCadence | null {
  if (value === "monthly") return "monthly";
  if (value === "annual" || value === "yearly") return "annual";
  return null;
}

/** Returns the Stripe price ID for a plan + cadence, or `null` if unset. */
export function priceIdFor(
  plan: PaidPlan,
  cadence: BillingCadence
): string | null {
  const envVar = priceEnvVarName(plan, cadence);
  return process.env[envVar]?.trim() || null;
}

/** True if `value` is one of the paid plan IDs (excludes `custom`/`trial`/`demo`). */
export function isPaidPlanId(value: string | undefined | null): value is PaidPlan {
  return value === "solo" || value === "team";
}

/**
 * Normalizes marketing slugs (`solo` / `team`) and legacy signup URLs (`essential` /
 * `pro` / `business`) to the Stripe-backed {@link PaidPlan}.
 */
export function normalizeMarketingPaidPlanSlug(
  raw: string | null | undefined
): PaidPlan | null {
  const p = (raw ?? "").trim().toLowerCase();
  if (p === "solo" || p === "essential") return "solo";
  if (p === "team" || p === "pro" || p === "business") return "team";
  return isPaidPlanId(p) ? p : null;
}

/** True if `value` is a billing cadence (monthly | annual). */
export function isBillingCadence(
  value: string | undefined | null
): value is BillingCadence {
  return value === "monthly" || value === "annual";
}

/**
 * Reverse lookup: given a Stripe price ID, return the plan + cadence it maps
 * to (or null if it's not one of our env-configured prices).
 *
 * Used by the Stripe webhook to derive `plan_id` for incoming subscription
 * events so the canonical mapping lives in one place.
 */
export function resolvePriceId(
  priceId: string | null | undefined
): { plan: PaidPlan; cadence: BillingCadence } | null {
  if (!priceId) return null;
  const id = priceId.trim();
  if (!id) return null;

  const candidates: Array<{ plan: PaidPlan; cadence: BillingCadence }> = [
    { plan: "solo", cadence: "monthly" },
    { plan: "solo", cadence: "annual" },
    { plan: "team", cadence: "monthly" },
    { plan: "team", cadence: "annual" },
  ];

  for (const c of candidates) {
    if (priceIdFor(c.plan, c.cadence) === id) return c;
  }
  return null;
}

/**
 * Minimum quantity expected for a plan. Solo is always 1 seat, Team starts at 3.
 * The marketing site enforces this on the client; the server uses this to coerce
 * any malicious / stale request.
 */
export function minSeatsFor(plan: PaidPlan): number {
  return plan === "team" ? 3 : 1;
}

/** Max seats sold without escalating to Custom. Used purely for validation. */
export function maxSeatsFor(plan: PaidPlan): number {
  return plan === "team" ? 20 : 1;
}

/**
 * Coerce a user-supplied seat count into the allowed range for a plan.
 * Solo collapses to 1 unconditionally.
 */
export function clampSeats(plan: PaidPlan, requested: number | undefined): number {
  if (plan === "solo") return 1;
  const min = minSeatsFor(plan);
  const max = maxSeatsFor(plan);
  const n = Number.isFinite(requested) ? Math.floor(requested as number) : min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
