import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function GET(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  try {
    // Retrieve session with expanded subscription to get full details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Extract subscription ID - can be string or Subscription object
    let subscriptionId: string | null = null;
    if (session.subscription) {
      subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;
    }

    return NextResponse.json({
      payment_status: session.payment_status,
      subscription_id: subscriptionId,
      customer_id: session.customer as string | null,
      mode: session.mode, // 'subscription' or 'payment'
    });
  } catch (error) {
    console.error("Error retrieving session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
