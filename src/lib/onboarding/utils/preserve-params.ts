"use client";

import {
  normalizeBillingCadence,
  normalizeMarketingPaidPlanSlug,
  type PaidPlan,
} from "@/lib/config/stripe-plans";

export function preserveParamsInNavigation(
  basePath: string,
  currentSearchParams?: URLSearchParams
): string {
  const params =
    currentSearchParams || new URLSearchParams(window.location.search);
  const planRaw =
    params.get("plan") || sessionStorage.getItem("selectedPlan") || "";
  const frequencyRaw =
    params.get("frequency") ||
    params.get("billing") ||
    sessionStorage.getItem("selectedFrequency") ||
    "";

  if (planRaw && frequencyRaw) {
    const plan: PaidPlan =
      normalizeMarketingPaidPlanSlug(planRaw) ?? "solo";
    const cadence = normalizeBillingCadence(frequencyRaw) ?? "annual";

    sessionStorage.setItem("selectedPlan", plan);
    sessionStorage.setItem("selectedFrequency", cadence);

    const url = new URL(basePath, window.location.origin);
    url.searchParams.set("plan", plan);
    url.searchParams.set("frequency", cadence);
    return url.pathname + url.search;
  }

  return basePath;
}
