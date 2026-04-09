"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, AlertTriangle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./settings-card";
import { WhatsAppMark } from "@/lib/utils/onboarding-helpers";

type WhatsAppStatus =
  | "loading"
  | "connected"
  | "error"
  | "disconnected"
  | "unknown";

export function WhatsAppSettingsSection() {
  const searchParams = useSearchParams();
  const toastShownRef = useRef(false);
  const [status, setStatus] = useState<WhatsAppStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (toastShownRef.current) return;
    const waParam = searchParams?.get("whatsapp_connected");
    if (waParam === "1") {
      toast.success("WhatsApp connecté avec succès !");
      toastShownRef.current = true;
    } else if (waParam === "0") {
      toast.error("La connexion WhatsApp a échoué. Réessayez.");
      toastShownRef.current = true;
    }
  }, [searchParams]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/unipile/me", { credentials: "include" });
      if (!res.ok) {
        setStatus("unknown");
        return;
      }
      const json = await res.json();
      const data = json?.data ?? json;
      const s = data?.whatsapp_status ?? "unknown";
      setStatus(
        s === "connected"
          ? "connected"
          : s === "error" || s === "stopped"
            ? "error"
            : s === "disconnected"
              ? "disconnected"
              : "unknown"
      );
      setErrorMsg(data?.whatsapp_error ?? null);
    } catch {
      setStatus("unknown");
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status === "connected") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [status, fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/unipile/connect-whatsapp", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      const data = json?.data ?? json;
      const url = (data as { url?: string })?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      toast.error(
        (json?.error?.message as string) ?? "Impossible de lancer WhatsApp"
      );
    } catch {
      toast.error("Connexion WhatsApp impossible");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SettingsCard
      title="WhatsApp"
      description="Messagerie instantanée depuis votre CRM"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#25D366]/10 dark:bg-[#25D366]/15">
            <WhatsAppMark className="size-5 text-[#25D366]" />
          </div>
          <div>
            {status === "loading" && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Vérification…
              </p>
            )}
            {status === "connected" && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-4" /> Connecté
              </div>
            )}
            {status === "error" && (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  <AlertTriangle className="size-4" /> Erreur de connexion
                </div>
                {errorMsg && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {errorMsg}
                  </p>
                )}
              </div>
            )}
            {(status === "disconnected" || status === "unknown") && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Non connecté
              </p>
            )}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant={status === "connected" ? "outline" : "default"}
          disabled={connecting || status === "loading"}
          onClick={handleConnect}
          className="shrink-0 gap-2"
        >
          {connecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          {status === "connected" ? "Reconnecter" : "Connecter WhatsApp"}
        </Button>
      </div>
    </SettingsCard>
  );
}
