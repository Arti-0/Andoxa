import { hasActiveBilling } from "@/lib/billing/workspace-billing";
import type { SubscriptionStatus } from "@/lib/workspace/types";

/** Organization row fields used for dashboard / proxy gating */
export type OrgDashboardGateRow = {
  status: string;
  subscription_status: string | null;
  deleted_at: string | null;
  trial_ends_at: string | null;
};

export function personalSubscriptionAllowsDashboard(
  sub: { status?: string | null } | null | undefined
): boolean {
  const s = sub?.status;
  return s === "active" || s === "trialing";
}

/**
 * When the org row alone allows access to /dashboard (plan page, proxy, OAuth callback).
 */
export function organizationAllowsDashboardAccess(
  org: OrgDashboardGateRow
): boolean {
  const billingOk = hasActiveBilling({
    subscription_status: org.subscription_status as SubscriptionStatus | null,
    trial_ends_at: org.trial_ends_at,
  });

  return (
    (org.status === "active" &&
      (billingOk || org.subscription_status === null)) ||
    (org.status === "deleted" &&
      org.deleted_at != null &&
      new Date(org.deleted_at) >=
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
}

export type DashboardEntitlementInput = {
  org: OrgDashboardGateRow | null;
  personalSub: { status?: string | null } | null | undefined;
};

/**
 * Single product rule: dashboard vs onboarding for proxy, OAuth callback, and plan UI.
 */
export function evaluateDashboardEntitlement(
  params: DashboardEntitlementInput
): { allowedForDashboard: boolean; reason?: string } {
  if (personalSubscriptionAllowsDashboard(params.personalSub)) {
    return { allowedForDashboard: true, reason: "personal_subscription" };
  }
  if (
    params.org != null &&
    organizationAllowsDashboardAccess(params.org)
  ) {
    return { allowedForDashboard: true, reason: "organization" };
  }
  return { allowedForDashboard: false, reason: "no_entitlement" };
}

/** Back-compat alias used by client plan page and APIs */
export function userDashboardEntitlement(params: DashboardEntitlementInput): {
  allowed: boolean;
} {
  const { allowedForDashboard } = evaluateDashboardEntitlement(params);
  return { allowed: allowedForDashboard };
}

/**
 * When proxy should send the user to /auth/inactive?reason=organization instead of onboarding.
 * Covers orphan active_organization_id and org removal (deleted / past grace) — not billing or trial expiry.
 */
export function shouldRedirectToOrgInactivePage(input: {
  profileOrgId: string | null;
  org: OrgDashboardGateRow | null;
  allowedForDashboard: boolean;
}): boolean {
  if (input.allowedForDashboard) return false;
  if (!input.profileOrgId) return false;
  if (input.org == null) return true;
  const removalLike =
    input.org.deleted_at != null || input.org.status === "deleted";
  if (!removalLike) return false;
  return !organizationAllowsDashboardAccess(input.org);
}
