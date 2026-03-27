import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveBilling } from "@/lib/billing/workspace-billing";
import type { SubscriptionStatus } from "@/lib/workspace/types";

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
 * When the org row alone allows redirecting to /dashboard from the plan page.
 * Pending orgs are excluded (they must finish onboarding/plan + billing; protected layout blocks dashboard).
 */
export function organizationAllowsDashboardAccess(org: OrgDashboardGateRow): boolean {
  const billingOk = hasActiveBilling({
    subscription_status: org.subscription_status as SubscriptionStatus | null,
    trial_ends_at: org.trial_ends_at,
  });

  return (
    (org.status === "active" && (billingOk || org.subscription_status === null)) ||
    (org.status === "deleted" &&
      org.deleted_at != null &&
      new Date(org.deleted_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
}

/**
 * Single rule for auto-redirect to /dashboard from plan page and OAuth callback.
 * Org side matches (protected) billing + onboarding layout; personal sub is an alternate path.
 */
export function userDashboardEntitlement(params: {
  org: OrgDashboardGateRow | null;
  personalSub: { status?: string | null } | null | undefined;
}): { allowed: boolean } {
  if (personalSubscriptionAllowsDashboard(params.personalSub)) {
    return { allowed: true };
  }
  if (params.org != null && organizationAllowsDashboardAccess(params.org)) {
    return { allowed: true };
  }
  return { allowed: false };
}

/**
 * User belongs to the workspace; org row is readable. Does not encode billing — use for
 * routing only when ProtectedLayoutContent will apply ExpiredSubscriptionState (billing gate).
 */
export async function isUserMemberOfOrganization(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data: member } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return false;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  return org != null;
}

/**
 * Requires org membership + org gate (billing / lifecycle same as onboarding layout).
 */
export async function canUserAccessDashboardForOrg(
  supabase: SupabaseClient,
  userId: string,
  activeOrganizationId: string
): Promise<boolean> {
  const { data: member } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", activeOrganizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return false;

  const { data: org } = await supabase
    .from("organizations")
    .select("status, subscription_status, deleted_at, trial_ends_at")
    .eq("id", activeOrganizationId)
    .maybeSingle();

  if (!org) return false;

  return organizationAllowsDashboardAccess(org);
}
