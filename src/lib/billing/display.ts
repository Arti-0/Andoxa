import type { LucideIcon } from "lucide-react";
import { CreditCard, Sparkles, Crown, Building2 } from "lucide-react";

export const PLAN_DISPLAY: Record<
    string,
    { label: string; icon: LucideIcon; accent: string }
> = {
    free: {
        label: "Gratuit",
        icon: CreditCard,
        accent:
            "border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-zinc-400",
    },
    starter: {
        label: "Starter",
        icon: Sparkles,
        accent:
            "border-blue-500/40 text-blue-600 dark:border-blue-500/30 dark:text-blue-400",
    },
    pro: {
        label: "Pro",
        icon: Crown,
        accent:
            "border-zinc-900/30 text-zinc-900 dark:border-white/30 dark:text-white",
    },
    enterprise: {
        label: "Enterprise",
        icon: Building2,
        accent:
            "border-amber-500/40 text-amber-700 dark:border-amber-500/30 dark:text-amber-400",
    },
};

export const STATUS_DISPLAY: Record<string, string> = {
    active: "Actif",
    trialing: "Essai gratuit",
    past_due: "En retard",
    canceled: "Annulé",
    incomplete: "Incomplet",
    incomplete_expired: "Expiré",
    unpaid: "Impayé",
    paused: "En pause",
};
