"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2, Users, Database, Mail, Building2, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getPlanConfig, getPlanLimits } from "@/lib/config/plans-config";
import { cn } from "@/lib/utils";
import Balancer from "react-wrap-balancer";

type BillingFrequency = "mensuel" | "annuel";
type Frequency = "monthly" | "yearly";

const PRICING_CONFIG = {
  essential: {
    monthly: 29,
    annual: 279,
  },
  pro: {
    monthly: 99,
    annual: 950,
  },
  business: {
    monthly: 179,
    annual: 1718,
  },
} as const;

function getPlanId(planName: string): string | null {
  const mapping: Record<string, string> = {
    Essential: "essential",
    Pro: "pro",
    Business: "business",
  };
  return mapping[planName] || null;
}

function getFrequency(billing: BillingFrequency): Frequency {
  return billing === "annuel" ? "yearly" : "monthly";
}

export function TarifsSection() {
  const router = useRouter();
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>("annuel");
  // Ne pas charger user/subscription au mount - seulement au clic sur un plan
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePlanClick = async (planName: string) => {
    const planId = getPlanId(planName);
    if (!planId) return;

    const frequency = getFrequency(billingFrequency);

    setLoadingPlan(planName);

    try {
      // Charger les données utilisateur uniquement maintenant
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Check if user is authenticated
      if (!session?.user) {
        router.push(`/auth/sign-up?plan=${planId}&frequency=${frequency}`);
        setLoadingPlan(null);
        return;
      }

      setUser(session.user);

      // 2. Charger les infos de subscription
      const subResponse = await fetch("/api/subscription/info", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      let subData = null;
      if (subResponse.ok) {
        subData = await subResponse.json();
        setSubscriptionInfo(subData);
      }

      // 3. Check if user has a plan
      const hasActivePlan =
        subData?.currentPlan &&
        subData.currentPlan !== "trial";

      if (hasActivePlan) {
        // Upgrade/downgrade → Billing portal
        const response = await fetch("/api/paiements/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Erreur lors de l'accès au portail de facturation");
        }

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        // New subscription → Checkout
        const response = await fetch("/api/paiements/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, frequency }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de la création de la session");
        }

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else if (data.redirect_url) {
          router.push(data.redirect_url);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      // Error will be handled by toast system
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: "Essential",
      planId: "essential" as const,
      monthly: PRICING_CONFIG.essential.monthly,
      annual: PRICING_CONFIG.essential.annual,
    },
    {
      name: "Pro",
      planId: "pro" as const,
      monthly: PRICING_CONFIG.pro.monthly,
      annual: PRICING_CONFIG.pro.annual,
      isRecommended: true,
    },
    {
      name: "Business",
      planId: "business" as const,
      monthly: PRICING_CONFIG.business.monthly,
      annual: PRICING_CONFIG.business.annual,
    },
  ];

  return (
    <section id="tarifs" className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white px-4">
            <Balancer>Nos offres évoluent avec vous</Balancer>
          </h2>
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base leading-7 text-slate-800 dark:text-slate-200 px-4">
            <Balancer>
              Pensés pour les Junior-Entreprises, nos plans s&apos;adaptent à votre taille,
              votre rythme et vos besoins.
            </Balancer>
          </p>
        </div>

        {/* Billing Toggle - Smart animate background */}
        <div className="mt-8 sm:mt-12 flex items-center justify-center relative z-30">
          <div className="relative inline-flex items-center rounded-full p-1 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
            {/* Animated background that slides - avec style neumorphique */}
            <motion.div
              layoutId="billingToggle"
              className="absolute rounded-full toggle-active-bg"
              transition={{
                type: "tween",
                duration: 0.3,
                ease: "easeInOut"
              }}
              style={{
                top: "4px",
                bottom: "4px",
                left: billingFrequency === "mensuel" ? "4px" : "50%",
                right: billingFrequency === "mensuel" ? "50%" : "4px",
                width: "calc(50% - 4px)",
              }}
            />
            <button
              type="button"
              onClick={() => setBillingFrequency("mensuel")}
              className={cn(
                "relative w-1/2 px-6 py-2.5 rounded-full text-sm font-semibold z-10 transition-colors flex items-center justify-center",
                billingFrequency === "mensuel"
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setBillingFrequency("annuel")}
              className={cn(
                "relative w-1/2 px-6 py-2.5 rounded-full text-sm font-semibold z-10 transition-colors flex items-center justify-center",
                billingFrequency === "annuel"
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              <span className="relative">Annuel</span>
              <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="mt-12 sm:mt-10 md:mt-12 lg:mt-16 grid grid-cols-1 gap-8 sm:gap-12 md:gap-8 lg:gap-10 mx-auto px-6 sm:px-2 md:px-4 lg:px-0 max-w-md sm:max-w-md md:max-w-lg lg:max-w-full lg:grid-cols-3">
          {plans.map((plan) => {
            const config = getPlanConfig(plan.planId);
            const limits = getPlanLimits(plan.planId);
            const price =
              billingFrequency === "annuel" ? plan.annual : plan.monthly;
            const monthlyPrice = billingFrequency === "annuel" ? Math.round(plan.annual / 12) : plan.monthly;
            const isLoading = loadingPlan === plan.name;

            const formatLimit = (value: number) => {
              if (value === -1) return <Infinity className="h-5 w-5 inline-block" />;
              return value.toLocaleString("fr-FR");
            };

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "relative backdrop-blur-xl flex flex-col h-full",
                  plan.isRecommended
                    ? "bg-white/10 dark:bg-black/20 shadow-xl scale-105 rounded-2xl"
                    : "bg-white/10 dark:bg-black/20 shadow-lg rounded-2xl"
                )}
              >
                {/* Gradient overlay */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl",
                  plan.isRecommended
                    ? "bg-linear-to-br from-orange-400/10 via-orange-400/5 to-blue-400/10 opacity-100"
                    : "bg-linear-to-br from-orange-400/0 via-transparent to-blue-400/0 opacity-0"
                )} />

                {plan.isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="rounded-full bg-linear-to-r from-orange-400 to-orange-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
                      ⭐ Recommandé
                    </span>
                  </div>
                )}

                <div className={cn("relative z-10 p-4 sm:p-6 flex flex-col flex-1", plan.isRecommended && "pt-6 sm:pt-8")}>
                  {/* Header */}
                  <div className="text-center mb-4 sm:mb-6">
                    <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-slate-900 dark:text-slate-100 min-h-10">
                      <Balancer>{config.description}</Balancer>
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-white/20 dark:border-white/10 min-h-[90px] sm:min-h-[100px]">
                    {billingFrequency === "annuel" ? (
                      <>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-4xl font-bold text-black dark:text-white">
                            {monthlyPrice}€
                          </span>
                          <span className="text-sm text-slate-800 dark:text-slate-200">
                            /mois
                          </span>
                        </div>
                        <div className="min-h-[24px] mt-2">
                          <p className="text-base font-medium text-slate-800 dark:text-slate-200">
                            Soit {price}€/an
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-4xl font-bold text-black dark:text-white">
                          {price}€
                        </span>
                        <span className="text-sm text-slate-800 dark:text-slate-200">
                          /mois
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
                    <h4 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-3">
                      Limites incluses
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10">
                        <Users className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 dark:text-slate-200">Utilisateurs</p>
                          <p className="text-xs font-semibold text-black dark:text-white">{formatLimit(limits.users)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10">
                        <Building2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 dark:text-slate-200">Organisations</p>
                          <p className="text-xs font-semibold text-black dark:text-white">{formatLimit(limits.organizations)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10">
                        <Database className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 dark:text-slate-200">Prospects</p>
                          <p className="text-xs font-semibold text-black dark:text-white">{formatLimit(limits.prospects)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10">
                        <Mail className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 dark:text-slate-200">Campagnes</p>
                          <p className="text-xs font-semibold text-black dark:text-white">{formatLimit(limits.campaigns)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-4 sm:mb-6 flex-1">
                    <h4 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide mb-3">
                      Fonctionnalités
                    </h4>
                    <ul className="space-y-2">
                      {config.features.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400 mt-0.5" />
                          <span className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button - Aligné en bas */}
                  <Button
                    onClick={() => handlePlanClick(plan.name)}
                    disabled={isLoading}
                    variant="ghost"
                    className={cn(
                      "w-full rounded-full mt-auto h-12 text-base font-semibold relative z-20 btn-neumorphism glassmorphism border-0",
                      plan.isRecommended
                        ? "btn-gradient-border text-slate-800 dark:text-slate-100"
                        : "text-slate-700 dark:text-slate-200"
                    )}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : plan.planId === "essential" ? (
                      "✨ 14 jours gratuits"
                    ) : (
                      "Commencer maintenant"
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
