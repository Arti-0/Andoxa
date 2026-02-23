import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Créer le client service role UNE SEULE FOIS en dehors du handler
// Cela évite de créer un nouveau client à chaque requête webhook
// IMPORTANT: Utilise SECRET_KEY pour contourner RLS (pas de session utilisateur dans les webhooks)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
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

    // Utiliser le client admin (contourne RLS - pas de session utilisateur dans les webhooks)
    const supabase = supabaseAdmin;

    // Handle the event
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

        // Update organization: pending → active
        // status: métier (active = organisation fonctionnelle)
        // subscription_status: Stripe (active = abonnement Stripe actif)
        // IMPORTANT: Utiliser supabaseAdmin (service role) pour contourner RLS
        const { error: updateError, data: updatedOrg } = await supabase
          .from("organizations")
          .update({
            status: "active", // Statut métier: organisation activée
            subscription_status: "active", // Statut Stripe: abonnement actif
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId, // Important pour gestion future
            updated_at: new Date().toISOString(),
          })
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
          .single();

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

          await supabase
            .from("organizations")
            .update({
              status: organizationStatus, // Statut métier
              subscription_status: stripeSubscriptionStatus, // Statut Stripe exact
              updated_at: new Date().toISOString(),
            })
            .eq("id", org.id);
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
          .single();

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
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
