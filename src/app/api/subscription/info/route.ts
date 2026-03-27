/**
 * API Route to get subscription info
 * Used by client components to get subscription status
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectivePlanIdForLimits } from "@/lib/billing/effective-plan";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with active organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    let currentPlan = "trial";
    let status = "trial";

    // Check organization plan first
    if (profile?.active_organization_id) {
      const { data: organization } = await supabase
        .from("organizations")
        .select("plan, status, subscription_status, trial_ends_at")
        .eq("id", profile.active_organization_id)
        .single();

      if (
        organization?.plan &&
        organization.subscription_status !== "canceled"
      ) {
        currentPlan = organization.plan;
        status = organization.subscription_status || organization.status || "pending";
      }
    }

    // Fallback: check user_subscriptions if no organization plan
    if (currentPlan === "trial") {
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("plan_id, status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription?.plan_id) {
        currentPlan = subscription.plan_id;
        status = subscription.status;
      }
    }

    // Determine if plan has an active Stripe lifecycle (portal-worthy)
    const hasActivePlan =
      currentPlan !== "trial" &&
      currentPlan !== "demo" &&
      ["active", "trialing", "past_due"].includes(status);

    let limitsPlanId = currentPlan;
    if (profile?.active_organization_id) {
      const { data: orgForLimits } = await supabase
        .from("organizations")
        .select("plan, subscription_status")
        .eq("id", profile.active_organization_id)
        .maybeSingle();
      if (orgForLimits) {
        limitsPlanId = effectivePlanIdForLimits(
          orgForLimits.plan as string,
          orgForLimits.subscription_status as string | null
        );
      }
    }

    return NextResponse.json({
      currentPlan,
      limitsPlanId,
      status,
      hasActivePlan,
    });
  } catch (error) {
    console.error("Error fetching subscription info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
