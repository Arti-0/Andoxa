"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const POLL_MS = 2500;
/** Webhook can lag; client can also activate via confirm-checkout */
const MAX_WAIT_MS = 120_000;

type ConfirmCheckoutData = {
  organization_id: string | null;
  status?: string;
  reason?: string | null;
};

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const cancelledRef = useRef(false);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    channelRef.current = null;

    const organizationIdFromUrl = searchParams.get("organization_id");
    const sessionIdFromUrl = searchParams.get("session_id");

    if (!organizationIdFromUrl && !sessionIdFromUrl) {
      setError(
        "Lien incomplet : la page doit inclure l’identifiant de session Stripe (session_id) et, si possible, celui de l’organisation. Revenez depuis la page des plans après paiement."
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let pollId: ReturnType<typeof setInterval> | null = null;
    let maxWaitId: ReturnType<typeof setTimeout> | null = null;

    const cleanupTimers = () => {
      if (pollId !== null) {
        clearInterval(pollId);
        pollId = null;
      }
      if (maxWaitId !== null) {
        clearTimeout(maxWaitId);
        maxWaitId = null;
      }
    };

    const unsubscribeChannel = () => {
      const ch = channelRef.current;
      if (ch) {
        void supabase.removeChannel(ch);
        channelRef.current = null;
      }
    };

    const redirectIfActive = async (
      organizationId: string
    ): Promise<boolean> => {
      if (cancelledRef.current) return true;
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("status")
        .eq("id", organizationId)
        .single();

      if (cancelledRef.current) return true;
      if (orgError || !org) return false;
      const status = (org as { status?: string }).status;
      if (status !== "active") return false;

      cleanupTimers();
      unsubscribeChannel();
      if (cancelledRef.current) return true;
      setLoading(false);
      router.refresh();
      router.push("/dashboard");
      return true;
    };

    void supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
      if (cancelledRef.current) return;
      if (authError || !user) {
        setError("Session requise. Connectez-vous pour finaliser.");
        setLoading(false);
        return;
      }

      void (async () => {
        let resolvedOrgId: string | null = organizationIdFromUrl;

        if (sessionIdFromUrl) {
          try {
            const res = await fetch("/api/paiements/confirm-checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                session_id: sessionIdFromUrl,
                ...(organizationIdFromUrl
                  ? { organization_id: organizationIdFromUrl }
                  : {}),
              }),
            });
            const json = (await res.json()) as {
              success?: boolean;
              data?: ConfirmCheckoutData;
              error?: { message?: string };
            };

            if (cancelledRef.current) return;

            if (res.ok && json.success && json.data) {
              const d = json.data;
              if (d.organization_id) {
                resolvedOrgId = d.organization_id;
              }
              if (d.status === "active") {
                setLoading(false);
                router.refresh();
                router.push("/dashboard");
                return;
              }
            } else if (!res.ok && res.status !== 401 && res.status !== 403) {
              console.warn(
                "[success] confirm-checkout:",
                res.status,
                json.error?.message
              );
            }
          } catch (e) {
            console.warn("[success] confirm-checkout fetch failed", e);
          }
        }

        if (cancelledRef.current) return;

        if (!resolvedOrgId) {
          setError(
            "Impossible de déterminer l’organisation. Utilisez le lien fourni après le paiement (il doit contenir session_id)."
          );
          setLoading(false);
          return;
        }

        const { data: orgRow, error: orgError } = await supabase
          .from("organizations")
          .select("status")
          .eq("id", resolvedOrgId)
          .single();

        if (cancelledRef.current) return;
        if (orgError || !orgRow) {
          setError("Organisation introuvable");
          setLoading(false);
          return;
        }

        if ((orgRow as { status?: string }).status === "active") {
          setLoading(false);
          router.refresh();
          router.push("/dashboard");
          return;
        }

        const orgIdForWatch = resolvedOrgId;

        maxWaitId = setTimeout(() => {
          if (cancelledRef.current) return;
          cleanupTimers();
          unsubscribeChannel();
          setTimeoutReached(true);
          setLoading(false);
          setError("L'activation prend trop de temps.");
        }, MAX_WAIT_MS);

        pollId = setInterval(() => {
          void redirectIfActive(orgIdForWatch);
        }, POLL_MS);

        const ch = supabase
          .channel(`org-status-${orgIdForWatch}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "organizations",
              filter: `id=eq.${orgIdForWatch}`,
            },
            (payload) => {
              const updatedOrg = payload.new as { status: string };
              if (updatedOrg.status === "active") {
                void redirectIfActive(orgIdForWatch);
              }
            }
          )
          .subscribe();
        channelRef.current = ch;
      })();
    });

    return () => {
      cancelledRef.current = true;
      cleanupTimers();
      const ch = channelRef.current;
      if (ch) {
        void supabase.removeChannel(ch);
        channelRef.current = null;
      }
    };
  }, [searchParams, router]);

  const shell =
    "min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6";

  if (loading && !timeoutReached) {
    return (
      <div className={shell}>
        <Loader2 className="h-9 w-9 animate-spin text-white/75" aria-hidden />
        <p className="mt-6 text-center text-base font-medium text-white/90">
          Finalisation du paiement
        </p>
        <p className="mt-2 max-w-sm text-center text-sm text-white/70">
          Nous vérifions votre paiement auprès de Stripe et activons votre
          espace. Redirection automatique vers le tableau de bord.
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6">
          <Loader2 className="h-9 w-9 animate-spin text-white/75" />
          <p className="mt-6 text-sm text-white/70">Chargement…</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
