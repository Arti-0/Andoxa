import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/service";
import Stripe from "stripe";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

/**
 * POST /api/paiements/confirm-checkout
 * Client-side recovery when the user hits /success before the Stripe webhook updates the DB.
 * Idempotent with checkout.session.completed webhook (same org update).
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    const stripe = getStripe();
    if (!stripe) {
      throw Errors.internal("Stripe not configured");
    }

    const body = await parseBody<{
      session_id?: string;
      organization_id?: string;
    }>(req);

    const sessionId = body.session_id?.trim();
    if (!sessionId) {
      throw Errors.validation({ session_id: "Requis" });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
    } catch (e) {
      console.error("[confirm-checkout] retrieve session", e);
      throw Errors.badRequest("Session de paiement introuvable ou invalide.");
    }

    if (session.status !== "complete") {
      return {
        organization_id: session.metadata?.organization_id ?? null,
        status: "pending" as const,
        reason: "session_not_complete",
      };
    }

    const paymentOk =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";
    if (!paymentOk) {
      throw Errors.badRequest("Paiement non confirmé pour cette session.");
    }

    const organizationId = session.metadata?.organization_id;
    const metadataUserId = session.metadata?.user_id;

    if (!organizationId) {
      throw Errors.badRequest("Session sans organisation associée.");
    }

    if (metadataUserId && metadataUserId !== ctx.userId) {
      throw Errors.forbidden("Cette session ne correspond pas à votre compte.");
    }

    if (body.organization_id && body.organization_id !== organizationId) {
      throw Errors.badRequest("Identifiant d'organisation incohérent avec la session.");
    }

    const { data: membership } = await ctx.supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (!membership) {
      throw Errors.forbidden("Vous n'êtes pas membre de cette organisation.");
    }

    const subscriptionRaw = session.subscription;
    const subscriptionId =
      typeof subscriptionRaw === "string"
        ? subscriptionRaw
        : subscriptionRaw && typeof subscriptionRaw === "object"
          ? subscriptionRaw.id
          : null;

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer && typeof session.customer === "object"
          ? session.customer.id
          : null;

    if (!subscriptionId) {
      return {
        organization_id: organizationId,
        status: "pending" as const,
        reason: "subscription_not_ready",
      };
    }

    let stripeSubscriptionStatus: Stripe.Subscription.Status = "active";
    let trialEndsAtIso: string | null = null;
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      stripeSubscriptionStatus = sub.status;
      trialEndsAtIso =
        sub.trial_end != null
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;
    } catch (subErr) {
      console.error("[confirm-checkout] retrieve subscription", subErr);
    }

    const supabase = createServiceClient();
    const { error: updateError, data: updatedOrg } = await supabase
      .from("organizations")
      .update({
        status: "active",
        subscription_status: stripeSubscriptionStatus,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        trial_ends_at: trialEndsAtIso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .select("status")
      .single();

    if (updateError) {
      console.error("[confirm-checkout] org update", updateError);
      throw Errors.internal("Impossible d'activer l'organisation.");
    }

    const status = (updatedOrg as { status?: string } | null)?.status ?? "active";

    return {
      organization_id: organizationId,
      status,
      reason: null as string | null,
    };
  },
  {
    requireWorkspace: false,
    rateLimit: { name: "confirm-checkout", requests: 30, window: "1 m" },
  }
);
