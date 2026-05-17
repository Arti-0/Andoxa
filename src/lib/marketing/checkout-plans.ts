/**
 * @deprecated Re-exports `lib/config/stripe-plans` for checkout wiring paths
 * built before stripe-plans was canonical. Prefer importing from
 * `@/lib/config/stripe-plans` in new code.
 */

export {
  isPaidPlanId as isSitePlan,
  isBillingCadence as isSiteBilling,
  priceIdFor,
  SITE_PLAN_LABEL,
  type PaidPlan as SitePlan,
  type BillingCadence as SiteBilling,
} from "@/lib/config/stripe-plans";
