"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Puzzle,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button as MarketingButton } from "@/components/marketing/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LinkedInMark } from "@/lib/utils/onboarding-helpers";
import {
  BillingToggle,
  type Billing,
} from "@/components/marketing/pricing/billing-toggle";
import { MarketingTeamCalculator } from "@/components/marketing/team-calculator";
import {
  PLAN_FEATURES_TEXT,
  PLAN_PRESENTATION,
  getPlanPrice,
} from "@/lib/config/plans-config";

// ─── Shared types ────────────────────────────────────────────────────────────

export type PreviewTeamSize = "solo" | "team" | "large";
export type PreviewPlan = "solo" | "team";

export interface PreviewState {
  fullName: string;
  company: string;
  teamSize: PreviewTeamSize | null;
  plan: PreviewPlan | null;
  trialStarted: boolean;
  linkedinConnected: boolean;
  source: "csv" | "extension" | "later" | null;
}

export interface PreviewStepProps {
  state: PreviewState;
  patch: (p: Partial<PreviewState>) => void;
  onNext: () => void;
  onBack: () => void;
  restart: () => void;
}

const TRIAL_DAYS = 14;

// ─── Layout primitives ───────────────────────────────────────────────────────

function StepFrame({
  children,
  width = "default",
}: {
  children: React.ReactNode;
  width?: "default" | "wall";
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain py-8">
      <div
        className={cn(
          "flex w-full flex-col gap-8",
          width === "wall" ? "max-w-6xl" : "max-w-sm sm:max-w-md"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function StepHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function PrimaryCta({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      size="lg"
      className="h-11 w-full rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.99]"
      {...props}
    >
      {children}
    </Button>
  );
}

function SkipLink({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mx-auto text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function TrialBadge() {
  return (
    <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      <Sparkles className="size-3.5" />
      {TRIAL_DAYS} jours d’essai gratuit — sans carte bancaire
    </span>
  );
}

// ─── Step 1 — Welcome (name + company merged) ────────────────────────────────

export function WelcomePreviewStep({ state, patch, onNext }: PreviewStepProps) {
  const canContinue =
    state.fullName.trim().length >= 2 && state.company.trim().length >= 2;

  return (
    <StepFrame>
      <TrialBadge />
      <StepHeading
        title="Bienvenue sur Andoxa"
        subtitle="Votre espace de prospection est prêt en moins de deux minutes."
      />
      <form
        className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) onNext();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="preview-name">Votre nom</Label>
          <Input
            id="preview-name"
            value={state.fullName}
            onChange={(e) => patch({ fullName: e.target.value })}
            placeholder="Marie Dupont"
            autoComplete="name"
            autoFocus
            className="h-11 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-company">Votre entreprise</Label>
          <Input
            id="preview-company"
            value={state.company}
            onChange={(e) => patch({ company: e.target.value })}
            placeholder="Acme"
            autoComplete="organization"
            className="h-11 rounded-lg"
          />
          <p className="text-xs text-muted-foreground">
            Servira de nom à votre espace de travail — modifiable à tout
            moment.
          </p>
        </div>
        <PrimaryCta type="submit" disabled={!canContinue}>
          Continuer
          <ArrowRight className="size-4" />
        </PrimaryCta>
      </form>
    </StepFrame>
  );
}

// ─── Step 2 — Qualification (seats that will use Andoxa) ────────────────────

const TEAM_SIZE_OPTIONS: {
  id: PreviewTeamSize;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}[] = [
  {
    id: "solo",
    icon: User,
    title: "Moi uniquement",
    description: "Freelance, consultant ou commercial indépendant.",
  },
  {
    id: "team",
    icon: Users,
    title: "2 à 20 utilisateurs",
    description: "Sales team, agence ou cabinet de conseil.",
  },
  {
    id: "large",
    icon: Building2,
    title: "Plus de 20 utilisateurs",
    description: "Organisation commerciale, scale-up, grand groupe.",
  },
];

export function ProfilePreviewStep({ state, patch, onNext }: PreviewStepProps) {
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const select = (id: PreviewTeamSize) => {
    patch({ teamSize: id });
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(onNext, 280);
  };

  return (
    <StepFrame>
      <StepHeading
        title="Combien serez-vous à utiliser Andoxa ?"
        subtitle={`${state.fullName ? `${state.fullName.trim().split(" ")[0]}, c` : "C"}omptez toutes les personnes de votre équipe qui prospecteront avec l’outil — on vous recommande la formule adaptée.`}
      />
      <div className="flex flex-col gap-3">
        {TEAM_SIZE_OPTIONS.map((opt) => {
          const active = state.teamSize === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => select(opt.id)}
              aria-pressed={active}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-all",
                active
                  ? "border-primary ring-2 ring-primary/15"
                  : "border-border hover:border-muted-foreground/30 hover:shadow-md"
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                )}
              >
                <opt.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{opt.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {opt.description}
                </span>
              </span>
              {active ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </StepFrame>
  );
}

// ─── Step 3 — Free trial: full pricing wall (cards mirror /pricing) ─────────

/**
 * Card markup intentionally mirrors `PlanCard` in
 * components/marketing/sections/pricing.tsx — the design must stay identical
 * to /pricing. Differences are limited to: the "Recommandé pour vous" badge
 * follows the qualification answer, trial copy on Solo/Team, and CTAs are
 * mocked. When porting to /onboarding, reuse the real component.
 */
function PreviewPlanCard({
  plan,
  recommended,
  billing,
  loading,
  onSelect,
  calculator,
}: {
  plan: PreviewPlan;
  recommended: boolean;
  billing: Billing;
  loading: boolean;
  onSelect: () => void;
  calculator?: React.ReactNode;
}) {
  const presentation = PLAN_PRESENTATION[plan];
  const cadence: Billing = billing === "monthly" ? "monthly" : "annual";
  const price = getPlanPrice(plan, cadence);
  const subprice =
    "monthly" in presentation.priceNote
      ? presentation.priceNote[cadence]
      : "";

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
        {TRIAL_DAYS} jours d’essai gratuit inclus — 0 € aujourd’hui
      </p>

      {calculator}

      <MarketingButton
        onClick={onSelect}
        disabled={loading}
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

export function TrialPreviewStep({ state, patch, onNext }: PreviewStepProps) {
  const [billing, setBilling] = useState<Billing>("annual");
  const [loadingPlan, setLoadingPlan] = useState<PreviewPlan | null>(null);

  // 20+ has no self-serve card: recommend Team and surface the contact link below.
  const recommended: PreviewPlan = state.teamSize === "solo" ? "solo" : "team";

  const teamPrice = getPlanPrice("team", billing) ?? 0;
  const teamMonthly = getPlanPrice("team", "monthly") ?? 0;

  const selectTrialPlan = (plan: "solo" | "team") => {
    setLoadingPlan(plan);
    // Mock of the real checkout/entitlement round-trip.
    setTimeout(() => {
      patch({ plan, trialStarted: true });
      onNext();
    }, 900);
  };

  return (
    <StepFrame width="wall">
      <StepHeading
        title="Démarrez votre essai gratuit."
        subtitle={`${TRIAL_DAYS} jours gratuits sur les plans Solo et Team. Aucune carte bancaire demandée aujourd’hui.`}
      />

      <div className="flex justify-center">
        <BillingToggle value={billing} onChange={setBilling} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto grid w-full max-w-3xl gap-5 pt-3 sm:grid-cols-2 lg:gap-6"
      >
        <PreviewPlanCard
          plan="solo"
          recommended={recommended === "solo"}
          billing={billing}
          loading={loadingPlan === "solo"}
          onSelect={() => selectTrialPlan("solo")}
        />
        <PreviewPlanCard
          plan="team"
          recommended={recommended === "team"}
          billing={billing}
          loading={loadingPlan === "team"}
          onSelect={() => selectTrialPlan("team")}
          calculator={
            <MarketingTeamCalculator
              pricePerUser={teamPrice}
              monthlyPricePerUser={teamMonthly}
              billing={billing}
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
        {state.teamSize === "large" ? (
          <Link
            href="/contact?objet=custom"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Plus de 20 utilisateurs ? Parlons d’une offre sur-mesure
          </Link>
        ) : null}
      </div>
    </StepFrame>
  );
}

// ─── Step 4 — LinkedIn connect (mocked) ──────────────────────────────────────

export function LinkedInPreviewStep({
  state,
  patch,
  onNext,
}: PreviewStepProps) {
  const [connecting, setConnecting] = useState(false);

  const connect = () => {
    setConnecting(true);
    // Mock of the Unipile hosted-auth round-trip.
    setTimeout(() => {
      setConnecting(false);
      patch({ linkedinConnected: true });
    }, 1400);
  };

  return (
    <StepFrame>
      <StepHeading
        title={
          state.linkedinConnected
            ? "LinkedIn connecté."
            : "Connectez votre LinkedIn."
        }
        subtitle={
          state.linkedinConnected
            ? "Votre compte est prêt pour la prospection."
            : "C’est le moteur de vos campagnes. Connexion sécurisée — vos identifiants ne sont jamais stockés par Andoxa."
        }
      />

      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="relative">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[#0077B5]/10 dark:bg-[#0077B5]/15">
            <LinkedInMark className="size-9 text-[#0077B5]" />
          </div>
          {state.linkedinConnected ? (
            <span className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-card">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : null}
        </div>

        {state.linkedinConnected ? (
          <PrimaryCta onClick={onNext}>
            Continuer
            <ArrowRight className="size-4" />
          </PrimaryCta>
        ) : (
          <PrimaryCta
            className="border-0 bg-[#0077B5] text-white hover:bg-[#00669c]"
            onClick={connect}
            disabled={connecting}
          >
            {connecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Connecter LinkedIn"
            )}
          </PrimaryCta>
        )}
      </div>

      {!state.linkedinConnected ? (
        <SkipLink onClick={onNext} disabled={connecting}>
          Plus tard — vous pourrez le connecter depuis le tableau de bord
        </SkipLink>
      ) : null}
    </StepFrame>
  );
}

// ─── Step 5 — First prospects ────────────────────────────────────────────────

const SOURCE_OPTIONS: {
  id: "csv" | "extension";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}[] = [
  {
    id: "csv",
    icon: FileSpreadsheet,
    title: "Importer un fichier CSV",
    description:
      "Vous avez déjà une liste ? Importez-la et lancez votre première campagne dans la foulée.",
  },
  {
    id: "extension",
    icon: Puzzle,
    title: "Extraire depuis LinkedIn",
    description:
      "L’extension Andoxa récupère vos prospects directement depuis une recherche LinkedIn.",
  },
];

export function ProspectsPreviewStep({
  state,
  patch,
  onNext,
}: PreviewStepProps) {
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const select = (id: "csv" | "extension" | "later") => {
    patch({ source: id });
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(onNext, 280);
  };

  return (
    <StepFrame>
      <StepHeading
        title="Ajoutez vos premiers prospects."
        subtitle="Dernière étape — choisissez votre source, le reste se fait tout seul."
      />
      <div className="flex flex-col gap-3">
        {SOURCE_OPTIONS.map((opt) => {
          const active = state.source === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => select(opt.id)}
              aria-pressed={active}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-all",
                active
                  ? "border-primary ring-2 ring-primary/15"
                  : "border-border hover:border-muted-foreground/30 hover:shadow-md"
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                )}
              >
                <opt.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{opt.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {opt.description}
                </span>
              </span>
              {active ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          );
        })}
      </div>
      <SkipLink onClick={() => select("later")}>
        Explorer l’application d’abord
      </SkipLink>
    </StepFrame>
  );
}

// ─── Done ────────────────────────────────────────────────────────────────────

/** Mirrors the real flow's exits: CSV → campaign wizard, extension → CRM, else dashboard. */
const DONE_DESTINATIONS = {
  csv: { href: "/campaigns?new=campaign", label: "Lancer ma première campagne" },
  extension: { href: "/crm", label: "Ouvrir le CRM" },
  later: { href: "/dashboard", label: "Ouvrir le tableau de bord" },
} as const;

export function DonePreviewStep({ state, restart }: PreviewStepProps) {
  const destination =
    DONE_DESTINATIONS[state.source ?? "later"] ?? DONE_DESTINATIONS.later;

  const recap: { label: string; done: boolean }[] = [
    {
      label: state.trialStarted
        ? `Essai gratuit ${PLAN_PRESENTATION[state.plan ?? "solo"].tag} activé — ${TRIAL_DAYS} jours`
        : "Essai gratuit à activer",
      done: state.trialStarted,
    },
    {
      label: state.linkedinConnected
        ? "Compte LinkedIn connecté"
        : "LinkedIn à connecter (depuis le tableau de bord)",
      done: state.linkedinConnected,
    },
    {
      label:
        state.source === "csv"
          ? "Import CSV — votre campagne s’ouvre avec la liste préremplie"
          : state.source === "extension"
            ? "Extension LinkedIn — extrayez vos prospects depuis une recherche"
            : "Prospects à ajouter (CSV ou extension)",
      done: state.source === "csv" || state.source === "extension",
    },
  ];

  return (
    <StepFrame>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <Check
            className="size-7 text-emerald-600 dark:text-emerald-500"
            strokeWidth={2.5}
          />
        </span>
        <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          {state.company.trim()
            ? `${state.company.trim()} est prêt.`
            : "Votre espace est prêt."}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Votre prospection peut commencer dès maintenant.
        </p>
      </div>

      <ul className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        {recap.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5 text-sm">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                item.done
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className={cn(!item.done && "text-muted-foreground")}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-3">
        <Button
          asChild
          size="lg"
          className="h-11 w-full rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.99]"
        >
          <Link href={destination.href}>
            {destination.label}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <SkipLink onClick={restart}>Rejouer l’aperçu</SkipLink>
      </div>
    </StepFrame>
  );
}
