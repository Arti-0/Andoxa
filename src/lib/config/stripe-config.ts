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
    /** Days of free trial granted on first Solo subscription. */
    durationDays: 14,
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
