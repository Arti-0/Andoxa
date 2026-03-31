"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsCard } from "@/components/settings/settings-card";

type ThemeValue = "light" | "dark" | "system";

export function ThemeSettingsSection() {
    const { theme, setTheme } = useTheme();

    const options: { value: ThemeValue; label: string; icon: React.ReactNode }[] =
        [
            {
                value: "light",
                label: "Clair",
                icon: <Sun className="h-5 w-5" />,
            },
            {
                value: "dark",
                label: "Sombre",
                icon: <Moon className="h-5 w-5" />,
            },
            {
                value: "system",
                label: "Système",
                icon: <Monitor className="h-5 w-5" />,
            },
        ];

    const currentTheme = (theme as ThemeValue) || "system";

    return (
        <SettingsCard title="Apparence">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTheme(opt.value)}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors sm:min-w-[140px]",
                            currentTheme === opt.value
                                ? "border-zinc-900 bg-zinc-100 text-zinc-900 ring-2 ring-zinc-900/20 dark:border-white dark:bg-white/10 dark:text-white dark:ring-white/20"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/10 dark:bg-black dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-zinc-900/50"
                        )}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                ))}
            </div>
        </SettingsCard>
    );
}
