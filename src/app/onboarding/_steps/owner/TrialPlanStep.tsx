"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button as MarketingButton } from "@/components/marketing/ui/button";
import {
  BillingToggle,
  type Billing,
} from "@/components/marketing/pricing/billing-toggle";
import { MarketingTeamCalculator } from "@/components/marketing/team-calculator";
import { cn } from "@/lib/utils";
import {
  PLAN_FEATURES_TEXT,
  PLAN_PRESENTATION,
  getPlanPrice,
} from "@/lib/config/plans-config";
import { ONBOARDING_PROFILE_STEP } from "../../config";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import { StepHeading, TRIAL_DAYS_LABEL } from "./owner-ui";
import type { StepProps } from "../types";

type TrialPlan = "solo" | "team";

/**
 * Card markup intentionally mirrors `PlanCard` in
 * components/marketing/sections/pricing.tsx — the design must stay identical
 * to /pricing. Differences: the "Recommandé pour vous" badge follows the
 * qualification answer, both cards carry the trial line, and the CTA starts
 * the entitlement (instant no-card trial via /api/paiements/checkout, or
 * Stripe checkout when the trial flag is off / already used).
 */
function TrialPlanCard({
  plan,
  recommended,
  billing,
  loading,
  disabled,
  onSelect,
  calculator,
}: {
  plan: TrialPlan;
  recommended: boolean;
  billing: Billing;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
  calculator?: React.ReactNode;
}) {
  const presentation = PLAN_PRESENTATION[plan];
  const price = getPlanPrice(plan, billing);
  const subprice =
    "monthly" in presentation.priceNote ? presentation.priceNote[billing] : "";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl bg-card p-7 sm:p-8",
        recommended
          ? "border-2 border-[var(--brand-blue)] shadow-[0_30px_60px_-30px_rgba(0,82,217,0.35)]"
          : "border border-[var(--border)] shadow-[0_4px_18px_-12px_rgba(0,0,0,0.08)]"
      )}
    >
      {recommended && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--brand-blue)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_4px_14px_-4px_rgba(0,82,217,0.5)]">
          <Sparkles size={11} />
          Recommandé pour vous
        </span>
      )}

      <span
        className={cn("eyebrow", recommended && "text-[var(--brand-blue)]")}
      >
        {presentation.tag}
      </span>
      <h3 className="font-display mt-3 text-xl text-foreground sm:text-2xl">
        {presentation.title}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {presentation.subtitle}
      </p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-5xl font-medium tracking-tight tabular text-foreground">
          {price} €
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subprice}</p>

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <Sparkles className="size-3.5" />
        {TRIAL_DAYS_LABEL} jours d’essai gratuit inclus — 0 € aujourd’hui
      </p>

      {calculator}

      <MarketingButton
        onClick={onSelect}
        disabled={disabled}
        size="lg"
        className="mt-7 w-full justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Activation…
          </>
        ) : (
          "Démarrer l’essai gratuit"
        )}
      </MarketingButton>

      <ul className="mt-7 space-y-2.5">
        {PLAN_FEATURES_TEXT[plan].map((f, i) => {
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
                <Check
                  size={11}
                  className="text-emerald-700 dark:text-emerald-400"
                />
              </span>
              <span className="text-muted-foreground">{f}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TrialPlanStep({ onNext, onError }: StepProps) {
  const { teamSize } = useOnboardingRuntime();
  const [billing, setBilling] = useState<Billing>("annual");
  const [seats, setSeats] = useState(3);
  const [loadingPlan, setLoadingPlan] = useState<TrialPlan | null>(null);

  // 20+ has no self-serve card: recommend Team and surface the contact link below.
  const recommended: TrialPlan = teamSize === "solo" ? "solo" : "team";

  const teamPrice = getPlanPrice("team", billing) ?? 0;
  const teamMonthly = getPlanPrice("team", "monthly") ?? 0;

  const startPlan = async (plan: TrialPlan) => {
    if (loadingPlan) return;
    setLoadingPlan(plan);
    try {
      // Mark the wizard position first so a Stripe round-trip (when the
      // instant trial isn't available) resumes at install.linkedin — same
      // contract as the old org.create → /onboarding/plan detour.
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ onboarding_step: ONBOARDING_PROFILE_STEP.PLAN }),
      }).catch(() => null);

      const res = await fetch("/api/paiements/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planId: plan,
          billing,
          ...(plan === "team" ? { seats } : {}),
        }),
      });
      const json = (await res.json()) as {
        trial_started?: boolean;
        redirect_url?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible de démarrer l’essai.");
      }
      if (json.trial_started) {
        // Entitled instantly — keep going, no redirect needed.
        onNext();
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      throw new Error("Réponse de checkout vide.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain py-8">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <StepHeading
          title="Démarrez votre essai gratuit."
          subtitle={`${TRIAL_DAYS_LABEL} jours gratuits sur les plans Solo et Team. Aucune carte bancaire demandée aujourd’hui.`}
        />

        <div className="flex justify-center">
          <BillingToggle value={billing} onChange={setBilling} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-5 pt-3 sm:grid-cols-2 lg:gap-6"
        >
          <TrialPlanCard
            plan="solo"
            recommended={recommended === "solo"}
            billing={billing}
            loading={loadingPlan === "solo"}
            disabled={loadingPlan !== null}
            onSelect={() => void startPlan("solo")}
          />
          <TrialPlanCard
            plan="team"
            recommended={recommended === "team"}
            billing={billing}
            loading={loadingPlan === "team"}
            disabled={loadingPlan !== null}
            onSelect={() => void startPlan("team")}
            calculator={
              <MarketingTeamCalculator
                pricePerUser={teamPrice}
                monthlyPricePerUser={teamMonthly}
                billing={billing}
                onUsersChange={setSeats}
              />
            }
          />
        </motion.div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5" /> Sans engagement
            </span>
            <span>·</span>
            <span>Sans carte bancaire</span>
            <span>·</span>
            <span>Annulable en un clic</span>
          </div>
          {teamSize === "large" ? (
            <Link
              href="/contact?objet=custom"
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Plus de 20 utilisateurs ? Parlons d’une offre sur-mesure
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
