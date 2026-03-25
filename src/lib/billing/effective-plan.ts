import type { PlanId } from "@/lib/config/plans-config";

/**
 * Plan column on `organizations` during Stripe trial is usually `essential`.
 * Limits should match the marketing "14-day trial" caps (trial row in plans-config).
 */
export function effectivePlanIdForLimits(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): PlanId {
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
