"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    ExternalLink,
    Linkedin,
    Link2,
    Sparkles,
    MessageCircle,
    CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
    SettingsCard,
    settingsFieldClass,
    settingsLabelClass,
} from "@/components/settings/settings-card";
import { cn } from "@/lib/utils";

interface LinkedinProfileData {
    linkedin_url: string | null;
    full_name: string | null;
    avatar_url: string | null;
    enriched: {
        first_name?: string | null;
        last_name?: string | null;
        headline?: string | null;
        location?: string | null;
        profile_picture_url?: string | null;
        public_identifier?: string | null;
        summary?: string | null;
    } | null;
}

function namesEqual(a: string | null | undefined, b: string | null | undefined) {
    const x = (a ?? "").trim();
    const y = (b ?? "").trim();
    return x === y;
}

export function ProfileSettingsSection({
    fullName,
    email,
    onSuccess,
}: {
    fullName: string | null;
    email: string | null;
    onSuccess?: () => void;
}) {
    const [name, setName] = useState(fullName ?? "");
    const [savingName, setSavingName] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [linkedinData, setLinkedinData] = useState<LinkedinProfileData | null>(
        null
    );
    const [linkedinLoading, setLinkedinLoading] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);
    const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
    const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(
        null
    );
    const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(
        null
    );

    useEffect(() => {
        setName(fullName ?? "");
    }, [fullName]);

    const fetchUnipileStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/unipile/me", { credentials: "include" });
            const json = await res.json();
            const data = json?.data ?? json;
            setLinkedinConnected(data?.connected ?? false);
            setWhatsappConnected(data?.whatsapp_connected ?? false);
        } catch {
            setLinkedinConnected(false);
            setWhatsappConnected(false);
        }
    }, []);

    useEffect(() => {
        setLinkedinLoading(true);
        Promise.all([
            fetch("/api/profile/linkedin", { credentials: "include" })
                .then((res) => res.json())
                .then((json) => {
                    const data = json?.data ?? json;
                    setLinkedinData(data as LinkedinProfileData);
                })
                .catch(() => setLinkedinData(null)),
            fetchUnipileStatus(),
        ]).finally(() => setLinkedinLoading(false));
    }, [fetchUnipileStatus]);

    const saveFullNameIfChanged = async () => {
        if (namesEqual(name, fullName)) return;
        setSavingName(true);
        setError(null);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ full_name: name.trim() || null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur");
            toast.success("Nom mis à jour");
            onSuccess?.();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour"
            );
        } finally {
            setSavingName(false);
        }
    };

    const handleConnectLinkedIn = async () => {
        setConnectingLinkedIn(true);
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
                (json?.error?.message as string) ??
                    "Erreur lors de la connexion"
            );
        } catch {
            toast.error("Impossible de lancer la connexion LinkedIn");
        } finally {
            setConnectingLinkedIn(false);
        }
    };

    const handleConnectWhatsApp = async () => {
        setConnectingWhatsApp(true);
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
                    "Erreur lors de la connexion WhatsApp"
            );
        } catch {
            toast.error("Impossible de lancer la connexion WhatsApp");
        } finally {
            setConnectingWhatsApp(false);
        }
    };

    const handleEnrich = async () => {
        setEnriching(true);
        setError(null);
        try {
            const res = await fetch("/api/profile/linkedin/enrich", {
                method: "POST",
                credentials: "include",
            });
            const json = await res.json();
            if (!res.ok) {
                const msg =
                    json?.error?.message ?? "Erreur lors de l'enrichissement";
                throw new Error(msg);
            }
            const data = json?.data ?? json;
            const enriched = (
                data as { enriched?: LinkedinProfileData["enriched"] }
            ).enriched;
            const linkedinFromEnrich = enriched?.public_identifier
                ? `https://www.linkedin.com/in/${enriched.public_identifier}`
                : null;
            setLinkedinData((prev) => ({
                linkedin_url: linkedinFromEnrich ?? prev?.linkedin_url ?? null,
                enriched: enriched ?? prev?.enriched ?? null,
                full_name: prev?.full_name ?? null,
                avatar_url: prev?.avatar_url ?? null,
            }));
            onSuccess?.();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'enrichissement"
            );
        } finally {
            setEnriching(false);
        }
    };

    const displayName =
        linkedinData?.enriched?.first_name || linkedinData?.enriched?.last_name
            ? `${linkedinData.enriched.first_name ?? ""} ${linkedinData.enriched.last_name ?? ""}`.trim()
            : (linkedinData?.full_name ?? fullName ?? null);
    const displayHeadline = linkedinData?.enriched?.headline ?? null;
    const displayAvatar =
        linkedinData?.enriched?.profile_picture_url ??
        linkedinData?.avatar_url ??
        null;

    const linkedInBtnClass = cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60",
        linkedinConnected
            ? "border border-emerald-500/50 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
            : "border-0 bg-[#0077B5] text-white shadow-md shadow-blue-500/20 hover:bg-[#00669c]"
    );

    const whatsAppBtnClass = cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60",
        whatsappConnected
            ? "border-emerald-500/50 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
            : "border-[#25D366] bg-[#25D366]/12 text-[#075E54] hover:bg-[#25D366]/20 dark:border-[#25D366]/60 dark:bg-[#25D366]/15 dark:text-[#dcf8c6]"
    );

    return (
        <SettingsCard
            title="Profil"
            description="Nom, e-mail et comptes liés"
        >
            <div className="flex flex-col gap-4">
                <div className="space-y-2">
                    <Label htmlFor="full_name" className={settingsLabelClass}>
                        Nom complet
                    </Label>
                    <Input
                        id="full_name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => void saveFullNameIfChanged()}
                        placeholder="Votre nom"
                        className={settingsFieldClass}
                        disabled={savingName}
                    />
                </div>
                <div className="space-y-2">
                    <Label className={settingsLabelClass}>E-mail</Label>
                    <Input
                        value={email ?? ""}
                        disabled
                        className={cn(
                            settingsFieldClass,
                            "cursor-not-allowed opacity-70"
                        )}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        L&apos;e-mail est lié à votre compte et ne peut pas être
                        modifié ici.
                    </p>
                </div>

                <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-white/10">
                    <p className={settingsLabelClass}>Compte lié</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => void handleConnectLinkedIn()}
                            disabled={
                                connectingLinkedIn || linkedinConnected === null
                            }
                            className={linkedInBtnClass}
                        >
                            {connectingLinkedIn ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : linkedinConnected ? (
                                <CheckCircle className="h-4 w-4 shrink-0" />
                            ) : (
                                <Linkedin className="h-4 w-4 shrink-0" />
                            )}
                            {connectingLinkedIn
                                ? "Connexion…"
                                : linkedinConnected
                                  ? "LinkedIn connecté"
                                  : "LinkedIn"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleConnectWhatsApp()}
                            disabled={
                                connectingWhatsApp || whatsappConnected === null
                            }
                            className={whatsAppBtnClass}
                        >
                            {connectingWhatsApp ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : whatsappConnected ? (
                                <CheckCircle className="h-4 w-4 shrink-0" />
                            ) : (
                                <MessageCircle className="h-4 w-4 shrink-0" />
                            )}
                            {connectingWhatsApp
                                ? "Connexion…"
                                : whatsappConnected
                                  ? "WhatsApp connecté"
                                  : "WhatsApp"}
                        </button>
                    </div>

                    {linkedinLoading ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement du profil…
                        </div>
                    ) : linkedinData?.linkedin_url || linkedinData?.enriched ? (
                        <div className="flex flex-col gap-3 pt-1">
                            <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-white/10">
                                {displayAvatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={displayAvatar}
                                        alt=""
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                                        <Linkedin className="h-6 w-6 text-zinc-400" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    {displayName && (
                                        <p className="font-medium text-zinc-900 dark:text-white">
                                            {displayName}
                                        </p>
                                    )}
                                    {displayHeadline && (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {displayHeadline}
                                        </p>
                                    )}
                                    {linkedinData?.linkedin_url && (
                                        <a
                                            href={
                                                linkedinData.linkedin_url.startsWith(
                                                    "http"
                                                )
                                                    ? linkedinData.linkedin_url
                                                    : `https://www.linkedin.com/in/${linkedinData.linkedin_url.replace(/^.*\/in\//i, "").replace(/\/?$/, "")}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-white"
                                        >
                                            Voir mon profil LinkedIn
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-fit gap-2 border-zinc-200 bg-transparent dark:border-white/10"
                                onClick={handleEnrich}
                                disabled={enriching}
                            >
                                {enriching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Actualiser le profil
                            </Button>
                        </div>
                    ) : null}
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}
            </div>
        </SettingsCard>
    );
}
