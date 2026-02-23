import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReactNode } from "react";

/**
 * Onboarding Layout - For users without a valid organization
 *
 * Redirect to dashboard ONLY if the user has an organization that is:
 * - existing and accessible
 * - active with valid subscription, OR pending, OR deleted within 30 days
 *
 * If active_organization_id points to a non-existent or invalid org, we stay
 * on onboarding so the user can pick a plan (avoids redirect loop with protected layout).
 */
export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { active_organization_id?: string | null } | null;
  const orgId = profile?.active_organization_id;

  if (orgId) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("id, status, subscription_status, deleted_at")
      .eq("id", orgId)
      .single();

    const org = orgData as {
      id: string;
      status: string;
      subscription_status: string | null;
      deleted_at: string | null;
    } | null;

    if (org) {
      const isSubscriptionActive =
        org.subscription_status === "active" || org.subscription_status === "trialing";

      const canAccessDashboard =
        org.status === "pending" ||
        (org.status === "active" && (isSubscriptionActive || org.subscription_status === null)) ||
        (org.status === "deleted" &&
          org.deleted_at != null &&
          new Date(org.deleted_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

      if (canAccessDashboard) {
        redirect("/dashboard");
      }
    }
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {children}
    </div>
  );
}
