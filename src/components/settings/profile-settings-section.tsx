"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Linkedin, Sparkles, User } from "lucide-react";
import { toast } from "@/lib/toast";
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

    useEffect(() => {
        setName(fullName ?? "");
    }, [fullName]);

    useEffect(() => {
        setLinkedinLoading(true);
        fetch("/api/profile/linkedin", { credentials: "include" })
            .then((res) => res.json())
            .then((json) => {
                const data = json?.data ?? json;
                setLinkedinData(data as LinkedinProfileData);
            })
            .catch(() => setLinkedinData(null))
            .finally(() => setLinkedinLoading(false));
    }, []);

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

    const headerName = displayName || name || "Votre profil";
    const initials =
        headerName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("") || "?";
    const linkedinHref = linkedinData?.linkedin_url
        ? linkedinData.linkedin_url.startsWith("http")
            ? linkedinData.linkedin_url
            : `https://www.linkedin.com/in/${linkedinData.linkedin_url
                  .replace(/^.*\/in\//i, "")
                  .replace(/\/?$/, "")}`
        : null;

    return (
        <SettingsCard
            title="Profil"
            description="Informations de connexion et profil public"
            icon={<User />}
        >
            <div className="flex flex-col gap-5">
                {/* Identity header — avatar + name + headline, mirroring the
                    organisation Identity card for a consistent look. */}
                <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                        {linkedinLoading ? (
                            <div className="size-[72px] animate-pulse rounded-full bg-muted" />
                        ) : displayAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={displayAvatar}
                                alt=""
                                className="size-[72px] rounded-full border border-border object-cover"
                            />
                        ) : (
                            <div className="flex size-[72px] items-center justify-center rounded-full bg-primary/10 text-xl font-bold tracking-[-0.02em] text-primary">
                                {initials}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        {linkedinLoading ? (
                            <div className="space-y-2 pt-1">
                                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                                <div className="h-3 w-56 animate-pulse rounded bg-muted" />
                            </div>
                        ) : (
                            <>
                                <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                                    {headerName}
                                </p>
                                {displayHeadline ? (
                                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-[1.45] text-muted-foreground">
                                        {displayHeadline}
                                    </p>
                                ) : (
                                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                                        {email ?? ""}
                                    </p>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {linkedinHref ? (
                                        <a
                                            href={linkedinHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline-offset-4 hover:underline"
                                        >
                                            <Linkedin className="size-3.5" />
                                            Voir mon profil LinkedIn
                                            <ExternalLink className="size-3" />
                                        </a>
                                    ) : null}
                                    {linkedinData?.linkedin_url ||
                                    linkedinData?.enriched ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 gap-1.5 px-2.5"
                                            onClick={handleEnrich}
                                            disabled={enriching}
                                        >
                                            {enriching ? (
                                                <Loader2 className="size-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="size-3.5" />
                                            )}
                                            Actualiser
                                        </Button>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="h-px bg-border" />

                {/* Editable fields */}
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
                    <p className="text-xs text-muted-foreground">
                        L&apos;e-mail est lié à votre compte et ne peut pas être
                        modifié ici.
                    </p>
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
