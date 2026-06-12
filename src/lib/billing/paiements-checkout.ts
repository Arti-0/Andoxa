import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripeService } from "@/lib/services/stripe-service";
import { STRIPE_CONFIG } from "@/lib/config/stripe-config";
import {
  clampSeats,
  normalizeBillingCadence,
  normalizeMarketingPaidPlanSlug,
  priceIdFor,
  type BillingCadence,
  type PaidPlan,
} from "@/lib/config/stripe-plans";
import { formatDefaultOrganizationName } from "@/lib/organizations/default-org-name";
import type { Database } from "@/lib/types/supabase";

function slugifyOrganizationName(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "espace";
}

export type PaiementsCheckoutResult =
  | { ok: true; mode: "stripe"; sessionId: string; url: string | null }
  | { ok: true; mode: "trial"; redirectUrl: string; trialEndsAt: string }
  | { ok: false; httpStatus: number; payload: Record<string, unknown> };

/**
 * Shared implementation for POST /api/paiements/checkout and marketing links
 * that hit GET /api/paiements/checkout (after the user is authenticated).
 */
export async function performPaiementsCheckout(params: {
  supabase: SupabaseClient<Database>;
  user: User;
  /** From JSON `planId` or query `plan` / `planId`. */
  planRaw: string | undefined;
  billingRaw?: unknown;
  frequencyRaw?: unknown;
  seats?: number;
}): Promise<PaiementsCheckoutResult> {
  const { supabase, user, planRaw, billingRaw, frequencyRaw, seats } = params;

  let billing: BillingCadence = "annual";
  const cadence =
    normalizeBillingCadence(
      typeof billingRaw === "string" ? billingRaw : undefined
    ) ??
    normalizeBillingCadence(
      typeof frequencyRaw === "string" ? frequencyRaw : undefined
    );
  if (cadence) billing = cadence;

  const planNorm = normalizeMarketingPaidPlanSlug(planRaw);
  const rawLower = (planRaw ?? "").trim().toLowerCase();

  if (!planRaw?.trim()) {
    return { ok: false, httpStatus: 400, payload: { error: "Plan ID is required" } };
  }
  if (rawLower === "custom") {
    return {
      ok: false,
      httpStatus: 400,
      payload: {
        error:
          "Le plan Custom est contractuel — utilisez le formulaire de contact pour démarrer.",
        contact_url: "/contact?objet=custom",
      },
    };
  }
  if (!planNorm) {
    return { ok: false, httpStatus: 400, payload: { error: "Invalid plan" } };
  }

  const planId: PaidPlan = planNorm;

  const priceId = priceIdFor(planId, billing);
  if (!priceId) {
    console.error("[checkout] Missing Stripe price ID env var", { planId, billing });
    return {
      ok: false,
      httpStatus: 503,
      payload: {
        error:
          "Le paiement est temporairement indisponible. Réessayez dans quelques minutes ou contactez le support.",
      },
    };
  }

  const quantity = clampSeats(planId, seats);

  let { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
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
      return {
        ok: false,
        httpStatus: 500,
        payload: { error: "Failed to create user profile" },
      };
    }
    profile = newProfile;
  }

  let organizationId: string | null | undefined = profile.active_organization_id;

  if (!organizationId) {
    const { data: existingPendingOrg } = await supabase
      .from("organizations")
      .select("id, status, stripe_subscription_id, plan")
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .is("stripe_subscription_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPendingOrg) {
      organizationId = existingPendingOrg.id;

      if (existingPendingOrg.plan !== planId) {
        await supabase
          .from("organizations")
          .update({ plan: planId })
          .eq("id", organizationId);
      }

      await supabase
        .from("profiles")
        .update({ active_organization_id: organizationId })
        .eq("id", user.id);
    } else {
      const orgName = formatDefaultOrganizationName(
        profile.full_name || profile.email || ""
      );
      const baseSlug = slugifyOrganizationName(orgName);
      const fallbackSlug = `${baseSlug}-${user.id.slice(0, 8)}`.slice(0, 48);
      const now = new Date().toISOString();

      let { data: newOrg, error: createOrgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          slug: baseSlug,
          owner_id: user.id,
          plan: planId,
          status: "pending",
          subscription_status: null,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      // If slug is already taken, retry once with a deterministic suffix.
      if (createOrgError?.code === "23505") {
        const retry = await supabase
          .from("organizations")
          .insert({
            name: orgName,
            slug: fallbackSlug,
            owner_id: user.id,
            plan: planId,
            status: "pending",
            subscription_status: null,
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();
        newOrg = retry.data;
        createOrgError = retry.error;
      }

      if (createOrgError || !newOrg) {
        console.error("Error creating organization:", createOrgError);
        return {
          ok: false,
          httpStatus: 500,
          payload: { error: "Failed to create organization" },
        };
      }

      organizationId = newOrg.id;

      const { error: membershipError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          role: "owner",
        });

      if (membershipError) {
        console.error("Error creating membership:", membershipError);
        await supabase.from("organizations").delete().eq("id", organizationId);
        return {
          ok: false,
          httpStatus: 500,
          payload: { error: "Failed to create organization membership" },
        };
      }

      await supabase
        .from("profiles")
        .update({ active_organization_id: organizationId })
        .eq("id", user.id);
    }
  } else {
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("plan, status, subscription_status")
      .eq("id", organizationId)
      .single();

    if (existingOrg && existingOrg.plan !== planId) {
      await supabase
        .from("organizations")
        .update({
          plan: planId,
          status: existingOrg.status ?? "pending",
          subscription_status: existingOrg.subscription_status ?? null,
        })
        .eq("id", organizationId);
    }
  }

  if (!organizationId) {
    return {
      ok: false,
      httpStatus: 400,
      payload: { error: "Organization is required for billing" },
    };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id, name")
    .eq("id", organizationId)
    .single();

  if (!org) {
    return { ok: false, httpStatus: 404, payload: { error: "Organization not found" } };
  }

  let customer;
  if (org.stripe_customer_id) {
    customer = await stripeService.getCustomer(org.stripe_customer_id);
  } else {
    customer = await stripeService.createOrRetrieveCustomer(
      profile.email ?? "",
      org.name || profile.full_name || undefined
    );

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ stripe_customer_id: customer.id })
      .eq("id", organizationId);

    if (updateError) {
      console.error("Error updating organization with customer ID:", updateError);
      return {
        ok: false,
        httpStatus: 500,
        payload: { error: "Failed to update organization" },
      };
    }
  }

  const { data: orgStatus } = await supabase
    .from("organizations")
    .select("status, subscription_status, trial_ends_at, stripe_subscription_id")
    .eq("id", organizationId)
    .single();

  // No-card instant trial — currently granted on both Solo and Team (the
  // Team trial will be retired once sign-ups ramp up; flip back to
  // `planId === "solo"` at that point).
  if ((planId === "solo" || planId === "team") && STRIPE_CONFIG.trial.enabled) {
    const trialAlreadyUsed = Boolean(orgStatus?.trial_ends_at);
    const hasExistingStripeSub = Boolean(orgStatus?.stripe_subscription_id);

    if (!trialAlreadyUsed && !hasExistingStripeSub) {
      const trialEndsAt = new Date(
        Date.now() + STRIPE_CONFIG.trial.durationDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const { error: trialErr } = await supabase
        .from("organizations")
        .update({
          plan: planId,
          status: "active",
          subscription_status: "trialing",
          trial_ends_at: trialEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (trialErr) {
        console.error("Error starting organization trial:", trialErr, {
          organizationId,
          userId: user.id,
        });
        return { ok: false, httpStatus: 500, payload: { error: "Failed to start trial" } };
      }

      return {
        ok: true,
        mode: "trial",
        redirectUrl: "/dashboard?trial=started",
        trialEndsAt,
      };
    }
  }

  const baseSuccessUrl = STRIPE_CONFIG.urls.success.replace(
    "?session_id={CHECKOUT_SESSION_ID}",
    ""
  );
  const successUrl = `${baseSuccessUrl}?organization_id=${organizationId}&session_id={CHECKOUT_SESSION_ID}`;

  const metadata: Record<string, string> = {
    user_id: user.id,
    plan_id: planId,
    billing,
    seats: String(quantity),
    organization_id: organizationId,
    organization_status: orgStatus?.status || "pending",
  };

  // Only attach a Stripe trial when the global flag is on AND this org
  // hasn't already burnt its trial. Once `TRIAL_ENABLED=false`, every
  // checkout — Solo or Team — goes straight to a paid subscription.
  const subscriptionTrialData =
    STRIPE_CONFIG.trial.enabled &&
    (planId === "solo" || !orgStatus?.trial_ends_at)
      ? { trial_period_days: STRIPE_CONFIG.trial.durationDays }
      : undefined;

  const checkoutSession = await stripeService.createCheckoutSession(
    priceId,
    customer.id,
    successUrl,
    STRIPE_CONFIG.urls.cancel,
    metadata,
    subscriptionTrialData,
    quantity
  );

  return {
    ok: true,
    mode: "stripe",
    sessionId: checkoutSession.id,
    url: checkoutSession.url ?? null,
  };
}
