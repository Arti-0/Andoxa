import { isPlanId, type PlanId } from "@/lib/config/plans-config";

/**
 * Effective-plan resolution.
 *
 * After the `solo|team|custom` migration there's no more "essential trialing
 * unlocks Pro" promo — every paid plan gets every feature, so feature gating
 * lives behind `isPaidPlan` / `isMultiSeatPlan` in `plans-config.ts` instead.
 *
 * The only special case left is `solo` + `trialing` → use the smaller trial
 * caps (1 000 prospects) so trial accounts can't import a million rows for
 * free. Legacy `essential|pro|business|free` strings — left over from the
 * old DB layout — are mapped onto the new IDs as a defensive fallback (the
 * DB constraint M-PLAN-1 makes them unreachable in practice).
 */

/** Normalize a raw DB plan string to a canonical PlanId. */
function coercePlan(plan: string | null | undefined): PlanId {
  const p = (plan ?? "").toLowerCase().trim();
  if (isPlanId(p)) return p;
  // Defensive: legacy strings if a row predates M-PLAN-1.
  if (p === "free" || p === "essential") return "solo";
  if (p === "pro" || p === "business") return "team";
  return "trial";
}

/**
 * Map a DB (plan, subscription_status) tuple to the PlanId we should use when
 * looking up **usage limits** (prospects, campaigns, …).
 *
 * Solo + trialing → `trial` row in `PLAN_LIMITS` (smaller caps).
 */
export function effectivePlanIdForLimits(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): PlanId {
  const p = coercePlan(plan);
  if (p === "solo" && subscriptionStatus === "trialing") {
    return "trial";
  }
  return p;
}

/**
 * Map a DB (plan, subscription_status) tuple to the PlanId we should use when
 * answering **route access / feature gates**.
 *
 * Today this returns the same value as `effectivePlanIdForLimits`, because
 * route access doesn't differ between trial and solo (both have the full
 * feature surface, only the caps differ). Kept as a separate function so we
 * can diverge later if needed.
 */
export function normalizePlanIdForRoutes(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): PlanId {
  // Trial accounts should still be able to access every paid route — so we
  // return `solo` (not `trial`) for routing purposes.
  const p = coercePlan(plan);
  if (p === "solo" && subscriptionStatus === "trialing") {
    return "solo";
  }
  return p;
}
