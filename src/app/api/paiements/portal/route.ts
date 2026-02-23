import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripeService } from "@/lib/services/stripe-service";
import { STRIPE_CONFIG } from "@/lib/config/stripe-config";

export async function POST() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with active organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.active_organization_id) {
      return NextResponse.json(
        { error: "No active organization found. Please create an organization first." },
        { status: 404 }
      );
    }

    // Get organization with Stripe customer ID
    // Facturation toujours basée sur l'organisation
    const { data: organization } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", profile.active_organization_id)
      .single();

    if (!organization?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please subscribe to a plan first." },
        { status: 404 }
      );
    }

    const customerId = organization.stripe_customer_id;

    // Create billing portal session
    const session = await stripeService.createBillingPortalSession(
      customerId,
      STRIPE_CONFIG.urls.billing
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
