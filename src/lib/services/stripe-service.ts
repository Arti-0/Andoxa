import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/config/stripe-config';

// Initialize Stripe only if API key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export class StripeService {
  private static instance: StripeService;

  private constructor() {}

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Créer ou récupérer un customer Stripe
   */
  async createOrRetrieveCustomer(
    email: string,
    name?: string
  ): Promise<Stripe.Customer> {
    if (!stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable."
      );
    }

    try {
      // Essayer de trouver un customer existant
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        return customers.data[0];
      }

      // Créer un nouveau customer
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          source: "andoxa_app",
        },
      });

      return customer;
    } catch (error) {
      console.error("Error creating/retrieving customer:", error);
      throw error;
    }
  }

  /**
   * Récupérer un customer par ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    if (!stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable."
      );
    }

    try {
      return (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    } catch (error) {
      console.error("Error retrieving customer:", error);
      throw error;
    }
  }

  /**
   * Créer une session de checkout
   * @param quantity - Nombre de sièges (pour per-seat) ou 1 (pour organization-based)
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
    if (!stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable."
      );
    }

    try {
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: quantity,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata || {},
        allow_promotion_codes: STRIPE_CONFIG.payment.allowPromotionCodes,
        billing_address_collection: STRIPE_CONFIG.payment
          .billingAddressCollection as Stripe.Checkout.SessionCreateParams.BillingAddressCollection,
      };

      // Add trial period if specified
      if (subscriptionData?.trial_period_days) {
        sessionConfig.subscription_data = {
          trial_period_days: subscriptionData.trial_period_days,
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return session;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw error;
    }
  }

  /**
   * Créer une session de portail de facturation
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    if (!stripe) {
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable."
      );
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      throw error;
    }
  }

  /**
   * Obtenir le Price ID pour un plan et une fréquence
   */
  getPriceId(planId: string, frequency: "monthly" | "yearly"): string | null {
    const priceIds = STRIPE_CONFIG.priceIds;
    const plan = priceIds[planId as keyof typeof priceIds];
    if (!plan) return null;

    return frequency === "monthly" ? plan.monthly : plan.yearly;
  }

  /**
   * Obtenir les détails d'un plan
   */
  getPlanDetails(planId: string) {
    return STRIPE_CONFIG.plans[planId as keyof typeof STRIPE_CONFIG.plans];
  }
}

export const stripeService = StripeService.getInstance();
