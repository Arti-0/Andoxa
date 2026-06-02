"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntegrationCard } from "./integration-card";

type GoogleStatusPayload = {
    connected: boolean;
    email: string | null;
    configured: boolean;
};

function GoogleLogo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
            <path
                fill="#4285F4"
                d="M21.35 11.1H12v3.18h5.59c-.26 1.65-1.97 4.82-5.59 4.82-3.37 0-6.12-2.79-6.12-6.22S8.63 6.66 12 6.66c1.92 0 3.2.82 3.94 1.52l2.69-2.6C16.97 4.04 14.71 3 12 3 6.96 3 2.89 7.07 2.89 12.11s4.07 9.11 9.11 9.11c5.26 0 8.74-3.69 8.74-8.89 0-.6-.06-1.06-.14-1.52z"
            />
        </svg>
    );
}

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
            const res = await fetch("/api/google/status", {
                credentials: "include",
            });
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
            const res = await fetch("/api/google/auth", {
                method: "DELETE",
                credentials: "include",
            });
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

    const statusBadge = loading ? null : connected ? (
        <Badge
            variant="outline"
            className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
        >
            <Check className="size-3" />
            Connecté
        </Badge>
    ) : (
        <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Non connecté
        </Badge>
    );

    const action =
        !configured || loading ? null : connected ? (
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disconnecting}
                onClick={() => void handleDisconnect()}
                className="gap-1.5"
            >
                {disconnecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Déconnecter
            </Button>
        ) : null;

    return (
        <IntegrationCard
            logo={
                <div className="flex size-9 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logos/google-calendar.svg"
                        alt="Google Calendar"
                        className="size-5"
                    />
                </div>
            }
            name="Google Calendar"
            sub="Génération automatique de liens Meet pour vos rendez-vous"
            status={statusBadge}
            action={action}
        >
            {!configured && !loading ? (
                <p className="text-[13px] text-muted-foreground">
                    Connexion Google indisponible (configuration serveur).
                </p>
            ) : null}

            {configured && !connected && !loading ? (
                <>
                    <div className="flex items-start gap-3 rounded-[10px] border border-amber-200/80 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-amber-900 dark:text-amber-200">
                                Aucun lien Meet dans vos confirmations
                            </div>
                            <p className="mt-0.5 text-[12.5px] leading-[1.5] text-amber-800/90 dark:text-amber-300/90">
                                Sans connexion Google Calendar, les
                                confirmations de rendez-vous envoyées à vos
                                prospects n&apos;incluront pas de lien Meet.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        disabled={connecting}
                        onClick={handleConnect}
                        className="gap-2 self-start"
                    >
                        {connecting ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <GoogleLogo className="size-4" />
                        )}
                        Connecter Google Calendar
                    </Button>
                </>
            ) : null}

            {configured && connected ? (
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-foreground">
                            {status?.email ?? "Compte Google lié"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Liens Meet générés automatiquement pour chaque
                            rendez-vous
                        </div>
                    </div>
                </div>
            ) : null}
        </IntegrationCard>
    );
}
