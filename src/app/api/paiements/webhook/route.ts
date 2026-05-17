import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from '@/lib/supabase/service';
import Stripe from 'stripe';
import {
  normalizeMarketingPaidPlanSlug,
  resolvePriceId,
} from "@/lib/config/stripe-plans";
import { insertWebhookDedupe } from "@/lib/webhooks/dedupe";
import type { Database } from "@/lib/types/supabase";

type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

// Initialize Stripe lazily (not at module load) so build can succeed without env vars
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !endpointSecret) {
    console.error(
      "Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables."
    );
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Idempotency: Stripe retries on non-2xx and occasionally redelivers successful
    // events. Insert the event_id; if it was already there, ack and skip.
    const dedupeResult = await insertWebhookDedupe(supabase, "stripe", event.id);
    if (dedupeResult === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (dedupeResult === "error") {
      // DB error: surface so Stripe retries.
      Sentry.captureMessage("Stripe webhook dedupe insert failed", {
        level: "error",
        extra: { eventId: event.id, eventType: event.type },
      });
      return NextResponse.json(
        { error: "Dedupe failure" },
        { status: 500 }
      );
    }

    console.log(`[Webhook] Received event: ${event.type}`, {
      eventId: event.id,
      livemode: event.livemode,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organization_id;

        console.log("[Webhook] checkout.session.completed", {
          sessionId: session.id,
          organizationId,
          paymentStatus: session.payment_status,
          subscriptionId: session.subscription,
          customerId: session.customer,
          metadata: session.metadata,
        });

        if (!organizationId) {
          console.warn("[Webhook] No organization_id in checkout session metadata", {
            sessionId: session.id,
            metadata: session.metadata,
          });
          break;
        }

        // Get subscription ID and customer ID from session
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!subscriptionId) {
          console.warn("[Webhook] No subscription_id in session", {
            sessionId: session.id,
            organizationId,
            paymentStatus: session.payment_status,
          });
          break;
        }

        let stripeSubscriptionStatus: Stripe.Subscription.Status = "active";
        let trialEndsAtIso: string | null = null;
        let resolvedPlan: string | null = null;
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          stripeSubscriptionStatus = sub.status;
          trialEndsAtIso =
            sub.trial_end != null
              ? new Date(sub.trial_end * 1000).toISOString()
              : null;

          // Resolve the plan id from the price actually subscribed to.
          // Prefer this over `session.metadata.plan_id` so users who upgrade
          // via the Stripe customer portal also see their `organizations.plan`
          // column updated correctly.
          const firstItem = sub.items?.data?.[0];
          const priceId = firstItem?.price?.id ?? null;
          const mapped = resolvePriceId(priceId);
          if (mapped) {
            resolvedPlan = mapped.plan;
          } else if (typeof session.metadata?.plan_id === "string") {
            resolvedPlan =
              normalizeMarketingPaidPlanSlug(session.metadata.plan_id) ??
              session.metadata.plan_id;
          }
        } catch (subErr) {
          console.error("[Webhook] Failed to retrieve subscription after checkout", {
            subscriptionId,
            organizationId,
            error: subErr,
          });
        }

        const orgUpdate: OrganizationUpdate = {
          status: "active",
          subscription_status: stripeSubscriptionStatus,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          trial_ends_at: trialEndsAtIso,
          updated_at: new Date().toISOString(),
        };
        if (resolvedPlan) {
          orgUpdate.plan = resolvedPlan;
        }

        const { error: updateError, data: updatedOrg } = await supabase
          .from("organizations")
          .update(orgUpdate)
          .eq("id", organizationId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating organization after payment:", updateError, {
            organizationId,
            sessionId: session.id,
          });
        } else {
          console.log("Organization activated after payment", {
            organizationId,
            sessionId: session.id,
            subscriptionId,
            updatedStatus: updatedOrg?.status,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find organization by subscription ID
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (org) {
          // Map Stripe subscription status to our organization status
          // status: métier (active/suspended)
          // subscription_status: reflète exactement le statut Stripe
          let organizationStatus = "active";
          const stripeSubscriptionStatus = subscription.status;

          // Map Stripe status to our business status
          if (stripeSubscriptionStatus === "canceled" || stripeSubscriptionStatus === "unpaid") {
            organizationStatus = "suspended"; // Organisation suspendue
          } else if (stripeSubscriptionStatus === "past_due") {
            organizationStatus = "active"; // Garde active mais marque comme past_due dans subscription_status
          } else if (stripeSubscriptionStatus === "active" || stripeSubscriptionStatus === "trialing") {
            organizationStatus = "active"; // Organisation active
          }

          const trialEndsAtIso =
            subscription.trial_end != null
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null;

          // Mirror plan upgrades made through the Stripe customer portal
          // (e.g. Solo → Team) onto `organizations.plan`.
          const firstItem = subscription.items?.data?.[0];
          const priceId = firstItem?.price?.id ?? null;
          const mapped = resolvePriceId(priceId);

          const orgUpdate: OrganizationUpdate = {
            status: organizationStatus,
            subscription_status: stripeSubscriptionStatus,
            trial_ends_at: trialEndsAtIso,
            updated_at: new Date().toISOString(),
          };
          if (mapped) {
            orgUpdate.plan = mapped.plan;
          }

          await supabase
            .from("organizations")
            .update(orgUpdate)
            .eq("id", org.id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const rawSub = (invoice as unknown as { subscription?: unknown })
          .subscription;
        const subscriptionId = typeof rawSub === "string" ? rawSub : null;

        if (!subscriptionId) {
          console.warn("[Webhook] invoice.payment_failed without subscription", {
            invoiceId: invoice.id,
          });
          break;
        }

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (org) {
          await supabase
            .from("organizations")
            .update({
              subscription_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", org.id);

          console.log("[Webhook] Marked organization past_due", {
            organizationId: org.id,
            invoiceId: invoice.id,
            subscriptionId,
          });
        } else {
          // Subscription not in our DB — log to Sentry but ack so Stripe stops retrying.
          Sentry.captureMessage(
            "Stripe invoice.payment_failed for unknown subscription",
            {
              level: "warning",
              extra: { invoiceId: invoice.id, subscriptionId },
            }
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find organization by subscription ID
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (org) {
          // Mark organization as suspended (subscription canceled)
          // status: métier (suspended = organisation désactivée)
          // subscription_status: Stripe (canceled = abonnement annulé)
          await supabase
            .from("organizations")
            .update({
              status: "suspended", // Statut métier: organisation suspendue
              subscription_status: "canceled", // Statut Stripe: abonnement annulé
              updated_at: new Date().toISOString(),
            })
            .eq("id", org.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
