"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const organizationId = searchParams.get("organization_id");

    if (!organizationId) {
      setError("Lien incomplet");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
      if (authError || !user) {
        router.push("/auth/login");
        return;
      }

      timeoutId = setTimeout(() => {
        setTimeoutReached(true);
        setLoading(false);
        setError("L'activation prend trop de temps.");
      }, 30000);

      supabase
        .from("organizations")
        .select("status, subscription_status")
        .eq("id", organizationId)
        .single()
        .then(({ data: org, error: orgError }) => {
          if (orgError) {
            if (timeoutId) clearTimeout(timeoutId);
            setError("Organisation introuvable");
            setLoading(false);
            return;
          }

          const orgData = org as { status?: string } | null;
          if (orgData?.status === "active") {
            if (timeoutId) clearTimeout(timeoutId);
            router.refresh();
            router.push("/dashboard");
            return;
          }

          channel = supabase
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
                const updatedOrg = payload.new as { status: string };
                if (updatedOrg.status === "active") {
                  if (timeoutId) clearTimeout(timeoutId);
                  channel?.unsubscribe();
                  router.refresh();
                  setTimeout(() => router.push("/dashboard"), 400);
                }
              }
            )
            .subscribe();
        });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      channel?.unsubscribe();
    };
  }, [searchParams, router]);

  const shell = "min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6";

  if (loading && !timeoutReached) {
    return (
      <div className={shell}>
        <Loader2 className="h-9 w-9 animate-spin text-white/75" aria-hidden />
        <p className="mt-6 text-center text-base font-medium text-white/90">
          Finalisation du paiement
        </p>
        <p className="mt-2 max-w-sm text-center text-sm text-white/70">
          Redirection automatique vers le tableau de bord.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shell}>
        <p className="text-center text-lg font-semibold text-white/90">
          {timeoutReached ? "Délai dépassé" : "Impossible de continuer"}
        </p>
        <p className="mt-3 max-w-sm text-center text-sm text-white/70">
          {error}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            className="border-white/25 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/onboarding/plan")}
          >
            Plans
          </Button>
          <Button
            className="bg-white/90 text-slate-950 hover:bg-white"
            onClick={() => router.push("/dashboard")}
          >
            Tableau de bord
          </Button>
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6">
          <Loader2 className="h-9 w-9 animate-spin text-white/75" />
          <p className="mt-6 text-sm text-white/70">Chargement…</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
