import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/lib/config/stripe-config";
import {
  priceIdFor,
  normalizeBillingCadence,
  isPaidPlanId,
  type BillingCadence,
  type PaidPlan,
} from "@/lib/config/stripe-plans";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (and STRIPE_PRICE_* env vars)."
    );
  }
  return stripe;
}

export class StripeService {
  private static instance: StripeService;

  private constructor() {}

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /** Find or create a Stripe customer by email. */
  async createOrRetrieveCustomer(
    email: string,
    name?: string
  ): Promise<Stripe.Customer> {
    const stripe = requireStripe();

    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      return existing.data[0];
    }

    return stripe.customers.create({
      email,
      name,
      metadata: { source: "andoxa_app" },
    });
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    const stripe = requireStripe();
    return (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  }

  /**
   * Fetch a subscription. Used by the schedule-downgrade flow to pin the
   * effective date to `current_period_end` — Stripe is the source of truth
   * for billing cycles so we don't drift if a plan was prorated mid-cycle.
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = requireStripe();
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Create a Checkout Session for a Solo/Team subscription.
   *
   * @param priceId  Stripe price ID resolved by the caller (env-driven).
   * @param customerId Stripe customer ID.
   * @param quantity Number of seats. Solo collapses to 1; Team starts at 3.
   * @param subscriptionData Optional trial / billing options.
   */
  async createCheckoutSession(
    priceId: string,
    customerId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>,
    subscriptionData?: { trial_period_days?: number },
    quantity: number = 1
  ): Promise<Stripe.Checkout.Session> {
    const stripe = requireStripe();

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      // NB: omit payment_method_types intentionally so Stripe applies the
      // payment method configuration from the dashboard (best practice).
      line_items: [{ price: priceId, quantity }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
      allow_promotion_codes: STRIPE_CONFIG.payment.allowPromotionCodes,
      billing_address_collection: STRIPE_CONFIG.payment
        .billingAddressCollection as Stripe.Checkout.SessionCreateParams.BillingAddressCollection,
      automatic_tax: { enabled: true },
      // Persist the billing address/name captured during Checkout back onto
      // the Customer so Stripe Tax has a region on the next renewal and on
      // the Billing Portal. Required whenever automatic_tax is on AND we
      // attach an existing `customer` without an address.
      customer_update: { address: "auto", name: "auto" },
    };

    if (subscriptionData?.trial_period_days) {
      sessionConfig.subscription_data = {
        trial_period_days: subscriptionData.trial_period_days,
      };
    }

    return stripe.checkout.sessions.create(sessionConfig);
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    const stripe = requireStripe();
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Resolve the Stripe price ID for a plan + frequency.
   *
   * Plans that don't have a Stripe price (custom / trial / demo) return null.
   * The legacy `yearly` value is accepted as a synonym for `annual`.
   */
  getPriceId(
    planId: string,
    frequency: "monthly" | "yearly" | "annual"
  ): string | null {
    if (!isPaidPlanId(planId)) return null;
    const cadence: BillingCadence | null = normalizeBillingCadence(frequency);
    if (!cadence) return null;
    return priceIdFor(planId as PaidPlan, cadence);
  }
}

export const stripeService = StripeService.getInstance();
