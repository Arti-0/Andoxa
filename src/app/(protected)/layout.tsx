import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReactNode } from "react";
import { PendingState } from "@/components/guards/PendingState";
import { ExpiredSubscriptionState } from "@/components/guards/ExpiredSubscriptionState";
import { ProtectedLayoutContent } from "./protected-layout-content";
import { hasActiveBilling } from "@/lib/billing/workspace-billing";
import type { SubscriptionStatus } from "@/lib/workspace/types";
import { reconcilePendingInvitationForUser } from "@/lib/invitations/reconcile-invitation";

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
    redirect("/onboarding/plan");
  }

  let profile = profileData as ProfileRow | null;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const linkedinHintRaw = meta?.profile_url ?? meta?.linkedin_url;
  const linkedinUrlHint =
    typeof linkedinHintRaw === "string" ? linkedinHintRaw : null;

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
    redirect("/onboarding/plan");
  }

  if (!profile.active_organization_id) {
    await tryReconcileInvitation();
  }

  if (!profile.active_organization_id) {
    redirect("/onboarding/plan");
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

  if (orgError || !organization) {
    await supabase
      .from("profiles")
      .update({ active_organization_id: null })
      .eq("id", user.id);
    redirect("/onboarding/plan");
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
      redirect("/onboarding/plan");
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
