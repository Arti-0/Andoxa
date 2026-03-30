import type { PlanId } from "@/lib/config/plans-config";

/**
 * Transitional: Essential + Stripe trial (`plan=essential`, `subscription_status=trialing`)
 * is treated as Business for quotas and route/API gates. DB plan and role permissions are unchanged.
 * Rate limits (Upstash per-route) are unaffected.
 *
 * Set to `false` to restore trial caps + Essential-only routes for trialing Essential.
 */
export const TRIAL_ESSENTIAL_PROMO_FULL_ACCESS = true;

function isEssentialStripeTrial(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): boolean {
  return (
    (plan ?? "").toLowerCase() === "essential" &&
    subscriptionStatus === "trialing"
  );
}

/**
 * Plan column on `organizations` during Stripe trial is usually `essential`.
 * When {@link TRIAL_ESSENTIAL_PROMO_FULL_ACCESS} is false, limits match the trial row in plans-config.
 */
export function effectivePlanIdForLimits(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): PlanId {
  if (
    TRIAL_ESSENTIAL_PROMO_FULL_ACCESS &&
    isEssentialStripeTrial(plan, subscriptionStatus)
  ) {
    return "business";
  }

  const p = (plan ?? "essential").toLowerCase();
  if (p === "essential" && subscriptionStatus === "trialing") {
    return "trial";
  }
  if (p === "trial" || p === "essential" || p === "pro" || p === "business" || p === "demo") {
    return p as PlanId;
  }
  if (p === "free") {
    return "essential";
  }
  return "trial";
}

/** Map DB plan to a PlanId used for route/feature gating (not limit rows). */
export function normalizePlanIdForRoutes(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): PlanId {
  if (
    TRIAL_ESSENTIAL_PROMO_FULL_ACCESS &&
    isEssentialStripeTrial(plan, subscriptionStatus)
  ) {
    return "business";
  }

  const p = (plan ?? "essential").toLowerCase();
  if (p === "free") return "essential";
  if (p === "trial" || p === "essential" || p === "pro" || p === "business" || p === "demo") {
    if (p === "essential" && subscriptionStatus === "trialing") {
      return "essential";
    }
    return p as PlanId;
  }
  return "essential";
}
