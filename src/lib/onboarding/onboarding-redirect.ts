import { redirect } from "next/navigation";

/**
 * Appended as /onboarding/plan?reason=… for support and debugging.
 * profile_error — profiles SELECT failed (RLS, DB, etc.)
 * no_profile — no row after invitation reconcile
 * no_workspace — active_organization_id is null
 * not_member — pointer set but no organization_members row (stale or data bug)
 * workspace_inaccessible — member but organizations row missing / SELECT error (RLS edge case)
 */
export type OnboardingRedirectReason =
  | "profile_error"
  | "no_profile"
  | "no_workspace"
  | "not_member"
  | "workspace_inaccessible";

export function redirectToOnboardingPlan(reason: OnboardingRedirectReason): never {
  redirect(`/onboarding/plan?reason=${encodeURIComponent(reason)}`);
}
