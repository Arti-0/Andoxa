"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
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
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";
import { useWorkspace } from "@/lib/workspace";
import { planAllowsAutoEnrichOnImport } from "@/lib/enrichment/queue-helpers";
import { fetchLinkedInUsage } from "@/lib/linkedin/linkedin-usage";
import { getLinkedInInviteWeeklyUsageCap } from "@/lib/linkedin/limits";
import { DAILY_QUOTAS, getQuotaBarColor, getQuotaColor } from "@/lib/linkedin/quotas";
import { cn } from "@/lib/utils";

type LinkedInStatus =
  | "loading"
  | "connected"
  | "error"
  | "disconnected"
  | "unknown";

function LinkedInDailyActivitySection({ workspaceId }: { workspaceId: string | null }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [detailOpen, setDetailOpen] = useState(false);
  const { data: unipileMe } = useLinkedInAccount();
  const { data: usage, isLoading } = useQuery({
    queryKey: ["linkedin-usage", workspaceId],
    queryFn: fetchLinkedInUsage,
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });

  if (!workspaceId) {
    return null;
  }

  const weeklyCap = getLinkedInInviteWeeklyUsageCap(
    unipileMe?.linkedin_is_premium ?? false
  );

  if (isLoading || !usage) {
    return (
      <div className="flex flex-col gap-4 border-t border-zinc-200 pt-4 dark:border-white/10">
        <h3 className={settingsLabelClass}>Activité du jour</h3>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between gap-2">
                <div className="h-3 w-28 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
              </div>
              <div className="h-1.5 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const barDuration = reduceMotion ? 0 : 0.8;
  const textBaseDelay = reduceMotion ? 0 : 0.9;

  const rows: {
    label: string;
    used: number;
    max: number;
    footnote?: ReactNode;
  }[] = [
    {
      label: "Invitations",
      used: usage.invitations_sent,
      max: DAILY_QUOTAS.invitations,
    },
    {
      label: "Messages",
      used: usage.messages_sent,
      max: DAILY_QUOTAS.messages,
      footnote: (
        <span className="text-zinc-500 dark:text-zinc-400">
          Espacés aléatoirement pour éviter la détection
        </span>
      ),
    },
    {
      label: "Vues profil",
      used: usage.profile_views,
      max: DAILY_QUOTAS.profile_views,
    },
  ];

  return (
    <div className="flex flex-col gap-5 border-t border-zinc-200 pt-4 dark:border-white/10">
      <div>
        <h3 className={settingsLabelClass}>Activité du jour</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Compteurs indicatifs (jour UTC). Les vues de profil ne sont pas encore suivies.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {rows.map((row, index) => {
          const widthPct =
            row.max > 0 ? Math.min((row.used / row.max) * 100, 100) : 0;
          const stagger = index * 0.1;
          const ratioClass = cn(
            "shrink-0 text-right text-xs tabular-nums sm:text-sm",
            getQuotaColor(row.used, row.max)
          );

          return (
            <div key={row.label} className="flex flex-col gap-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {row.label}
                </span>
                <motion.span
                  className={ratioClass}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          duration: 0.35,
                          delay: textBaseDelay + stagger,
                          ease: "easeOut",
                        }
                  }
                >
                  {row.used} envoyés / {row.max} max aujourd&apos;hui
                </motion.span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    getQuotaBarColor(row.used, row.max)
                  )}
                  initial={reduceMotion ? { width: `${widthPct}%` } : { width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          duration: barDuration,
                          ease: "easeOut",
                          delay: stagger,
                        }
                  }
                />
              </div>
              {row.footnote ? (
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{row.footnote}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setDetailOpen((o) => !o)}
          className="self-start text-left text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          {detailOpen ? "Masquer ↑" : "Voir le détail ↓"}
        </button>

        {detailOpen ? (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left dark:border-white/10">
                    <th className="pb-2 pr-3 font-medium text-zinc-700 dark:text-zinc-200">
                      Source
                    </th>
                    <th className="pb-2 font-medium text-zinc-700 dark:text-zinc-200">
                      Invitations aujourd&apos;hui
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums text-zinc-800 dark:text-zinc-200">
                  <tr className="border-b border-zinc-100 dark:border-white/5">
                    <td className="py-2 pr-3">Via parcours</td>
                    <td className="py-2">{usage.invitations_workflow}</td>
                  </tr>
                  <tr className="border-b border-zinc-100 dark:border-white/5">
                    <td className="py-2 pr-3">Via CRM direct</td>
                    <td className="py-2">{usage.invitations_direct}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium">Total</td>
                    <td className="py-2 font-medium">
                      {usage.invitations_sent} / {DAILY_QUOTAS.invitations}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Cette semaine : {usage.invitations_week} / {weeklyCap} invitations
                (réinitialisation lundi)
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    getQuotaBarColor(usage.invitations_week, weeklyCap)
                  )}
                  style={{
                    width: `${weeklyCap > 0 ? Math.min((usage.invitations_week / weeklyCap) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Ces limites sont des recommandations conservatives. Les dépasser peut entraîner une
        restriction du compte LinkedIn.
      </p>
    </div>
  );
}

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

      {status === "connected" && (
        <LinkedInDailyActivitySection workspaceId={workspace?.id ?? null} />
      )}
    </SettingsCard>
  );
}
