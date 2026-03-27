import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReactNode } from "react";
import { PendingState } from "@/components/guards/PendingState";
import { ExpiredSubscriptionState } from "@/components/guards/ExpiredSubscriptionState";
import { ProtectedLayoutContent } from "./protected-layout-content";
import { hasActiveBilling } from "@/lib/billing/workspace-billing";
import type { SubscriptionStatus } from "@/lib/workspace/types";
import {
  extractLinkedInProfileUrlFromMetadata,
  mergeLinkedInAuthMetadata,
} from "@/lib/auth/linkedin-metadata";
import { reconcilePendingInvitationForUser } from "@/lib/invitations/reconcile-invitation";
import { redirectToOnboardingPlan } from "@/lib/onboarding/onboarding-redirect";
import { logger } from "@/lib/utils/logger";

type ProfileRow = {
  id: string;
  active_organization_id: string | null;
  linkedin_url: string | null;
};

/**
 * Protected Layout - Guard Layout with organization and subscription checks
 *
 * This is a Server Component that performs all guard checks before rendering.
 * Responsibilities:
 * - Check if user has an active organization
 * - Check organization status (pending/active)
 * - Check subscription status (active/trialing/expired)
 * - Render appropriate state or children
 */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  // Get authenticated user (proxy already checked auth, but safety check)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, active_organization_id, linkedin_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.warn("protected layout: profile fetch failed", {
      userId: user.id,
      message: profileError.message,
      code: profileError.code,
    });
    redirectToOnboardingPlan("profile_error");
  }

  let profile = profileData as ProfileRow | null;

  const linkedinUrlHint = extractLinkedInProfileUrlFromMetadata(
    mergeLinkedInAuthMetadata(user)
  );

  const reloadProfile = async () => {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, active_organization_id, linkedin_url")
      .eq("id", user.id)
      .maybeSingle();
    if (p) profile = p as ProfileRow;
  };

  const tryReconcileInvitation = async () => {
    await reconcilePendingInvitationForUser(supabase, user.id, {
      profileLinkedInUrl: profile?.linkedin_url ?? null,
      linkedinUrlHint,
    });
    await reloadProfile();
  };

  if (!profile) {
    await tryReconcileInvitation();
  }

  if (!profile) {
    redirectToOnboardingPlan("no_profile");
  }

  if (!profile.active_organization_id) {
    await tryReconcileInvitation();
  }

  if (!profile.active_organization_id) {
    redirectToOnboardingPlan("no_workspace");
  }

  const isMemberOfActiveOrg = async (organizationId: string) => {
    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    return Boolean(member);
  };

  let memberOk = await isMemberOfActiveOrg(profile.active_organization_id);
  if (!memberOk) {
    await tryReconcileInvitation();
    await reloadProfile();
    if (!profile?.active_organization_id) {
      redirectToOnboardingPlan("no_workspace");
    }
    memberOk = await isMemberOfActiveOrg(profile.active_organization_id);
  }
  if (!memberOk) {
    logger.warn("protected layout: active_organization_id set but user not in organization_members", {
      userId: user.id,
      organizationId: profile.active_organization_id,
    });
    redirectToOnboardingPlan("not_member");
  }

  const fetchOrganization = async () => {
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id, status, subscription_status, deleted_at, trial_ends_at")
      .eq("id", profile!.active_organization_id!)
      .single();
    return {
      organization: orgData as {
        id: string;
        status: string;
        subscription_status: string | null;
        deleted_at: string | null;
        trial_ends_at: string | null;
      } | null,
      orgError,
    };
  };

  let { organization, orgError } = await fetchOrganization();

  if (orgError || !organization) {
    await tryReconcileInvitation();
    ({ organization, orgError } = await fetchOrganization());
  }

  // Do not clear active_organization_id here. A failed fetch is often RLS (invited
  // members may not SELECT organizations yet), not a bad pointer — wiping the column
  // made manual fixes and successful invites revert to null on next /dashboard load.
  if (orgError || !organization) {
    logger.warn("protected layout: organization not readable after reconcile", {
      userId: user.id,
      organizationId: profile.active_organization_id,
      message: orgError?.message,
      code: orgError?.code,
    });
    redirectToOnboardingPlan("workspace_inaccessible");
  }

  // Guard 2: Organization is pending (waiting for activation)
  if (organization.status === "pending") {
    return <PendingState />;
  }

  // Guard 2b: Organization is deleted - allow access for 30 days (export)
  if (organization.status === "deleted") {
    const deletedAt = organization.deleted_at ? new Date(organization.deleted_at) : null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (!deletedAt || deletedAt < thirtyDaysAgo) {
      redirectToOnboardingPlan("workspace_inaccessible");
    }
    return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>;
  }

  // Guard 3: Abonnement payant ou essai Stripe encore valide (trial_ends_at)
  const billingOk = hasActiveBilling({
    subscription_status: organization.subscription_status as SubscriptionStatus | null,
    trial_ends_at: organization.trial_ends_at,
  });

  if (
    organization.status === "active" &&
    !billingOk &&
    organization.subscription_status !== null
  ) {
    const trialEnded =
      organization.subscription_status === "trialing" &&
      organization.trial_ends_at &&
      new Date(organization.trial_ends_at).getTime() <= Date.now();
    return (
      <ExpiredSubscriptionState variant={trialEnded ? "trial_ended" : "default"} />
    );
  }

  // Guard 4: Organization is active with valid subscription
  return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>;
}
