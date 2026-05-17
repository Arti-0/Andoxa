import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { performPaiementsCheckout } from "@/lib/billing/paiements-checkout";

/**
 * POST /api/paiements/checkout
 *
 * Authenticated entry-point used by `/onboarding/plan` (and any in-app upgrade
 * CTA) to start a Stripe Checkout session against the user's organization.
 *
 * Body:
 *   {
 *     planId   : "solo" | "team" | legacy aliases essential/pro/business,
 *     billing? : "monthly" | "annual" | "yearly",
 *     seats?   : number               // Team only, clamped 3..20
 *   }
 *
 * GET /api/paiements/checkout?plan=solo|team&billing=monthly|annual&seats=N
 *
 * Same behavior as POST for logged-in browsers (used by `/checkout` after auth).
 */
export async function POST(request: NextRequest) {
  let planId: string | undefined;
  let billing: unknown;
  let frequency: unknown;
  let seats: number | undefined;
  let userId: string | undefined;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const body = await request.json();
    planId =
      typeof body.planId === "string"
        ? body.planId
        : typeof body.plan === "string"
          ? body.plan
          : undefined;
    seats = typeof body.seats === "number" ? body.seats : undefined;
    billing = body.billing;
    frequency = body.frequency;

    const result = await performPaiementsCheckout({
      supabase,
      user,
      planRaw: planId,
      billingRaw: billing,
      frequencyRaw: frequency,
      seats,
    });

    if (!result.ok) {
      return NextResponse.json(result.payload, { status: result.httpStatus });
    }
    if (result.mode === "trial") {
      return NextResponse.json({
        redirect_url: result.redirectUrl,
        trial_started: true,
        trial_ends_at: result.trialEndsAt,
      });
    }
    return NextResponse.json({
      sessionId: result.sessionId,
      url: result.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error, {
      planId,
      billing,
      seats,
      userId,
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const planRaw =
    searchParams.get("plan") ?? searchParams.get("planId") ?? undefined;
  const billing = searchParams.get("billing") ?? undefined;
  const frequency = searchParams.get("frequency") ?? undefined;
  const seatsRaw = searchParams.get("seats");
  const seats =
    seatsRaw != null && seatsRaw.trim() !== "" ? Number(seatsRaw) : undefined;

  const loginNext = `/checkout${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?next=${encodeURIComponent(loginNext)}`,
          request.url
        )
      );
    }

    const result = await performPaiementsCheckout({
      supabase,
      user,
      planRaw,
      billingRaw: billing,
      frequencyRaw: frequency ?? billing,
      seats: Number.isFinite(seats) ? seats : undefined,
    });

    if (!result.ok) {
      const msg =
        typeof result.payload.error === "string"
          ? result.payload.error
          : "checkout_error";
      return NextResponse.redirect(
        new URL(
          `/pricing?checkout_error=${encodeURIComponent(msg)}`,
          request.url
        )
      );
    }

    if (result.mode === "trial") {
      return NextResponse.redirect(new URL(result.redirectUrl, request.url));
    }

    if (!result.url) {
      return NextResponse.redirect(
        new URL("/pricing?checkout_error=missing_session", request.url)
      );
    }

    return NextResponse.redirect(result.url, 303);
  } catch (error) {
    console.error("[GET /api/paiements/checkout]", error);
    return NextResponse.redirect(
      new URL("/pricing?checkout_error=server", request.url)
    );
  }
}
