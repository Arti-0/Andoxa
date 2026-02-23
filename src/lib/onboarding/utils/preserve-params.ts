"use client";

export function preserveParamsInNavigation(
  basePath: string,
  currentSearchParams?: URLSearchParams
): string {
  const params = currentSearchParams || new URLSearchParams(window.location.search);
  const plan = params.get("plan") || sessionStorage.getItem("selectedPlan");
  const frequency = params.get("frequency") || sessionStorage.getItem("selectedFrequency");

  if (plan && frequency) {
    // Store in sessionStorage for persistence
    sessionStorage.setItem("selectedPlan", plan);
    sessionStorage.setItem("selectedFrequency", frequency);

    // Build URL with params
    const url = new URL(basePath, window.location.origin);
    url.searchParams.set("plan", plan);
    url.searchParams.set("frequency", frequency);
    return url.pathname + url.search;
  }

  return basePath;
}
