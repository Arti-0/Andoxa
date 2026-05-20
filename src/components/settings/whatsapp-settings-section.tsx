"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
    Check,
    Loader2,
    AlertTriangle,
    Link2,
    MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntegrationCard } from "./integration-card";
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
            const res = await fetch("/api/unipile/me", {
                credentials: "include",
            });
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
                (json?.error?.message as string) ??
                    "Impossible de lancer WhatsApp"
            );
        } catch {
            toast.error("Connexion WhatsApp impossible");
        } finally {
            setConnecting(false);
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
            {status === "connected" ? "Reconnecter" : "Connecter WhatsApp"}
        </Button>
    );

    return (
        <IntegrationCard
            logo={
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#25D366]/15 text-[#128C7E]">
                    <WhatsAppMark className="size-[18px]" />
                </div>
            }
            name="WhatsApp"
            sub="Messagerie instantanée depuis votre CRM"
            status={statusBadge}
            action={action}
        >
            {status === "connected" ? (
                <div className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-[7px] bg-[#25D366]/12 text-[#128C7E]">
                            <MessageCircle className="size-[15px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[13.5px] font-medium text-foreground">
                                Compte WhatsApp lié
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Numéro vérifié · session active
                            </div>
                        </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                        Business API
                    </Badge>
                </div>
            ) : status === "error" && errorMsg ? (
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
            ) : (
                <p className="text-[13px] text-muted-foreground">
                    Connectez WhatsApp pour envoyer des messages directement
                    depuis votre CRM.
                </p>
            )}
        </IntegrationCard>
    );
}
