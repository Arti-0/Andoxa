"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./settings-card";

type GoogleStatusPayload = {
  connected: boolean;
  email: string | null;
  configured: boolean;
};

export function GoogleCalendarSettingsSection() {
  const searchParams = useSearchParams();
  const toastShownRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<GoogleStatusPayload | null>(null);

  useEffect(() => {
    if (toastShownRef.current) return;
    const p = searchParams?.get("google_connected");
    if (p === "1") {
      toast.success("Google Calendar connecté.");
      toastShownRef.current = true;
    } else if (p === "0") {
      toast.error("La connexion Google Calendar a échoué. Réessayez.");
      toastShownRef.current = true;
    }
  }, [searchParams]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/google/status", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setStatus({ connected: false, email: null, configured: false });
        return;
      }
      setStatus(json.data as GoogleStatusPayload);
    } catch {
      setStatus({ connected: false, email: null, configured: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    setConnecting(true);
    window.location.href = "/api/google/auth";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/google/auth", { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error("Impossible de déconnecter Google Calendar");
        return;
      }
      toast.success("Google Calendar déconnecté");
      await fetchStatus();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setDisconnecting(false);
    }
  };

  const configured = !loading && Boolean(status?.configured);
  const connected = Boolean(status?.connected);

  return (
    <SettingsCard
      title="Google Calendar"
      description="Génération automatique de liens Meet pour vos rendez-vous"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-400/15">
              <Calendar className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              {loading ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Vérification…</p>
              ) : !configured ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Connexion Google indisponible (configuration serveur).
                </p>
              ) : connected ? (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="size-4 shrink-0" />
                    Connecté
                  </div>
                  {status?.email ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{status.email}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Non connecté</p>
              )}
            </div>
          </div>
          {!loading && configured ? (
            <div className="flex flex-wrap gap-2">
              {connected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disconnecting}
                  onClick={() => void handleDisconnect()}
                >
                  {disconnecting ? <Loader2 className="size-4 animate-spin" /> : "Déconnecter"}
                </Button>
              ) : (
                <Button type="button" size="sm" disabled={connecting} onClick={handleConnect}>
                  {connecting ? <Loader2 className="size-4 animate-spin" /> : "Connecter Google Calendar"}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {configured && connected ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Les liens Google Meet sont générés automatiquement pour chaque nouveau rendez-vous.
          </p>
        ) : null}

        {configured && !connected && !loading ? (
          <div className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              Sans connexion Google Calendar, les confirmations de rendez-vous n&apos;incluront pas de lien Meet.
            </p>
          </div>
        ) : null}
      </div>
    </SettingsCard>
  );
}
