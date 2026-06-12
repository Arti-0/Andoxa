"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Display copy for the trial length. Mirrors STRIPE_CONFIG.trial.durationDays
 * (server-only env default 14) — the client bundle can't read that env var.
 */
export const TRIAL_DAYS_LABEL = 14;

export function StepHeading({
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

export function PrimaryCta({
  children,
  loading,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button
      type="button"
      size="lg"
      className="h-11 w-full rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.99]"
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        children
      )}
    </Button>
  );
}

export function TrialBadge() {
  return (
    <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      <Sparkles className="size-3.5" />
      {TRIAL_DAYS_LABEL} jours d’essai gratuit — sans carte bancaire
    </span>
  );
}
