"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import type { Billing } from "@/components/marketing/pricing/billing-toggle";

const MIN = 3;
const MAX = 20;
const DEFAULT = 3;

/** Team-size calculator embedded in the Team pricing card. */
export function MarketingTeamCalculator({
  pricePerUser,
  monthlyPricePerUser,
  billing,
}: {
  pricePerUser: number;
  monthlyPricePerUser: number;
  billing: Billing;
}) {
  const [users, setUsers] = React.useState(DEFAULT);
  const total = pricePerUser * users;
  const fillPct = ((users - MIN) / (MAX - MIN)) * 100;
  const annualSaving =
    billing === "annual" ? (monthlyPricePerUser - pricePerUser) * users * 12 : 0;

  const dec = () => setUsers((u) => Math.max(MIN, u - 1));
  const inc = () => setUsers((u) => Math.min(MAX, u + 1));

  return (
    <div className="mt-7 rounded-xl border border-[var(--border)] bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <label htmlFor="team-users-v2" className="text-sm font-medium text-foreground">
          Combien d&apos;utilisateurs&nbsp;?
        </label>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={users}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-lg font-semibold tabular text-foreground"
          >
            {users}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <StepperButton aria-label="Diminuer" onClick={dec} disabled={users === MIN}>
          <Minus size={16} />
        </StepperButton>
        <input
          id="team-users-v2"
          type="range"
          min={MIN}
          max={MAX}
          value={users}
          onChange={(e) => setUsers(Number(e.target.value))}
          aria-label="Nombre d'utilisateurs"
          className="andoxa-range flex-1"
          style={{ ["--range-fill" as string]: `${fillPct}%` }}
        />
        <StepperButton aria-label="Augmenter" onClick={inc} disabled={users === MAX}>
          <Plus size={16} />
        </StepperButton>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{MIN} utilisateurs</span>
        <span>{MAX}+</span>
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
          <p className="flex items-baseline gap-1 whitespace-nowrap">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={total}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="font-display text-2xl font-medium tabular text-foreground"
              >
                {total}&nbsp;€
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-muted-foreground">/mois</span>
          </p>
        </div>

        {annualSaving > 0 && (
          <div className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(5,150,105,0.4)]">
            <span aria-hidden="true">↓</span>
            Économisez {annualSaving}&nbsp;€/an vs mensuel
          </div>
        )}
      </div>
    </div>
  );
}

function StepperButton({
  children,
  onClick,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-card text-foreground transition-colors hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-tint)]/40 hover:text-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}
