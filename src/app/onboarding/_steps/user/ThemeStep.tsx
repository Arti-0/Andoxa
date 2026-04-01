"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { setupFormMax, welcomeStepTitleClass } from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function ThemeStep({ onNext }: StepProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8">
        <div
          className={cn(
            setupFormMax,
            "flex min-h-[450px] w-full flex-col justify-center gap-20"
          )}
        >
          <div className="flex w-full flex-col gap-12">
            <h1 className={welcomeStepTitleClass}>Sélectionnez un thème</h1>
            <div className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors sm:gap-3 sm:p-6",
                  mounted && resolvedTheme === "light"
                    ? "border-zinc-900 bg-zinc-50 dark:border-white"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20"
                )}
              >
                <Sun className="size-7 text-amber-500 sm:size-8" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:text-base">
                  Mode clair
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors sm:gap-3 sm:p-6",
                  mounted && resolvedTheme === "dark"
                    ? "border-zinc-100 bg-zinc-900"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20"
                )}
              >
                <Moon className="size-7 text-violet-300 sm:size-8" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:text-base">
                  Mode sombre
                </span>
              </button>
            </div>
          </div>
          <div className="flex w-full justify-center">
            <OnboardingContinueButton onClick={onNext}>
              Continuer
            </OnboardingContinueButton>
          </div>
        </div>
      </div>
    </div>
  );
}
