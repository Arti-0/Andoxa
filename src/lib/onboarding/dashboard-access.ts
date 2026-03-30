import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type OrgDashboardGateRow,
  organizationAllowsDashboardAccess,
  personalSubscriptionAllowsDashboard,
  userDashboardEntitlement,
  evaluateDashboardEntitlement,
} from "@/lib/auth/dashboard-entitlement";

export type { OrgDashboardGateRow };
export {
  personalSubscriptionAllowsDashboard,
  organizationAllowsDashboardAccess,
  userDashboardEntitlement,
  evaluateDashboardEntitlement,
};

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
