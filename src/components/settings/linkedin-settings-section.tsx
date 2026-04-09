"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Check,
  Loader2,
  AlertTriangle,
  Link2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import {
  SettingsCard,
  settingsLabelClass,
} from "./settings-card";
import { LinkedInMark } from "@/lib/utils/onboarding-helpers";
import { useWorkspace } from "@/lib/workspace";
import { planAllowsAutoEnrichOnImport } from "@/lib/enrichment/queue-helpers";

type LinkedInStatus =
  | "loading"
  | "connected"
  | "error"
  | "disconnected"
  | "unknown";

export function LinkedInSettingsSection() {
  const { profile, workspace, refresh } = useWorkspace();
  const [status, setStatus] = useState<LinkedInStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [autoEnrich, setAutoEnrich] = useState(
    profile?.linkedin_auto_enrich ?? false
  );
  const [savingEnrich, setSavingEnrich] = useState(false);

  const isPlanEligible = planAllowsAutoEnrichOnImport(
    workspace?.plan,
    workspace?.subscription_status
  );

  useEffect(() => {
    setAutoEnrich(profile?.linkedin_auto_enrich ?? false);
  }, [profile?.linkedin_auto_enrich]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/unipile/me", { credentials: "include" });
      if (!res.ok) {
        setStatus("unknown");
        return;
      }
      const json = await res.json();
      const data = json?.data ?? json;
      const s = data?.linkedin_status ?? "unknown";
      setStatus(
        s === "connected"
          ? "connected"
          : s === "error" || s === "stopped"
            ? "error"
            : s === "disconnected"
              ? "disconnected"
              : "unknown"
      );
      setErrorMsg(data?.linkedin_error ?? null);
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
      const res = await fetch("/api/unipile/connect-linkedin", {
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
        (json?.error?.message as string) ?? "Impossible de lancer LinkedIn"
      );
    } catch {
      toast.error("Connexion LinkedIn impossible");
    } finally {
      setConnecting(false);
    }
  };

  const handleAutoEnrichChange = async (checked: boolean) => {
    setSavingEnrich(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin_auto_enrich: checked }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Erreur");
      }
      setAutoEnrich(checked);
      toast.success(
        checked
          ? "Enrichissement auto activé"
          : "Enrichissement auto désactivé"
      );
      await refresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingEnrich(false);
    }
  };

  return (
    <SettingsCard
      title="LinkedIn"
      description="Connexion pour la prospection et l'automatisation"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#0077B5]/10 dark:bg-[#0077B5]/15">
            <LinkedInMark className="size-5 text-[#0077B5]" />
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
          {status === "connected" ? "Reconnecter" : "Connecter LinkedIn"}
        </Button>
      </div>

      {status === "connected" && isPlanEligible && (
        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <span className={settingsLabelClass}>
                Enrichissement automatique à l&apos;import
              </span>
              <PremiumBadge variant="small" showStar={false}>
                Pro+
              </PremiumBadge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Enrichit automatiquement chaque prospect importé via LinkedIn ou
              CSV. Limité à ~100 profils/jour (limite LinkedIn).
            </p>
          </div>
          <Switch
            checked={autoEnrich}
            disabled={savingEnrich}
            onCheckedChange={handleAutoEnrichChange}
            aria-label="Enrichissement automatique à l'import"
            className="shrink-0"
          />
        </div>
      )}
    </SettingsCard>
  );
}
