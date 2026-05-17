"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsCard } from "@/components/settings/settings-card";
import type { ReactNode } from "react";

type ThemeValue = "light" | "dark" | "system";

interface ThemeOption {
    value: ThemeValue;
    label: string;
    icon: ReactNode;
    preview: [string, string, string];
}

const OPTIONS: ThemeOption[] = [
    {
        value: "light",
        label: "Clair",
        icon: <Sun className="h-[18px] w-[18px]" />,
        preview: ["#ffffff", "#f3f4f6", "#0052D9"],
    },
    {
        value: "dark",
        label: "Sombre",
        icon: <Moon className="h-[18px] w-[18px]" />,
        preview: ["#0c0c0d", "#1f2024", "#1A6AFF"],
    },
    {
        value: "system",
        label: "Système",
        icon: <Monitor className="h-[18px] w-[18px]" />,
        preview: [
            "linear-gradient(135deg, #fff 0%, #fff 50%, #0c0c0d 50%, #0c0c0d 100%)",
            "#94a3b8",
            "#0052D9",
        ],
    },
];

export function ThemeSettingsSection() {
    const { theme, setTheme } = useTheme();
    const current = (theme as ThemeValue) || "system";

    return (
        <SettingsCard
            title="Apparence"
            description="Personnalisez l'interface selon vos préférences"
            icon={<Sun />}
        >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {OPTIONS.map((opt) => {
                    const active = current === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTheme(opt.value)}
                            aria-pressed={active}
                            className={cn(
                                "group relative rounded-[11px] border-[1.5px] p-3.5 text-left transition-colors",
                                active
                                    ? "border-[var(--brand-blue)] bg-[color-mix(in_oklab,var(--brand-blue)_4%,var(--card))]"
                                    : "border-border bg-card hover:border-muted-foreground/40"
                            )}
                        >
                            <div className="mb-2.5 flex items-center gap-2.5">
                                <div
                                    className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-[7px]",
                                        active
                                            ? "bg-[var(--brand-blue)] text-white"
                                            : "bg-muted text-foreground"
                                    )}
                                >
                                    {opt.icon}
                                </div>
                                <span className="text-sm font-semibold tracking-[-0.005em]">
                                    {opt.label}
                                </span>
                                <span
                                    className={cn(
                                        "ml-auto flex h-4 w-4 items-center justify-center rounded-full border-[1.5px]",
                                        active
                                            ? "border-[var(--brand-blue)]"
                                            : "border-border"
                                    )}
                                >
                                    {active && (
                                        <span className="h-2 w-2 rounded-full bg-[var(--brand-blue)]" />
                                    )}
                                </span>
                            </div>
                            <div
                                className="flex h-[52px] flex-col gap-1 overflow-hidden rounded-[7px] border border-border p-[7px]"
                                style={{ background: opt.preview[0] }}
                            >
                                <div
                                    className="h-1 w-[70%] rounded-[2px]"
                                    style={{ background: opt.preview[1] }}
                                />
                                <div
                                    className="h-1 w-[50%] rounded-[2px] opacity-70"
                                    style={{ background: opt.preview[1] }}
                                />
                                <div className="mt-auto flex gap-1">
                                    <span
                                        className="h-[7px] w-5 rounded-[3px]"
                                        style={{ background: opt.preview[2] }}
                                    />
                                    <span
                                        className="h-[7px] w-3.5 rounded-[3px] opacity-50"
                                        style={{ background: opt.preview[1] }}
                                    />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </SettingsCard>
    );
}
