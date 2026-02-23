import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReactNode } from "react";
import { PendingState } from "@/components/guards/PendingState";
import { ExpiredSubscriptionState } from "@/components/guards/ExpiredSubscriptionState";
import { ProtectedLayoutContent } from "./protected-layout-content";

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

  // Fetch profile with active organization
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, active_organization_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { id: string; active_organization_id: string | null } | null;
  if (profileError || !profile) {
    redirect("/onboarding/plan");
  }

  if (!profile.active_organization_id) {
    redirect("/onboarding/plan");
  }

  // Fetch organization with status, subscription and deleted_at
  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("id, status, subscription_status, deleted_at")
    .eq("id", profile.active_organization_id)
    .single();

  const organization = orgData as {
    id: string;
    status: string;
    subscription_status: string | null;
    deleted_at: string | null;
  } | null;
  if (orgError || !organization) {
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

  // Guard 3: Check subscription status
  const isSubscriptionActive =
    organization.subscription_status === "active" ||
    organization.subscription_status === "trialing";

  if (
    organization.status === "active" &&
    !isSubscriptionActive &&
    organization.subscription_status !== null
  ) {
    return <ExpiredSubscriptionState />;
  }

  // Guard 4: Organization is active with valid subscription
  return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>;
}
