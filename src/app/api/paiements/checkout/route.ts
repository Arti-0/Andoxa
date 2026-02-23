import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { stripeService } from "@/lib/services/stripe-service";
import { STRIPE_CONFIG } from "@/lib/config/stripe-config";
import { BILLING_CONFIG } from "@/lib/config/billing-config";

type Frequency = "monthly" | "yearly";

export async function POST(request: NextRequest) {
  let planId: string | undefined;
  let frequency: Frequency = "monthly";
  let userId: string | undefined;

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

    userId = user.id;

    const body = await request.json();
    planId = body.planId;
    const bodyFrequency = body.frequency;
    frequency =
      bodyFrequency === "yearly" || bodyFrequency === "monthly"
        ? bodyFrequency
        : "monthly";

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Get price ID for the plan
    const priceId = stripeService.getPriceId(planId, frequency);
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan or frequency" },
        { status: 400 }
      );
    }

    // Get user profile, create if it doesn't exist
    let { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, active_organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      // Profile doesn't exist - create it
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("email, full_name, active_organization_id")
        .single();

      if (createError || !newProfile) {
        console.error("Error creating profile during checkout:", createError);
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }

      profile = newProfile;
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile required" }, { status: 500 });
    }

    // Get organization ID - use active_organization_id if available
    let organizationId: string | null | undefined =
      profile.active_organization_id;

    // If no active organization, check for existing pending organization first
    if (!organizationId) {
      // Check if user already has a pending organization (to reuse it)
      const { data: existingPendingOrg } = await supabase
        .from("organizations")
        .select("id, status, stripe_subscription_id, plan")
        .eq("owner_id", user.id)
        .eq("status", "pending")
        .is("stripe_subscription_id", null) // No subscription yet
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPendingOrg) {
        // Reuse existing pending organization
        organizationId = existingPendingOrg.id;

        // Update plan if different
        if (existingPendingOrg.plan !== planId) {
          await supabase.from("organizations").update({ plan: planId }).eq("id", organizationId);
        }

        // Ensure it's set as active organization
        await supabase
          .from("profiles")
          .update({ active_organization_id: organizationId })
          .eq("id", user.id);
      } else {
        // No pending organization found, create new one
        // Generate a default organization name
        const orgName = `${profile.full_name || profile.email}'s Organization`;

        // Create organization with status "pending" (will become "active" after payment)
        // subscription_status is null because no Stripe subscription exists yet
        const { data: newOrg, error: createOrgError } = await supabase
          .from("organizations")
          .insert({
            name: orgName,
            owner_id: user.id, // owner_id cannot be null
            plan: planId,
            status: "pending", // Status métier: pending until payment is confirmed
            subscription_status: null, // Pas encore d'abonnement Stripe créé
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createOrgError || !newOrg) {
          console.error("Error creating organization:", createOrgError);
          return NextResponse.json(
            { error: "Failed to create organization" },
            { status: 500 }
          );
        }

        organizationId = newOrg.id;

        // Create membership (Owner)
        const { error: membershipError } = await supabase
          .from("organization_members")
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            role: "owner",
          });

        if (membershipError) {
          console.error("Error creating membership:", membershipError);
          // Cleanup: delete the organization if membership creation fails
          await supabase
            .from("organizations")
            .delete()
            .eq("id", organizationId);
          return NextResponse.json(
            { error: "Failed to create organization membership" },
            { status: 500 }
          );
        }

        // Set as active organization in profile
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ active_organization_id: organizationId })
          .eq("id", user.id);

        if (profileUpdateError) {
          console.error("Error updating profile:", profileUpdateError);
        }
      }

      // TODO: Nettoyage périodique des organisations en pending abandonnées (> 7 jours)
      // À implémenter plus tard via un job cron ou une tâche planifiée
      // const sevenDaysAgo = new Date();
      // sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      // await supabase
      //   .from("organizations")
      //   .delete()
      //   .eq("owner_id", user.id)
      //   .eq("status", "pending")
      //   .is("stripe_subscription_id", null)
      //   .lt("created_at", sevenDaysAgo.toISOString());
    } else {
      // User has active organization, update plan if needed
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("plan, status, subscription_status")
        .eq("id", organizationId)
        .single();

      if (existingOrg) {
        // Update plan if different
        if (existingOrg.plan !== planId) {
          const updates: {
            plan: string;
            status?: string;
            subscription_status?: string | null;
          } = { plan: planId };

          // Preserve status: if org was active, keep it active. If pending, keep pending.
          if (existingOrg.status) {
            updates.status = existingOrg.status;
          }

          // Preserve subscription_status if it exists, otherwise keep null
          // Only update if organization already has a subscription
          if (existingOrg.subscription_status) {
            updates.subscription_status = existingOrg.subscription_status;
          } else {
            updates.subscription_status = null;
          }

          await supabase
            .from("organizations")
            .update(updates)
            .eq("id", organizationId);
        }
      }
    }

    // Create or retrieve Stripe customer
    // ALWAYS use organization's customer ID (facturation par organisation)
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization is required for billing" },
        { status: 400 }
      );
    }

    let customer;
    let customerId: string | null = null;

    // Get organization with customer ID
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id, name")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    customerId = org.stripe_customer_id || null;

    if (customerId) {
      customer = await stripeService.getCustomer(customerId);
    } else {
      // Create new Stripe customer for the organization
      customer = await stripeService.createOrRetrieveCustomer(
        profile.email ?? "",
        org.name || profile.full_name || undefined
      );

      // Update organization with Stripe customer ID
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ stripe_customer_id: customer.id })
        .eq("id", organizationId);

      if (updateError) {
        console.error(
          "Error updating organization with customer ID:",
          updateError
        );
        return NextResponse.json(
          { error: "Failed to update organization" },
          { status: 500 }
        );
      }
    }

    // Check organization status
    const { data: orgStatus } = await supabase
      .from("organizations")
      .select("status, subscription_status")
      .eq("id", organizationId)
      .single();

    // Organization is pending if status is "pending" (no Stripe subscription yet)
    // subscription_status is null when no subscription exists
    const isPending = orgStatus?.status === "pending";

    // Create checkout session
    // Success URL includes organization_id for webhook processing
    // Note: STRIPE_CONFIG.urls.success already contains session_id={CHECKOUT_SESSION_ID}
    // So we need to replace it and add both parameters
    const baseSuccessUrl = STRIPE_CONFIG.urls.success.replace(
      "?session_id={CHECKOUT_SESSION_ID}",
      ""
    );
    const successUrl = `${baseSuccessUrl}?organization_id=${organizationId}&session_id={CHECKOUT_SESSION_ID}`;

    // Calculate quantity based on billing model
    let quantity = 1;
    if (BILLING_CONFIG.isPerSeat()) {
      quantity = await BILLING_CONFIG.getSeatCount(organizationId);
    }

    // Prepare metadata for Stripe
    const metadata: Record<string, string> = {
      user_id: user.id,
      plan_id: planId,
      frequency: frequency,
      billing_model: BILLING_CONFIG.model,
      quantity: quantity.toString(),
    };

    if (organizationId) {
      metadata.organization_id = organizationId;
      metadata.organization_status = orgStatus?.status || "pending";
    }

    const checkoutSession = await stripeService.createCheckoutSession(
      priceId,
      customer.id,
      successUrl,
      STRIPE_CONFIG.urls.cancel,
      metadata,
      // Don't add Stripe trial period - we handle trials in our database
      undefined,
      quantity
    );

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error, {
      planId,
      frequency,
      userId,
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
