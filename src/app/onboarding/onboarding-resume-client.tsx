"use client";

import { useCallback, useState } from "react";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function OnboardingResumeClient({
  planId,
}: {
  planId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resume = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paiements/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId, frequency: "monthly" }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Impossible d’ouvrir Stripe.");
        setLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Erreur réseau.");
      setLoading(false);
    }
  }, [planId]);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />

      <div className="relative w-full overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="color" />
          ))}
        </div>

        <div className="relative z-10">
          <section className="scroll-mt-24 py-24 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                  Finaliser votre abonnement
                </h1>
                <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                  Votre organisation est en attente de paiement. Reprenez la session Stripe pour activer
                  l’espace de travail.
                </p>
              </div>

              <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <CreditCard className="h-6 w-6" />
                    Paiement Stripe
                  </CardTitle>
                  <CardDescription className="text-base">
                    Vous serez redirigé vers une page sécurisée pour finaliser l’abonnement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {error ? (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    onClick={resume}
                    disabled={loading}
                    className="w-full btn-neumorphism glassmorphism btn-gradient-border h-12 text-base font-semibold"
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
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
