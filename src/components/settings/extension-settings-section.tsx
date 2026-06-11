"use client";

import { useState } from "react";
import { ChevronRight, Download, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntegrationCard } from "./integration-card";

export function ExtensionSettingsSection() {
    const [instrOpen, setInstrOpen] = useState(false);

    const chromeUrl =
        process.env.NEXT_PUBLIC_EXTENSION_CHROME_URL ??
        "https://chromewebstore.google.com/detail/Andoxa/jdjllpkghmohemlmhceilhoehgjfocke";
    const firefoxUrl =
        process.env.NEXT_PUBLIC_EXTENSION_FIREFOX_URL ??
        "https://addons.mozilla.org/fr/firefox/addon/andoxa/";

    const steps = [
        {
            t: "Téléchargez l'extension",
            d: "Cliquez sur « Chrome » ou « Firefox » ci-dessus pour ouvrir la boutique d'extensions de votre navigateur.",
        },
        {
            t: "Épinglez Andoxa à votre barre",
            d: "Cliquez sur l'icône puzzle puis sur la punaise à côté d'Andoxa pour la garder à portée de main.",
        },
        {
            t: "Connectez votre compte",
            d: "Ouvrez l'extension et cliquez sur « Se connecter ». Un onglet Andoxa s'ouvre et relie automatiquement votre session — rien à copier-coller.",
        },
    ];

    return (
        <IntegrationCard
            logo={
                <div
                    className="flex size-9 items-center justify-center overflow-hidden rounded-[10px]"
                    style={{ background: "#0052D9" }}
                >
                    {/* White Andoxa mark on the brand-blue tile. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/assets/logofiles/andoxa-mark-dark.svg"
                        alt="Logo Andoxa"
                        className="size-6"
                    />
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
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link
                            href={chromeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download className="size-3.5" />
                            Chrome
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link
                            href={firefoxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download className="size-3.5" />
                            Firefox
                        </Link>
                    </Button>
                </div>
            }
        >
            <p className="text-[13px] leading-[1.5] text-muted-foreground">
                Une fois installée, ouvrez l&apos;extension et connectez-la en un
                clic — elle utilise votre session Andoxa, aucun identifiant à
                saisir.
            </p>

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
