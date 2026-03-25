/**
 * Configuration Stripe pour Andoxa
 * Price IDs réels depuis votre dashboard Stripe
 *
 * Les Price IDs changent automatiquement selon l'environnement :
 * - Mode Test (sk_test_...) : utilise les Price IDs de test
 * - Mode Live (sk_live_...) : utilise les Price IDs de production
 *
 * IMPORTANT: Le mode est déterminé dynamiquement au runtime pour éviter
 * les problèmes de build-time vs runtime en Next.js.
 */

// Détecter le mode Stripe depuis la variable d'environnement (au runtime)
export function getStripeMode(): "test" | "live" {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  return secretKey.startsWith("sk_live_") ? "live" : "test";
}

// Price IDs de TEST (pour développement local)
const TEST_PRICE_IDS = {
  essential: {
    monthly: "price_1SPwt8PhdSPFTXqczocLyr1s", // À remplacer par vos Price IDs de test
    yearly: "price_1SPwvHPhdSPFTXqca5eHfX3W",
  },
  pro: {
    monthly: "price_1SPwtePhdSPFTXqcMHdAxH3J",
    yearly: "price_1SPwwJPhdSPFTXqck2xwJ1kp",
  },
  business: {
    monthly: "price_1SPwunPhdSPFTXqcTg4cDSZf",
    yearly: "price_1SPwxYPhdSPFTXqctFcprbaR",
  },
} as const;

// Price IDs de PRODUCTION (Live)
const LIVE_PRICE_IDS = {
  essential: {
    monthly: "price_1SczUIBUKpR7zRPPH0rcEsz3",
    yearly: "price_1SczUDBUKpR7zRPPfusixbX5",
  },
  pro: {
    monthly: "price_1SczUGBUKpR7zRPP1MIUlMDo",
    yearly: "price_1SczUBBUKpR7zRPPJGOh8VOf",
  },
  business: {
    monthly: "price_1SczUFBUKpR7zRPPoqaj7vGQ",
    yearly: "price_1SczU6BUKpR7zRPP6jxYNlbM",
  },
} as const;

// Getter dynamique pour les Price IDs (évalué au runtime)
function getPriceIds() {
  const mode = getStripeMode();
  return mode === "live" ? LIVE_PRICE_IDS : TEST_PRICE_IDS;
}

export const STRIPE_CONFIG = {
  // Price IDs selon l'environnement (test ou live) - évalué dynamiquement
  get priceIds() {
    return getPriceIds();
  },

  // Configuration des plans
  plans: {
    trial: {
      id: "trial",
      name: "Essai Gratuit",
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        "Jusqu'à 200 prospects",
        "Campagnes email basiques",
        "100 crédits d'enrichissement",
        "KPI de campagne",
        "Gestion des tâches",
        "Support communautaire",
      ],
      limits: {
        users: 1,
        workspaces: 1,
        prospects: 200,
        emails: 1000,
        enrichmentCredits: 100,
      },
    },
    essential: {
      id: "essential",
      name: "Essential",
      priceMonthly: 2900, // 29€ en centimes
      priceYearly: 27900, // 279€ en centimes (remise 20%)
      features: [
        "Jusqu'à 500 prospects",
        "Campagnes email",
        "KPIs de campagne",
        "Support email",
      ],
      limits: {
        users: 1,
        workspaces: 1,
        prospects: 500,
        emails: 10000,
        enrichmentCredits: 0,
      },
    },

    pro: {
      id: "pro",
      name: "Pro",
      priceMonthly: 9900, // 99€ en centimes
      priceYearly: 95000, // 950€ en centimes (remise 20%)
      features: [
        "Prospects illimités",
        "Campagnes email",
        "500 crédits d'enrichissement",
        "KPIs de campagne",
        "Calendrier intégré",
        "Analytics de base",
        "Support prioritaire",
      ],
      limits: {
        users: 5,
        workspaces: 3,
        prospects: -1, // Illimité
        emails: 50000,
        enrichmentCredits: 500,
      },
    },
    business: {
      id: "business",
      name: "Business",
      priceMonthly: 17900, // 179€ en centimes
      priceYearly: 171800, // 1718€ en centimes (remise 20%)
      features: [
        "Prospects illimités",
        "1000 crédits d'enrichissement",
        "Analytics détaillés",
        "Notifications intelligentes",
        "Support prioritaire",
      ],
      limits: {
        users: 10,
        workspaces: 5,
        prospects: -1, // Illimité
        emails: -1, // Illimité
        enrichmentCredits: 1000,
      },
    },
  },

  // URLs de redirection
  urls: {
    success: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    billing: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  },

  // Configuration des paiements
  payment: {
    currency: "eur",
    billingAddressCollection: "required",
    allowPromotionCodes: true,
  },

  // Configuration des essais
  trial: {
    durationDays: 14,
    maxPerDomain: 1,
  },
} as const;

// Types TypeScript
export type PlanId = keyof typeof STRIPE_CONFIG.plans;

// Type pour les Price IDs (union des clés de TEST_PRICE_IDS et LIVE_PRICE_IDS)
// Les deux ont la même structure, donc on peut utiliser l'un ou l'autre
export type PriceId = keyof typeof TEST_PRICE_IDS;

// Utility functions
export function isValidPriceId(priceId: string): boolean {
  // Vérifier dans les deux sets de Price IDs (test et live)
  const testPriceIds = Object.values(TEST_PRICE_IDS).flatMap((plan) =>
    Object.values(plan)
  );
  const livePriceIds = Object.values(LIVE_PRICE_IDS).flatMap((plan) =>
    Object.values(plan)
  );
  const allPriceIds = [...testPriceIds, ...livePriceIds];
  return (allPriceIds as string[]).includes(priceId);
}

export function getPlanByPriceId(priceId: string): PlanId | null {
  if (!isValidPriceId(priceId)) {
    return null;
  }

  // Vérifier dans les Price IDs actuels (selon le mode runtime)
  const currentPriceIds = getPriceIds();

  // Check essential prices
  if (
    priceId === currentPriceIds.essential.monthly ||
    priceId === currentPriceIds.essential.yearly ||
    priceId === TEST_PRICE_IDS.essential.monthly ||
    priceId === TEST_PRICE_IDS.essential.yearly ||
    priceId === LIVE_PRICE_IDS.essential.monthly ||
    priceId === LIVE_PRICE_IDS.essential.yearly
  ) {
    return "essential";
  }

  // Check pro prices
  if (
    priceId === currentPriceIds.pro.monthly ||
    priceId === currentPriceIds.pro.yearly ||
    priceId === TEST_PRICE_IDS.pro.monthly ||
    priceId === TEST_PRICE_IDS.pro.yearly ||
    priceId === LIVE_PRICE_IDS.pro.monthly ||
    priceId === LIVE_PRICE_IDS.pro.yearly
  ) {
    return "pro";
  }

  // Check business prices
  if (
    priceId === currentPriceIds.business.monthly ||
    priceId === currentPriceIds.business.yearly ||
    priceId === TEST_PRICE_IDS.business.monthly ||
    priceId === TEST_PRICE_IDS.business.yearly ||
    priceId === LIVE_PRICE_IDS.business.monthly ||
    priceId === LIVE_PRICE_IDS.business.yearly
  ) {
    return "business";
  }

  return null;
}

// Alias for backward compatibility
export const getPlanIdFromConfig = getPlanByPriceId;