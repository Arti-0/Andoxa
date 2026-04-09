"use client";

import { useState } from "react";
import {
    SettingsCard,
    settingsSaveButtonClass,
} from "@/components/settings/settings-card";
import { cn } from "@/lib/utils";
import { PLAN_DISPLAY, STATUS_DISPLAY } from "@/lib/billing/display";

export function BillingSettingsSection({
    plan,
    subscriptionStatus,
}: {
    plan: string | null;
    subscriptionStatus: string | null;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const planKey = (plan ?? "free").toLowerCase();
    const display = PLAN_DISPLAY[planKey] ?? PLAN_DISPLAY.free;
    const PlanIcon = display.icon;
    const statusLabel =
        STATUS_DISPLAY[subscriptionStatus ?? ""] ??
        subscriptionStatus ??
        "—";

    const handleManageBilling = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/paiements/portal", {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur");
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("URL du portail non reçue");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'accès au portail"
            );
            setLoading(false);
        }
    };

    return (
        <SettingsCard
            title="Abonnement"
            description="Plan, facturation et portail Stripe"
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                    className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4",
                        display.accent
                    )}
                >
                    <PlanIcon className="h-6 w-6" />
                    <span className="text-lg font-semibold">{display.label}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Plan actuel
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
                    <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {statusLabel}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Statut
                    </span>
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex justify-end pt-1">
                <button
                    type="button"
                    onClick={handleManageBilling}
                    disabled={loading}
                    className={settingsSaveButtonClass}
                >
                    {loading ? "Redirection…" : "Gérer ma facturation"}
                </button>
            </div>
        </SettingsCard>
    );
}
