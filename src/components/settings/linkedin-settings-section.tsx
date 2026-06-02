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
    ChevronDown,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IntegrationCard } from "./integration-card";
import { LinkedInMark } from "@/lib/utils/onboarding-helpers";
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";
import { useWorkspace } from "@/lib/workspace";
import { planAllowsAutoEnrichOnImport } from "@/lib/enrichment/queue-helpers";
import { fetchLinkedInUsage } from "@/lib/linkedin/linkedin-usage";
import { getLinkedInInviteWeeklyUsageCap } from "@/lib/linkedin/limits";
import {
    DAILY_QUOTAS,
    getQuotaBarColor,
    getQuotaColor,
} from "@/lib/linkedin/quotas";
import { cn } from "@/lib/utils";

type LinkedInStatus =
    | "loading"
    | "connected"
    | "error"
    | "disconnected"
    | "unknown";

function LinkedInDailyActivitySection({
    workspaceId,
}: {
    workspaceId: string | null;
}) {
    const reduceMotion = useReducedMotion() ?? false;
    const [detailOpen, setDetailOpen] = useState(false);
    const { data: unipileMe } = useLinkedInAccount();
    const { data: usage, isLoading } = useQuery({
        queryKey: ["linkedin-usage", workspaceId],
        queryFn: fetchLinkedInUsage,
        enabled: !!workspaceId,
        staleTime: 60 * 1000,
    });

    if (!workspaceId) return null;

    const weeklyCap = getLinkedInInviteWeeklyUsageCap(
        unipileMe?.linkedin_tier ?? "standard"
    );

    // The card structure renders immediately; only the *used* counts load.
    const rows: {
        label: string;
        used: number | null;
        max: number;
        note?: ReactNode;
    }[] = [
        {
            label: "Invitations",
            used: usage?.invitations_sent ?? null,
            max: DAILY_QUOTAS.invitations,
            note: "envoyées",
        },
        {
            label: "Messages",
            used: usage?.messages_sent ?? null,
            max: DAILY_QUOTAS.messages,
            note: "envoyés",
        },
        {
            label: "Vues profil",
            used: usage?.profile_views ?? null,
            max: DAILY_QUOTAS.profile_views,
            note: "effectuées",
        },
    ];

    return (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="mb-1 flex items-end justify-between">
                <div>
                    <h4 className="text-[13.5px] font-semibold tracking-[-0.005em]">
                        Activité du jour
                    </h4>
                    <p className="mt-px text-xs text-muted-foreground">
                        Compteurs indicatifs (jour UTC) — réinitialisés à
                        minuit.
                    </p>
                </div>
                <Badge variant="outline" className="gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Temps réel
                </Badge>
            </div>

            <div className="flex flex-col gap-3.5">
                {rows.map((row, index) => {
                    const used = row.used;
                    const widthPct =
                        used != null && row.max > 0
                            ? Math.min((used / row.max) * 100, 100)
                            : 0;
                    const stagger = index * 0.1;

                    return (
                        <div key={row.label}>
                            <div className="mb-1.5 flex items-baseline justify-between">
                                <span className="text-[13.5px] font-medium">
                                    {row.label}
                                </span>
                                <span
                                    className={cn(
                                        "font-mono text-xs",
                                        used != null
                                            ? getQuotaColor(used, row.max)
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <span className="text-foreground">
                                        {used != null ? (
                                            used
                                        ) : (
                                            <span className="inline-block h-3 w-5 animate-pulse rounded bg-muted align-middle" />
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {" "}
                                        / {row.max} max
                                    </span>
                                </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                {used == null ? (
                                    <div className="h-full w-1/3 animate-pulse rounded-full bg-muted-foreground/25" />
                                ) : (
                                    <motion.div
                                        className={cn(
                                            "h-full rounded-full",
                                            getQuotaBarColor(used, row.max)
                                        )}
                                        initial={
                                            reduceMotion
                                                ? { width: `${widthPct}%` }
                                                : { width: 0 }
                                        }
                                        animate={{ width: `${widthPct}%` }}
                                        transition={
                                            reduceMotion
                                                ? { duration: 0 }
                                                : {
                                                      duration: 0.8,
                                                      ease: "easeOut",
                                                      delay: stagger,
                                                  }
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={() => setDetailOpen((d) => !d)}
                className="mt-1 inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
                <ChevronDown
                    className="size-3 transition-transform"
                    style={{
                        transform: detailOpen
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                    }}
                />
                {detailOpen ? "Masquer le détail" : "Voir le détail"}
            </button>

            {detailOpen ? (
                <div className="rounded-[9px] bg-muted/60 p-3 text-[12.5px] leading-[1.55] text-muted-foreground">
                    <strong className="text-foreground">
                        Stratégie conservative.
                    </strong>{" "}
                    Les actions sont espacées aléatoirement (3–8 min) pour
                    mimer un usage humain et éviter la détection. Cette
                    semaine : {usage ? usage.invitations_week : "…"} /{" "}
                    {weeklyCap} invitations (réinitialisation lundi). Dépasser
                    ces limites peut entraîner une restriction temporaire du
                    compte LinkedIn.
                </div>
            ) : null}
        </div>
    );
}

export function LinkedInSettingsSection() {
    const { profile, workspace, refresh } = useWorkspace();
    const { data: unipileMe } = useLinkedInAccount();
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
            const res = await fetch("/api/unipile/me", {
                credentials: "include",
            });
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
                headers: { "Content-Type": "application/json" },
                // Return the user to /settings after the Hosted Auth flow
                // (default lands on /onboarding, which is wrong for reconnects).
                body: JSON.stringify({ redirect: "/settings" }),
            });
            const json = await res.json();
            const data = json?.data ?? json;
            const url = (data as { url?: string })?.url;
            if (url) {
                window.location.href = url;
                return;
            }
            toast.error(
                (json?.error?.message as string) ??
                    "Impossible de lancer LinkedIn"
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

    const statusBadge =
        status === "connected" ? (
            <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
                <Check className="size-3" />
                Connecté
            </Badge>
        ) : status === "error" ? (
            <Badge
                variant="outline"
                className="gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
            >
                <AlertTriangle className="size-3" />
                Erreur
            </Badge>
        ) : status !== "loading" ? (
            <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-muted-foreground" />
                Non connecté
            </Badge>
        ) : null;

    const action = (
        <Button
            type="button"
            variant={status === "connected" ? "outline" : "default"}
            size="sm"
            disabled={connecting || status === "loading"}
            onClick={handleConnect}
            className="gap-1.5"
        >
            {connecting ? (
                <Loader2 className="size-3.5 animate-spin" />
            ) : (
                <Link2 className="size-3.5" />
            )}
            {status === "connected" ? "Reconnecter" : "Connecter LinkedIn"}
        </Button>
    );

    const accountName =
        (unipileMe as { name?: string | null } | undefined)?.name ??
        (unipileMe as { full_name?: string | null } | undefined)?.full_name ??
        profile?.full_name ??
        "Compte LinkedIn";
    const accountAvatar =
        (unipileMe as { picture_url?: string | null } | undefined)
            ?.picture_url ?? null;
    const tier = unipileMe?.linkedin_tier ?? "standard";
    const tierLabel =
        tier === "sales_navigator"
            ? "Sales Navigator"
            : tier === "premium"
              ? "Premium"
              : "Standard";

    return (
        <IntegrationCard
            logo={
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0077B5]/12 text-[#0077B5]">
                    <LinkedInMark className="size-5" />
                </div>
            }
            name="LinkedIn"
            sub="Connexion pour la prospection et l'automatisation"
            status={statusBadge}
            action={action}
        >
            {status === "connected" ? (
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Avatar className="size-9 shrink-0">
                        <AvatarImage src={accountAvatar ?? undefined} alt="" />
                        <AvatarFallback className="text-xs">
                            {(accountName?.[0] ?? "L").toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium">
                            {accountName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Compte {tierLabel.toLowerCase()} · session active
                        </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                        {tierLabel}
                    </Badge>
                </div>
            ) : status === "error" && errorMsg ? (
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
            ) : status !== "loading" ? (
                <p className="text-[13px] text-muted-foreground">
                    Connectez LinkedIn pour activer la prospection automatisée
                    et l&apos;enrichissement.
                </p>
            ) : null}

            {status === "connected" && isPlanEligible ? (
                <div className="flex items-start gap-3.5 border-b border-border pb-4">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-orange-500/10 text-orange-600 dark:text-orange-400">
                        <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                                Enrichissement automatique à l&apos;import
                            </span>
                            <Badge
                                variant="outline"
                                className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400"
                            >
                                Pro+
                            </Badge>
                        </div>
                        <p className="mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
                            Enrichit chaque prospect importé via LinkedIn ou
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
            ) : null}

            {status === "connected" ? (
                <LinkedInDailyActivitySection
                    workspaceId={workspace?.id ?? null}
                />
            ) : null}
        </IntegrationCard>
    );
}
