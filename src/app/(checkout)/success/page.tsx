"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const organizationId = searchParams.get("organization_id");

    if (!organizationId) {
      setError("Paramètres de session manquants");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Verify user is authenticated
    supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
      if (authError || !user) {
        router.push("/auth/login");
        return;
      }

      // Set up timeout (30 seconds)
      const timeoutId = setTimeout(() => {
        setTimeoutReached(true);
        setLoading(false);
        setError(
          "L'activation prend plus de temps que prévu. Veuillez réessayer dans quelques instants."
        );
      }, 30000);

      // Check initial status
      supabase
        .from("organizations")
        .select("status, subscription_status")
        .eq("id", organizationId)
        .single()
        .then(({ data: org, error: orgError }) => {
          if (orgError) {
            clearTimeout(timeoutId);
            setError("Erreur lors de la vérification de l'organisation");
            setLoading(false);
            return;
          }

          const orgData = org as { status?: string; subscription_status?: string | null } | null;
          // If already active, redirect immediately
          if (orgData?.status === "active") {
            clearTimeout(timeoutId);
            router.refresh();
            router.push("/dashboard");
            return;
          }

          // Set up Realtime subscription to listen for organization status changes
          const channel = supabase
            .channel(`org-status-${organizationId}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "organizations",
                filter: `id=eq.${organizationId}`,
              },
              (payload) => {
                const updatedOrg = payload.new as {
                  status: string;
                  subscription_status: string | null;
                };

                console.log(
                  "[CheckoutSuccess] Organization status updated:",
                  updatedOrg
                );

                // If organization is now active, redirect
                if (updatedOrg.status === "active") {
                  clearTimeout(timeoutId);
                  channel.unsubscribe();
                  router.refresh();
                  // Small delay to let refresh complete
                  setTimeout(() => {
                    router.push("/dashboard");
                  }, 500);
                }
              }
            )
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                console.log(
                  "[CheckoutSuccess] Subscribed to organization status changes"
                );
              }
            });

          // Cleanup function
          return () => {
            clearTimeout(timeoutId);
            channel.unsubscribe();
          };
        });
    });

    // Cleanup on unmount
    return () => {
      // Cleanup is handled in the nested promise chain
    };
  }, [searchParams, router]);

  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <LoadingSpinner text="Activation en cours..." />
          <p className="mt-4 text-sm text-muted-foreground">
            Votre paiement a été confirmé. Nous activons votre organisation.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Cette opération peut prendre quelques instants. Vous serez automatiquement redirigé.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            {timeoutReached ? "Temps d'attente dépassé" : "Erreur"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => router.push("/onboarding/plan")}
              variant="outline"
            >
              Retour aux plans
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              Aller au dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <LoadingSpinner text="Chargement..." />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
