"use client";

import { useEffect, useState } from "react";
import {
    Copy,
    Check,
    ChevronRight,
    Download,
    Eye,
    EyeOff,
    Zap,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntegrationCard } from "./integration-card";
import { createClient } from "@/lib/supabase/client";
import { settingsLabelClass } from "./settings-card";

interface ExtensionSettingsSectionProps {
    userId: string | null;
}

const MASKED = "••••••••-••••-••••-••••-••••••••••••";

export function ExtensionSettingsSection({
    userId: propUserId,
}: ExtensionSettingsSectionProps) {
    const [resolvedUserId, setResolvedUserId] = useState(propUserId);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [instrOpen, setInstrOpen] = useState(false);

    useEffect(() => {
        setResolvedUserId(propUserId);
    }, [propUserId]);

    useEffect(() => {
        if (propUserId) return;
        let mounted = true;
        const load = async () => {
            try {
                const supabase = createClient();
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (mounted && user?.id) setResolvedUserId(user.id);
            } catch {
                // ignore
            }
        };
        void load();
        return () => {
            mounted = false;
        };
    }, [propUserId]);

    const handleCopy = async () => {
        if (!resolvedUserId) return;
        try {
            await navigator.clipboard.writeText(resolvedUserId);
            setCopied(true);
            toast.success("UUID copié");
            setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Impossible de copier");
        }
    };

    const chromeUrl =
        process.env.NEXT_PUBLIC_EXTENSION_CHROME_URL ??
        "https://chromewebstore.google.com";

    const steps = [
        {
            t: "Téléchargez l'extension Chrome",
            d: "Cliquez sur « Installer l'extension » ci-dessus pour ouvrir le Chrome Web Store.",
        },
        {
            t: "Épinglez Andoxa à votre barre",
            d: "Cliquez sur l'icône puzzle puis sur la punaise à côté d'Andoxa.",
        },
        {
            t: "Collez votre UUID",
            d: "Ouvrez l'extension, collez votre UUID et validez. L'extension est prête à capturer.",
        },
    ];

    return (
        <IntegrationCard
            logo={
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[var(--brand-orange,#FF6700)] to-[var(--brand-blue,#0052D9)] text-white">
                    <span className="text-[15px] font-bold leading-none">A</span>
                </div>
            }
            name="Extension Andoxa"
            sub="Capturez des prospects depuis LinkedIn directement dans votre CRM"
            status={
                <Badge
                    variant="outline"
                    className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                >
                    <Zap className="size-3" />
                    Chrome
                </Badge>
            }
            action={
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link
                        href={chromeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Download className="size-3.5" />
                        Installer l&apos;extension
                    </Link>
                </Button>
            }
        >
            <div className="flex flex-col gap-2">
                <span className={settingsLabelClass}>Votre UUID</span>
                <div className="flex gap-2">
                    <div
                        className="flex h-10 flex-1 items-center rounded-[9px] border border-border bg-muted/50 px-3.5 font-mono text-[13px] transition-colors"
                        style={{
                            letterSpacing: revealed ? "0" : "0.04em",
                            color: revealed
                                ? "var(--foreground)"
                                : "var(--muted-foreground)",
                            userSelect: revealed ? "all" : "none",
                        }}
                    >
                        {revealed ? (resolvedUserId ?? "—") : MASKED}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevealed((r) => !r)}
                        className="h-10 gap-1.5"
                        disabled={!resolvedUserId}
                    >
                        {revealed ? (
                            <EyeOff className="size-3.5" />
                        ) : (
                            <Eye className="size-3.5" />
                        )}
                        {revealed ? "Masquer" : "Révéler"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        disabled={!resolvedUserId}
                        className={
                            copied
                                ? "h-10 gap-1.5 border-emerald-500 text-emerald-600"
                                : "h-10 gap-1.5"
                        }
                    >
                        {copied ? (
                            <Check className="size-3.5" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                        {copied ? "Copié" : "Copier"}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Cet identifiant est confidentiel — ne le partagez
                    qu&apos;avec l&apos;extension officielle Andoxa.
                </p>
            </div>

            <div className="overflow-hidden rounded-[10px] border border-border">
                <button
                    type="button"
                    onClick={() => setInstrOpen((o) => !o)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-muted/50 aria-expanded:bg-muted/50"
                    aria-expanded={instrOpen}
                >
                    <ChevronRight
                        className="size-3.5 shrink-0 text-muted-foreground transition-transform"
                        style={{
                            transform: instrOpen
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                        }}
                    />
                    <span className="text-[13.5px] font-medium">
                        Instructions d&apos;installation
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                        ~ 2 min
                    </span>
                </button>
                {instrOpen ? (
                    <ol className="flex flex-col gap-3 px-3.5 pb-4 pt-1">
                        {steps.map((step, i) => (
                            <li key={i} className="flex gap-3">
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
                                    {i + 1}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[13.5px] font-medium">
                                        {step.t}
                                    </div>
                                    <div className="mt-0.5 text-[12.5px] leading-[1.5] text-muted-foreground">
                                        {step.d}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                ) : null}
            </div>
        </IntegrationCard>
    );
}
