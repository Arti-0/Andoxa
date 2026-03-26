"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { cn } from "../../../../src/lib/utils";
import Balancer from "react-wrap-balancer";
import { Check, ArrowRight, Star, Loader2 } from "lucide-react";
// import { UpgradeButton } from "@/components/ui/UpgradeButton"; // Currently unused
import Link from "next/link";
import React from "react";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import {
  useSubscription,
  type SubscriptionInfo,
} from "@/hooks/use-subscription";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { PlanId } from "@/lib/config/stripe-config";
import { getPlanConfig, getPlanLimits, type PlanId as PlanConfigId } from "@/lib/config/plans-config";

type FixedPrice = string;

interface VariablePrice {
  mensuel: string;
  annuel: string;
}

interface Plan {
  name: string;
  price: FixedPrice | VariablePrice;
  description: string;
  capacity: string[];
  features: string[];
  isStarter: boolean;
  isRecommended: boolean;
  buttonText: string;
  buttonLink: string;
  badge?: string;
}

type BillingFrequency = "mensuel" | "annuel";
type Frequency = "monthly" | "yearly";

// Pricing configuration - centralized and maintainable
const PRICING_CONFIG = {
  essential: {
    monthly: 29, // Prix réel après période d'essai
    annual: 279, // Prix réel après période d'essai
    discount: 0.2, // 20% discount for annual
  },
  pro: {
    monthly: 99,
    annual: 950,
    discount: 0.2,
  },
  business: {
    monthly: 179,
    annual: 1718,
    discount: 0.2,
  },
} as const;

type PlanKey = keyof typeof PRICING_CONFIG;

// Helper function to calculate monthly equivalent with discount
const calculateMonthlyEquivalent = (annualPrice: number): number => {
  return Math.round(annualPrice / 12);
};

// Helper function to format price
const formatPrice = (price: number): string => `${price}€`;

// Générer les plans depuis la configuration centralisée
const plans: Plan[] = [
  (() => {
    const config = getPlanConfig("essential");
    const limits = config.limits;
    const capacityText = limits.users === -1 
      ? "Utilisateurs illimités" 
      : limits.users === 1 
        ? "1 utilisateur"
        : `${limits.users} utilisateurs`;
    
    return {
      name: config.name,
    price: {
      mensuel: formatPrice(PRICING_CONFIG.essential.monthly),
      annuel: formatPrice(PRICING_CONFIG.essential.annual),
    },
      description: config.description,
      capacity: [capacityText],
      features: config.features.features,
    isStarter: false,
      isRecommended: config.isRecommended || false,
    buttonText: "✨ 14 jours gratuits",
    buttonLink: "/auth/login",
    badge: undefined,
    };
  })(),
  (() => {
    const config = getPlanConfig("pro");
    const limits = config.limits;
    const capacityText = limits.users === -1 
      ? "Utilisateurs illimités" 
      : limits.users === 1 
        ? "1 utilisateur"
        : `${limits.users} utilisateurs`;
    
    return {
      name: config.name,
    price: {
      mensuel: formatPrice(PRICING_CONFIG.pro.monthly),
      annuel: formatPrice(PRICING_CONFIG.pro.annual),
    },
      description: config.description,
      capacity: [capacityText],
      features: config.features.features,
    isStarter: false,
      isRecommended: config.isRecommended || false,
    buttonText: "Commencez maintenant",
    buttonLink: "/auth/login",
    badge: "",
    };
  })(),
  (() => {
    const config = getPlanConfig("business");
    const limits = config.limits;
    const capacityText = limits.users === -1 
      ? "Utilisateurs illimités" 
      : limits.users === 1 
        ? "1 utilisateur"
        : `Jusqu'à ${limits.users} utilisateurs`;
    
    return {
      name: config.name,
    price: {
      mensuel: formatPrice(PRICING_CONFIG.business.monthly),
      annuel: formatPrice(PRICING_CONFIG.business.annual),
    },
      description: config.description,
      capacity: [capacityText],
      features: config.features.features,
    isStarter: false,
      isRecommended: config.isRecommended || false,
    buttonText: "Commencez maintenant",
    buttonLink: "/auth/login",
    };
  })(),
];

// const features = [
//   {
//     name: "Gestion des prospects",
//     icon: User,
//     description: "Centralisez et suivez tous vos prospects en un seul endroit",
//   },
//   {
//     name: "Campagnes email",
//     icon: Mail,
//     description:
//       "Automatisez vos campagnes marketing et suivez les performances",
//   },
//   {
//     name: "Calendrier intégré",
//     icon: Calendar,
//     description: "Planifiez vos rendez-vous et synchronisez avec vos outils",
//   },
//   {
//     name: "Analytics avancés",
//     icon: BarChart3,
//     description: "Tableaux de bord personnalisables avec KPIs en temps réel",
//   },
//   {
//     name: "Sécurité renforcée",
//     icon: Shield,
//     description:
//       "Vos données sont protégées avec un chiffrement de niveau entreprise",
//   },
// ];

const isVariablePrice = (
  price: FixedPrice | VariablePrice
): price is VariablePrice => {
  return (price as VariablePrice).mensuel !== undefined;
};

// Helper functions with strict typing
const PLAN_ID_MAP: Record<string, PlanId> = {
  Essential: "essential",
  Pro: "pro",
  Business: "business",
} as const;

function getPlanId(planName: string): PlanId | null {
  return (PLAN_ID_MAP[planName] as PlanId) || null;
}

function getFrequency(billingFrequency: BillingFrequency): Frequency {
  return billingFrequency === "mensuel" ? "monthly" : "yearly";
}

function getButtonText(
  planName: string,
  billingFrequency: BillingFrequency,
  subscriptionInfo: SubscriptionInfo | null,
  isAuthenticated: boolean
): string {
  // Not authenticated or no subscription
  if (!isAuthenticated || !subscriptionInfo) {
    if (planName === "Essential" && billingFrequency === "annuel") {
      return "Commencez maintenant";
    }
    if (planName === "Essential" && billingFrequency === "mensuel") {
      return "✨ 14 jours gratuits";
    }
    return "Commencez maintenant";
  }

  // User has subscription - determine action
  const selectedPlanId = getPlanId(planName);
  const currentPlan = subscriptionInfo.currentPlan;

  if (!selectedPlanId) {
    return "Commencez maintenant";
  }

  // If it's the current plan, show "Plan actuel"
  if (selectedPlanId === currentPlan) {
    return "Plan actuel";
  }

  // Determine if upgrade or downgrade
  const planHierarchy: Partial<Record<PlanId, number>> = {
    essential: 1,
    pro: 2,
    business: 3,
  };

  // Handle trial/demo as special cases (they're not in the paid plan hierarchy)
  // Use string comparison to handle "demo" which may not be in PlanId type
  const currentPlanStr = String(currentPlan);
  if (currentPlanStr === "trial" || currentPlanStr === "demo") {
    // If user is on trial/demo, they can still choose a plan to upgrade
    // Check if they have an active organization - if not, show "Commencez maintenant"
    // This handles the case where user has trial plan but no active_organization_id
    return "Commencez maintenant";
  }

  const currentPlanHierarchy = planHierarchy[currentPlan as PlanId] || 0;
  const selectedPlanHierarchy = planHierarchy[selectedPlanId] || 0;

  if (selectedPlanHierarchy > currentPlanHierarchy) {
    // Upgrade
    return "Upgrader";
  } else if (selectedPlanHierarchy < currentPlanHierarchy) {
    // Downgrade
    return "Changer de plan";
  } else {
    // Same level (shouldn't happen, but handle it)
    return "Changer de plan";
  }
}

function isCurrentPlan(
  planName: string,
  subscriptionInfo: SubscriptionInfo | null
): boolean {
  if (!subscriptionInfo) return false;

  const selectedPlanId = getPlanId(planName);
  return selectedPlanId === subscriptionInfo.currentPlan;
}

async function createCheckoutSession(
  planId: PlanId,
  frequency: Frequency
): Promise<string> {
  const response = await fetch("/api/paiements/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, frequency }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(
      data.error || "Erreur lors de la création de la session de paiement"
    );
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("URL de checkout non reçue");
  }

  return data.url;
}

function ExpiredAlert() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  if (!isExpired) return null;

  return (
    <Alert variant="destructive" className="mb-8">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Votre abonnement a expiré</AlertTitle>
      <AlertDescription>
        Veuillez choisir un plan pour continuer à utiliser Andoxa.
      </AlertDescription>
    </Alert>
  );
}

export default function Pricing() {
  const [billingFrequency, setBillingFrequency] =
    React.useState<BillingFrequency>("annuel");
  const { user, isAuthenticated, loading: userLoading } = useUser();
  const { subscriptionInfo, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handlePlanSelection = async (planName: string): Promise<void> => {
    setError(null);

    const planId = getPlanId(planName);
    if (!planId) {
      setError("Plan invalide");
      return;
    }

    const frequency = getFrequency(billingFrequency);

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(`/auth/login?plan=${planId}&frequency=${frequency}`);
      return;
    }

    // If user has an active subscription, redirect to billing portal for upgrade/downgrade
    const currentPlanStr = subscriptionInfo?.currentPlan as string | undefined;
    const hasActiveSubscription =
      currentPlanStr && currentPlanStr !== "trial" && currentPlanStr !== "demo";

    if (hasActiveSubscription && subscriptionInfo) {
      const selectedPlanId = getPlanId(planName);
      const currentPlan = subscriptionInfo.currentPlan;

      // If it's the current plan, do nothing
      if (selectedPlanId === currentPlan) {
        return;
      }

      // For upgrade/downgrade, use Stripe billing portal
      setLoadingPlan(planName);
      try {
        const response = await fetch("/api/paiements/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error || "Erreur lors de l'accès au portail de facturation"
          );
        }

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("URL du portail non reçue");
        }
      } catch (err) {
        console.error("Error accessing billing portal:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue. Veuillez réessayer."
        );
        setLoadingPlan(null);
      }
      return;
    }

    // For new subscriptions (trial/demo or no subscription), create trial org and redirect to config
    setLoadingPlan(planName);
    try {
      const response = await fetch("/api/paiements/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, frequency }),
      });

      // Consommer la réponse une seule fois
      const data = (await response.json()) as { 
        url?: string; 
        redirect_url?: string; 
        organization_id?: string;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        // If user already has a trial, redirect to plan
        if (data.code === "TRIAL_EXISTS" && data.redirect_url) {
          router.push(data.redirect_url);
          return;
        }
        
        // If no organization, redirect to plan
        if (data.code === "NO_ORGANIZATION" && data.redirect_url) {
          router.push(data.redirect_url);
          return;
        }
        
        throw new Error(
          data.error || "Erreur lors de la création de la session de paiement"
        );
      }
      
      // If trial organization was created, redirect to configuration page
      if (data.redirect_url && data.organization_id) {
        router.push(data.redirect_url);
        return;
      }
      
      // Otherwise, redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout non reçue");
      }
    } catch (err) {
      console.error("Error creating checkout session:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Veuillez réessayer."
      );
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <AndoxaHeader />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Expired Alert */}
        <Suspense fallback={null}>
          <ExpiredAlert />
        </Suspense>

        {/* Hero Section */}
        <section className="text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
            <Balancer>Nos offres évoluent avec vous</Balancer>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            <Balancer>
              Pensés pour les Junior-Entreprises, nos plans s&apos;adaptent à
              votre taille, votre rythme et vos besoins.
            </Balancer>
          </p>
        </section>

        {/* Billing Toggle - Only show for non-free plans */}
        <section className="mt-16">
          <div className="flex items-center justify-center gap-4">
            <Label
              htmlFor="switch"
              className={cn(
                "text-base font-medium transition-colors",
                billingFrequency === "mensuel"
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              Mensuel
            </Label>
            <Switch
              id="switch"
              checked={billingFrequency === "annuel"}
              onCheckedChange={() =>
                setBillingFrequency(
                  billingFrequency === "mensuel" ? "annuel" : "mensuel"
                )
              }
            />
            <Label
              htmlFor="switch"
              className={cn(
                "text-base font-medium transition-colors",
                billingFrequency === "annuel"
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              Annuel (-20%)
            </Label>
          </div>
        </section>

        {/* Pilot-only message */}
        <section className="mt-16">
          <Alert className="max-w-2xl mx-auto bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              Inscription réservée aux pilotes
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              L&apos;inscription est actuellement réservée aux pilotes
              sélectionnés. Contactez-nous pour plus d&apos;informations.
            </AlertDescription>
          </Alert>
        </section>

        {/* Pricing Cards */}
        <section className="mt-16">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-sm sm:max-w-sm md:max-w-md lg:max-w-full mx-auto">
            {plans.map((plan, planIdx) => (
              <div key={planIdx} className="relative">
                {plan.isRecommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="flex items-center gap-2 rounded-full bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white whitespace-nowrap">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Le plus populaire</span>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "rounded-2xl p-6 sm:p-8 ring-1 h-full flex flex-col",
                    plan.isRecommended
                      ? "bg-blue-50 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800"
                      : "bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                  )}
                >
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <div className="mt-6">
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
                          {plan.name === "Essential"
                            ? "0€"
                            : isVariablePrice(plan.price)
                            ? billingFrequency === "mensuel"
                              ? plan.price.mensuel
                              : (() => {
                                  const planKey =
                                    plan.name.toLowerCase() as PlanKey;
                                  const config = PRICING_CONFIG[planKey];
                                  return formatPrice(
                                    calculateMonthlyEquivalent(config.annual)
                                  );
                                })()
                            : plan.price}
                        </span>
                        {plan.name !== "Essential" &&
                          isVariablePrice(plan.price) && (
                            <span className="ml-2 text-base sm:text-lg text-slate-600 dark:text-slate-400">
                              /mois
                            </span>
                          )}
                      </div>
                    </div>
                    {plan.name === "Essential" ? (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          14 jours gratuits
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          puis {formatPrice(PRICING_CONFIG.essential.monthly)}
                          /mois
                        </div>
                      </div>
                    ) : (
                      isVariablePrice(plan.price) && (
                        <div className="mt-1 min-h-5">
                          {billingFrequency === "annuel" ? (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              soit{" "}
                              {(() => {
                                const planKey =
                                  plan.name.toLowerCase() as PlanKey;
                                const config = PRICING_CONFIG[planKey];
                                return formatPrice(config.annual);
                              })()}
                              /an
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Sans engagement
                            </span>
                          )}
                        </div>
                      )
                    )}
                    {/* Ensure consistent spacing for all plans */}
                    <div className="mt-2 h-6"></div>

                    {/* Add extra spacing for Enterprise plan to account for missing annual price */}
                    {!isVariablePrice(plan.price) && (
                      <div className="mt-1 h-5"></div>
                    )}

                    <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 h-16 sm:h-20 flex items-center">
                      <Balancer>{plan.description}</Balancer>
                    </p>
                  </div>

                  <div className="mt-8">
                    {error && plan.name === loadingPlan && (
                      <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        {error}
                      </div>
                    )}
                    <Button
                      onClick={() => handlePlanSelection(plan.name)}
                      disabled={
                        loadingPlan === plan.name ||
                        isCurrentPlan(plan.name, subscriptionInfo) ||
                        userLoading ||
                        subscriptionLoading
                      }
                      className={cn(
                        "w-full h-11 sm:h-12 text-sm sm:text-base font-semibold",
                        plan.name === "Essential"
                          ? "bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                          : "",
                        isCurrentPlan(plan.name, subscriptionInfo) &&
                          "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {loadingPlan === plan.name ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement...
                          </>
                        ) : (
                          getButtonText(
                            plan.name,
                            billingFrequency,
                            subscriptionInfo,
                            isAuthenticated
                          )
                        )}
                      </span>
                    </Button>
                  </div>

                  {/* Ensure consistent spacing for Capacité section across all plans */}
                  <div className="mt-8 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 sm:mb-3">
                        Capacité
                      </h4>
                      <ul className="space-y-1.5 sm:space-y-2">
                        {plan.capacity.map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300"
                          >
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 sm:mb-3">
                        Fonctionnalités
                      </h4>
                      <ul className="space-y-1.5 sm:space-y-2">
                        {plan.features.map((feature, featureIdx) => (
                          <li
                            key={feature}
                            className={cn(
                              "flex items-start gap-2 sm:gap-3 text-xs sm:text-sm",
                              featureIdx === 0 &&
                                (plan.name === "Pro" ||
                                  plan.name === "Business")
                                ? "text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 -mx-2"
                                : "text-slate-600 dark:text-slate-300"
                            )}
                          >
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="mt-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              <Balancer>Comparaison détaillée des fonctionnalités</Balancer>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              <Balancer>
                Découvrez toutes les fonctionnalités incluses dans chaque plan
              </Balancer>
            </p>
          </div>

          <div className="mt-16 max-w-sm sm:max-w-sm md:max-w-md lg:max-w-full mx-auto">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Fonctionnalités
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">
                        Essential
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">
                        Pro
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">
                        Business
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Utilisateurs
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("essential");
                          return limits.users === -1
                            ? "Illimités"
                            : limits.users;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("pro");
                          return limits.users === -1
                            ? "Illimités"
                            : limits.users;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("business");
                          return limits.users === -1
                            ? "Illimités"
                            : `Jusqu'à ${limits.users}`;
                        })()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Prospects
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("essential");
                          return limits.prospects === -1
                            ? "Illimités"
                            : `Jusqu'à ${limits.prospects}`;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("pro");
                          return limits.prospects === -1
                            ? "Illimités"
                            : `Jusqu'à ${limits.prospects}`;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("business");
                          return limits.prospects === -1
                            ? "Illimités"
                            : `Jusqu'à ${limits.prospects}`;
                        })()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Campagnes
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("essential");
                          return limits.campaigns === -1
                            ? "Illimitées"
                            : limits.campaigns;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("pro");
                          return limits.campaigns === -1
                            ? "Illimitées"
                            : limits.campaigns;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("business");
                          return limits.campaigns === -1
                            ? "Illimitées"
                            : limits.campaigns;
                        })()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Crédits d&apos;enrichissement
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        {(() => {
                          const limits = getPlanLimits("essential");
                          return limits.enrichment_credits === 0
                            ? "-"
                            : limits.enrichment_credits === -1
                            ? "Illimités"
                            : limits.enrichment_credits;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("pro");
                          return limits.enrichment_credits === 0
                            ? "-"
                            : limits.enrichment_credits === -1
                            ? "Illimités"
                            : limits.enrichment_credits;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {(() => {
                          const limits = getPlanLimits("business");
                          return limits.enrichment_credits === 0
                            ? "-"
                            : limits.enrichment_credits === -1
                            ? "Illimités"
                            : limits.enrichment_credits;
                        })()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Campagnes email
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Calendrier intégré
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        -
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        KPIs de campagne
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Analytics de base
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        -
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        -
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Analytics détaillés
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        -
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        -
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        Notifications intelligentes
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        -
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                        -
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                        Support
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        Email
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        Prioritaire
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        Prioritaire
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-6">
              {/* Essential Plan */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Plan Essential
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Parfait pour débuter
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Utilisateurs
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      1
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Prospects
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      500
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Crédits d&apos;enrichissement
                    </span>
                    <span className="text-sm text-slate-400">-</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Campagnes email
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Calendrier intégré
                    </span>
                    <span className="text-sm text-slate-400">-</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      KPIs de campagne
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Analytics de base
                    </span>
                    <span className="text-sm text-slate-400">-</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Support
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Email
                    </span>
                  </div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Le plus populaire
                  </span>
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Plan Pro
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Pour les JE qui veulent automatiser
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Utilisateurs
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      3
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Prospects
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Illimités
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Crédits d&apos;enrichissement
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      500
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Campagnes email
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Calendrier intégré
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      KPIs de campagne
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Analytics de base
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Support
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Prioritaire
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Plan */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Plan Business
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Pour les JE en croissance
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Utilisateurs
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Jusqu&apos;à 10
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Prospects
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Illimités
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Crédits d&apos;enrichissement
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      1 000
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Campagnes email
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Calendrier intégré
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      KPIs de campagne
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Analytics détaillés
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Notifications intelligentes
                    </span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Support
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Prioritaire
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Commented out for now */}
        {/* <section className="mt-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              <Balancer>Toutes les fonctionnalités incluses</Balancer>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              <Balancer>Découvrez ce qui rend Andoxa unique pour les Junior-Entreprises</Balancer>
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {features.map((feature) => (
              <div key={feature.name} className="text-center max-w-xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.name}
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300 text-balance">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section> */}

        {/* FAQ Section */}
        <section className="mt-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              <Balancer>Questions fréquentes</Balancer>
            </h2>
          </div>

          <div className="mt-16 mx-auto max-w-3xl space-y-8">
            <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Puis-je changer de plan à tout moment ?
              </h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Oui, vous pouvez upgrader ou downgrader votre plan à tout
                moment. Les changements prennent effet immédiatement.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Y a-t-il des frais de configuration ?
              </h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Non, il n&apos;y a aucun frais de configuration. Vous payez
                uniquement votre abonnement mensuel ou annuel.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Que se passe-t-il si je dépasse mes limites ?
              </h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Nous vous contacterons pour discuter d&apos;un upgrade de plan.
                Aucune interruption de service ne sera appliquée.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Puis-je annuler à tout moment ?
              </h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Oui, vous pouvez annuler votre abonnement à tout moment depuis
                votre tableau de bord. Aucun frais d&apos;annulation.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-24 text-center">
          <div className="rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <Balancer>Prêt à commencer ?</Balancer>
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              <Balancer>
                Rejoignez les Junior-Entreprises qui transforment leur gestion
                commerciale
              </Balancer>
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base font-semibold bg-white text-blue-600 hover:bg-blue-50 dark:bg-white dark:text-blue-600 dark:hover:bg-blue-50"
              >
                <Link href="/auth/login" className="flex items-center gap-2">
                  Essai de 14 jours
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold border-white bg-transparent text-white hover:bg-white hover:text-blue-600 transition-colors dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white dark:hover:text-blue-600"
              >
                <Link
                  href="https://calendly.com/andoxa/30min"
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  Réserver une démo
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Team Section - Commented out for later
        <section className="mt-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              L&apos;équipe derrière Andoxa
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Une équipe passionnée au service des Junior-Entreprises
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Team member cards will go here }
          </div>
        </section>
        */}
      </div>

      <AndoxaFooter />
    </main>
  );
}