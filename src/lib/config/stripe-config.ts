/**
 * Static Stripe-side configuration (URLs, trial duration, currency).
 *
 * Price IDs are NOT stored here anymore — they're env-var driven in
 * `lib/config/stripe-plans.ts`. This module is kept for the few callers that
 * still want a place to read URLs / trial settings.
 */

import { priceIdFor, type BillingCadence, type PaidPlan } from "@/lib/config/stripe-plans";
import type { PlanId as CanonicalPlanId } from "@/lib/config/plans-config";

/** Detect Stripe mode at runtime from the secret key prefix. */
export function getStripeMode(): "test" | "live" {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  return secretKey.startsWith("sk_live_") ? "live" : "test";
}

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : "";
}

export const STRIPE_CONFIG = {
  /** URLs Stripe redirects to after checkout / portal. */
  get urls() {
    const base = appBaseUrl();
    return {
      success: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel: `${base}/pricing?canceled=true`,
      billing: `${base}/settings`,
    };
  },

  payment: {
    currency: "eur",
    billingAddressCollection: "auto",
    allowPromotionCodes: true,
  },

  trial: {
    /**
     * Master switch — when false, no Solo trial is granted and every checkout
     * goes straight to Stripe with no `trial_period_days`. Flip via env:
     *
     *     TRIAL_ENABLED=true   # restore the legacy 14-day Solo trial
     *
     * Default is `false` (post May-2026 pricing). Reads at runtime so toggling
     * the env var in Vercel takes effect on the next request.
     */
    get enabled(): boolean {
      return (process.env.TRIAL_ENABLED ?? "").toLowerCase() === "true";
    },
    /**
     * Days of free trial granted on first Solo subscription when enabled.
     * Configurable so we can run "7-day", "30-day", or any length without a
     * code change:
     *
     *     TRIAL_DURATION_DAYS=7
     */
    get durationDays(): number {
      const raw = Number.parseInt(process.env.TRIAL_DURATION_DAYS ?? "", 10);
      return Number.isFinite(raw) && raw > 0 ? raw : 14;
    },
    /** Soft cap so a single user can't open multiple trial accounts. */
    maxPerDomain: 1,
  },
} as const;

/** Re-exported here so existing imports of `PlanId` keep working. */
export type PlanId = CanonicalPlanId;

/**
 * Back-compat shim for the old `STRIPE_CONFIG.priceIds[plan][frequency]` API.
 * New code should call `priceIdFor` from `stripe-plans.ts` directly.
 */
export function legacyPriceIdLookup(
  plan: string,
  frequency: "monthly" | "yearly" | "annual"
): string | null {
  if (plan !== "solo" && plan !== "team") return null;
  const cadence: BillingCadence = frequency === "monthly" ? "monthly" : "annual";
  return priceIdFor(plan as PaidPlan, cadence);
}
