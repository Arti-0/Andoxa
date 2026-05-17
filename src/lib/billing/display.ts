import type { LucideIcon } from "lucide-react";
import { Sparkles, Crown, Building2, Clock, BadgeCheck } from "lucide-react";

/**
 * Visual presentation for each plan id. The key is the DB plan column value
 * (post M-PLAN-1: trial | solo | team | custom | demo). All callers should
 * look up by `(plan ?? "trial").toLowerCase()` to stay safe.
 */
export const PLAN_DISPLAY: Record<
    string,
    { label: string; icon: LucideIcon; accent: string }
> = {
    trial: {
        label: "Essai gratuit",
        icon: Clock,
        accent:
            "border-blue-500/40 text-blue-600 dark:border-blue-500/30 dark:text-blue-400",
    },
    solo: {
        label: "Solo",
        icon: Sparkles,
        accent:
            "border-blue-500/40 text-blue-600 dark:border-blue-500/30 dark:text-blue-400",
    },
    team: {
        label: "Team",
        icon: Crown,
        accent:
            "border-zinc-900/30 text-zinc-900 dark:border-white/30 dark:text-white",
    },
    custom: {
        label: "Custom",
        icon: Building2,
        accent:
            "border-amber-500/40 text-amber-700 dark:border-amber-500/30 dark:text-amber-400",
    },
    demo: {
        label: "Démo",
        icon: BadgeCheck,
        accent:
            "border-purple-500/40 text-purple-700 dark:border-purple-500/30 dark:text-purple-400",
    },
};

/** Fallback used when the DB column is null / unknown. */
export const PLAN_DISPLAY_FALLBACK = PLAN_DISPLAY.trial;

export const STATUS_DISPLAY: Record<string, string> = {
    active: "Actif",
    trialing: "Essai gratuit",
    past_due: "En retard",
    canceled: "Annulé",
    incomplete: "Incomplet",
    incomplete_expired: "Expiré",
    unpaid: "Impayé",
    paused: "En pause",
    pending: "En attente",
};
