"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { planAnnualSavingsPercent } from "@/lib/config/plans-config";

export type Billing = "monthly" | "annual";

/** Mensuel / Annuel segmented toggle for the pricing surfaces. */
export function BillingToggle({
  value,
  onChange,
}: {
  value: Billing;
  onChange: (v: Billing) => void;
}) {
  const savingsBadge = `−${planAnnualSavingsPercent("solo")}%`;
  return (
    <div
      role="tablist"
      aria-label="Cadence de facturation"
      className="relative inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-card p-1 text-sm font-medium"
    >
      <Pill active={value === "monthly"} onClick={() => onChange("monthly")}>
        Mensuel
      </Pill>
      <Pill active={value === "annual"} onClick={() => onChange("annual")}>
        Annuel
        <span
          className={cn(
            "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
            value === "annual" ? "bg-white/20 text-white" : "bg-emerald-500 text-white",
          )}
        >
          {savingsBadge}
        </span>
      </Pill>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center rounded-full px-3.5 py-1.5 transition-colors",
        active ? "text-white" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          aria-hidden="true"
          layoutId="site-billing-pill"
          className="absolute inset-0 rounded-full bg-[var(--brand-blue)]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center">{children}</span>
    </button>
  );
}
