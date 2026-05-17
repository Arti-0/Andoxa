"use client";

import { useCallback, useState } from "react";
import { CreditCard } from "lucide-react";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import {
  normalizeMarketingPaidPlanSlug,
  type PaidPlan,
} from "@/lib/config/stripe-plans";

/**
 * Shown when a user lands on `/onboarding` with an organization that's still
 * `status=pending`: we already know which plan they picked, all that's left
 * is the Stripe redirect. Keep this page deliberately minimal — single CTA,
 * one explanatory paragraph — so the user never wonders what they're
 * supposed to do next.
 */
export default function OnboardingResumeClient({
  planId,
}: {
  planId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only Solo/Team have a Stripe price. Custom shouldn't land here (it goes
  // through the contact form), but be defensive.
  const safePlanId: PaidPlan =
    normalizeMarketingPaidPlanSlug(planId) ?? "solo";

  const resume = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paiements/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId: safePlanId, billing: "monthly" }),
      });
      const json = (await res.json()) as {
        url?: string;
        redirect_url?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Impossible d’ouvrir Stripe.");
        setLoading(false);
        return;
      }
      if (json.redirect_url) {
        window.location.href = json.redirect_url;
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError("Réponse de checkout vide.");
      setLoading(false);
    } catch {
      setError("Erreur réseau.");
      setLoading(false);
    }
  }, [safePlanId]);

  return (
    <AuthShell
      eyebrow="Onboarding"
      title="Finaliser votre abonnement"
      subtitle="Votre organisation est en attente de paiement. Reprenez la session Stripe pour activer l’espace de travail."
      tone="message"
    >
      <div className="rounded-2xl border border-[var(--border)] bg-card p-6 shadow-[0_4px_18px_-12px_rgba(0,0,0,0.08)]">
        {error ? (
          <p
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={resume}
          disabled={loading}
          className="h-12 w-full text-base font-semibold"
        >
          {loading ? (
            "Redirection…"
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              Continuer vers Stripe
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Vous serez redirigé vers une page sécurisée pour finaliser votre
          abonnement.
        </p>
      </div>
    </AuthShell>
  );
}
