"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { BillingToggle, type Billing } from "@/components/marketing/pricing/billing-toggle";
import { MarketingTeamCalculator } from "@/components/marketing/team-calculator";
import { cn } from "@/lib/utils";

/**
 * Tag passed to the optional `onSelectPlan` callback so callers (onboarding,
 * in-app upgrade flows) know which CTA was clicked. `custom` maps to the
 * contact form by default, but consumers can override.
 */
export type PricingPlanChoice = "solo" | "team" | "custom";

const SOLO_FEATURES = [
  "Extension Chrome LinkedIn",
  "CRM complet (listes, pipeline, kanban)",
  "Inbox unifiée LinkedIn et WhatsApp",
  "Calendrier avec lien de booking",
  "Séquences WhatsApp pré et post-RDV",
  "Workflows custom illimités + 3 templates",
  "800 invitations LinkedIn / mois (200/sem.)",
  "1 utilisateur",
];

const TEAM_FEATURES = [
  "Tout du plan Solo, plus :",
  "Multi-utilisateurs (3 à 20)",
  "Pipeline kanban partagé",
  "Listes de prospects partagées",
  "Sessions d'appels collaboratives",
  "Dashboard manager équipe",
  "Rôles et permissions granulaires",
  "Support prioritaire (réponse < 24 h)",
];

const CUSTOM_FEATURES = [
  "Tout du plan Team, plus :",
  "Au-delà de 20 utilisateurs",
  "SSO (Google, Okta, Microsoft)",
  "SLA contractuel + DPA",
  "Intégrations sur-mesure (HubSpot, Salesforce…)",
  "Onboarding accompagné par un CSM",
  "Formation équipe sur site",
  "Facturation virement annuel",
];

export interface MarketingPricingSectionProps {
  /**
   * Optional click handler that overrides the default link behaviour on the
   * three plan cards. Used by `/onboarding/plan` to drive Stripe checkout
   * (or open the billing portal for existing subscribers) without leaving
   * the protected app. When omitted, CTAs link to `/checkout?plan=…` for
   * solo/team and `/contact?objet=custom` for custom.
   */
  onSelectPlan?: (plan: PricingPlanChoice, billing: Billing) => void | Promise<void>;
  /** Plan ID currently shown as "loading" (button spinner). */
  loadingPlan?: PricingPlanChoice | null;
  /** Initial billing toggle position. */
  initialBilling?: Billing;
}

export function MarketingPricingSection({
  onSelectPlan,
  loadingPlan = null,
  initialBilling = "annual",
}: MarketingPricingSectionProps = {}) {
  const [billing, setBilling] = React.useState<Billing>(initialBilling);
  const reduce = useReducedMotion();
  const soloPrice = billing === "monthly" ? 49 : 39;
  const teamPrice = billing === "monthly" ? 45 : 36;
  const teamMonthly = 45;

  const onClick = onSelectPlan
    ? (plan: PricingPlanChoice) => {
        void onSelectPlan(plan, billing);
      }
    : undefined;

  return (
    <section
      id="tarifs"
      className="relative overflow-hidden border-t border-[var(--border)] bg-gradient-to-b from-background via-[var(--brand-blue-tint)]/30 to-background py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[20%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[var(--brand-blue-tint)] opacity-60 blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Eyebrow className="justify-center">Tarifs</Eyebrow>
          <h2 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
            Un tarif par profil. <span className="text-[var(--brand-blue)]">Pas de surprise</span>.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Du commercial solo à l&apos;équipe entreprise, le prix s&apos;adapte à votre
            taille. Sans engagement, annulable en un clic.
          </p>
          <div className="mt-8 flex justify-center">
            <BillingToggle value={billing} onChange={setBilling} />
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3 lg:gap-6">
          <PlanCard
            plan="solo"
            tag="Solo"
            title="Pour les commerciaux indépendants."
            subtitle="Freelances, consultants, sales en solo."
            price={soloPrice}
            billing={billing}
            subprice={
              billing === "monthly" ? "/mois, par utilisateur" : "/mois, facturation annuelle"
            }
            ctaHref={`/checkout?plan=solo&billing=${billing}`}
            ctaLabel="Commencer"
            features={SOLO_FEATURES}
            reduce={!!reduce}
            onClick={onClick}
            loading={loadingPlan === "solo"}
          />
          <PlanCard
            plan="team"
            tag="Team"
            recommended
            title="Pour les équipes commerciales."
            subtitle="Sales teams, agences, cabinets de conseil."
            price={teamPrice}
            billing={billing}
            subprice={
              billing === "monthly"
                ? "/mois, par utilisateur (à partir de 3)"
                : "/mois, par utilisateur, facturation annuelle"
            }
            ctaHref={`/checkout?plan=team&billing=${billing}`}
            ctaLabel="Choisir Team"
            features={TEAM_FEATURES}
            reduce={!!reduce}
            onClick={onClick}
            loading={loadingPlan === "team"}
            calculator={
              <MarketingTeamCalculator
                pricePerUser={teamPrice}
                monthlyPricePerUser={teamMonthly}
                billing={billing}
              />
            }
          />
          <PlanCard
            plan="custom"
            tag="Custom"
            title="Pour les équipes au-delà de 20."
            subtitle="Sales orgs, scale-ups, grands groupes."
            customPrice="Sur-mesure"
            customSubprice="Tarification volume + intégrations dédiées"
            ctaHref="/contact?objet=custom"
            ctaLabel="Demander un devis"
            ctaVariant="outline"
            features={CUSTOM_FEATURES}
            reduce={!!reduce}
            onClick={onClick}
            loading={loadingPlan === "custom"}
          />
        </div>
      </Container>
    </section>
  );
}

function PlanCard({
  plan,
  tag,
  title,
  subtitle,
  price,
  customPrice,
  billing,
  subprice,
  customSubprice,
  ctaHref,
  ctaLabel,
  ctaVariant,
  features,
  recommended,
  calculator,
  reduce,
  onClick,
  loading,
}: {
  plan: PricingPlanChoice;
  tag: string;
  title: string;
  subtitle: string;
  price?: number;
  customPrice?: string;
  billing?: Billing;
  subprice?: string;
  customSubprice?: string;
  ctaHref: string;
  ctaLabel: string;
  ctaVariant?: "outline";
  features: string[];
  recommended?: boolean;
  calculator?: React.ReactNode;
  reduce: boolean;
  onClick?: (plan: PricingPlanChoice) => void;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex h-full flex-col rounded-2xl bg-card p-7 sm:p-8",
        recommended
          ? "border-2 border-[var(--brand-blue)] shadow-[0_30px_60px_-30px_rgba(0,82,217,0.35)]"
          : "border border-[var(--border)] shadow-[0_4px_18px_-12px_rgba(0,0,0,0.08)]",
      )}
    >
      {recommended && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--brand-blue)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_4px_14px_-4px_rgba(0,82,217,0.5)]">
          <Sparkles size={11} />
          Recommandé
        </span>
      )}

      <span className={cn("eyebrow", recommended && "text-[var(--brand-blue)]")}>{tag}</span>
      <h3 className="font-display mt-3 text-xl text-foreground sm:text-2xl">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

      <div className="mt-6 flex items-baseline gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {customPrice ? (
            <motion.span
              key="custom"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-3xl font-medium tracking-tight tabular text-foreground sm:text-4xl"
            >
              {customPrice}
            </motion.span>
          ) : (
            <motion.span
              key={`${tag}-${billing}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-5xl font-medium tracking-tight tabular text-foreground"
            >
              {price} €
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{customSubprice ?? subprice}</p>

      {calculator}

      {onClick ? (
        <Button
          onClick={() => onClick(plan)}
          disabled={loading}
          size="lg"
          variant={ctaVariant}
          className={cn(
            "mt-7 w-full justify-center",
            ctaVariant === "outline" && "rounded-full",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection…
            </>
          ) : (
            ctaLabel
          )}
        </Button>
      ) : (
        <Button
          href={ctaHref}
          size="lg"
          variant={ctaVariant}
          className={cn(
            "mt-7 w-full justify-center",
            ctaVariant === "outline" && "rounded-full",
          )}
        >
          {ctaLabel}
        </Button>
      )}

      <ul className="mt-7 space-y-2.5">
        {features.map((f, i) => {
          if (i === 0 && f.endsWith(":")) {
            return (
              <li key={f} className="text-sm font-semibold text-foreground">
                {f}
              </li>
            );
          }
          return (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <Check size={11} className="text-emerald-700 dark:text-emerald-400" />
              </span>
              <span className="text-muted-foreground">{f}</span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
