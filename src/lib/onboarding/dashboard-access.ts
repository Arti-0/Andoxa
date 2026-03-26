import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveBilling } from "@/lib/billing/workspace-billing";
import type { SubscriptionStatus } from "@/lib/workspace/types";

export type OrgDashboardGateRow = {
  status: string;
  subscription_status: string | null;
  deleted_at: string | null;
  trial_ends_at: string | null;
};

/** Same rules as onboarding layout: when the org row alone allows redirecting to /dashboard */
export function organizationAllowsDashboardAccess(org: OrgDashboardGateRow): boolean {
  const billingOk = hasActiveBilling({
    subscription_status: org.subscription_status as SubscriptionStatus | null,
    trial_ends_at: org.trial_ends_at,
  });

  return (
    org.status === "pending" ||
    (org.status === "active" && (billingOk || org.subscription_status === null)) ||
    (org.status === "deleted" &&
      org.deleted_at != null &&
      new Date(org.deleted_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
}

/**
 * User belongs to the workspace; org row is readable. Does not encode billing — use for
 * routing only when (protected) layout will apply PendingState / ExpiredSubscriptionState.
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
