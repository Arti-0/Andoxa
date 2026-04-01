"use client";

import { useRouter } from "next/navigation";
import { Puzzle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ONBOARDING_PROFILE_STEP } from "../../config";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import {
  cardShell,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function ExtensionStep({
  onNext,
  scenario,
  isLast,
}: StepProps) {
  const router = useRouter();
  const chromeExtUrl = process.env.NEXT_PUBLIC_EXTENSION_CHROME_URL ?? "";
  const firefoxExtUrl = process.env.NEXT_PUBLIC_EXTENSION_FIREFOX_URL ?? "";

  const handleContinue = async () => {
    if (isLast && scenario === "new_owner") {
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            onboarding_step: ONBOARDING_PROFILE_STEP.PLAN,
          }),
        });
        const json = (await res.json()) as { success?: boolean };
        if (!res.ok || json.success !== true) {
          toast.error("Impossible de poursuivre.");
          return;
        }
      } catch {
        toast.error("Impossible de poursuivre.");
        return;
      }
      router.push("/onboarding/plan");
      return;
    }
    onNext();
  };

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
            <h1 className={welcomeStepTitleClass}>Installez l’extension.</h1>
            <div className={cn(cardShell, setupFormMax, "text-center")}>
              <p className={cn(subClass, "!mt-0")}>
                L’extension Andoxa vous permet d’extraire des prospects et de
                déclencher des flux depuis votre navigateur.
              </p>
              <div
                className="mx-auto mt-2 max-w-xs rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-white/10 dark:bg-zinc-900"
                aria-hidden
              >
                <div className="flex h-9 items-center gap-1 rounded-md bg-white px-2 dark:bg-zinc-950">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <div className="ml-4 flex flex-1 justify-end gap-1">
                    <span className="inline-flex size-7 items-center justify-center rounded border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
                      <Puzzle className="size-4 text-zinc-500" />
                    </span>
                    <span className="inline-flex size-7 items-center justify-center rounded border border-[#5e6ad2]/40 bg-[#5e6ad2]/15 text-xs font-bold text-[#5e6ad2]">
                      A
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] text-zinc-500 dark:text-zinc-500">
                  Repérez l’icône puzzle → Andoxa dans la barre d’outils
                </p>
              </div>
              <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
                {chromeExtUrl ? (
                  <Button
                    asChild
                    className="h-11 min-h-11 flex-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 sm:flex-none sm:px-4"
                  >
                    <a href={chromeExtUrl} target="_blank" rel="noreferrer">
                      <span className="sm:hidden">Chrome</span>
                      <span className="hidden sm:inline">
                        Télécharger pour Chrome
                      </span>
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 flex-1 border-zinc-300 dark:border-white/15 sm:flex-none"
                    onClick={() =>
                      toast.message("Lien Chrome non configuré", {
                        description:
                          "Définissez NEXT_PUBLIC_EXTENSION_CHROME_URL.",
                      })
                    }
                  >
                    <span className="sm:hidden">Chrome</span>
                    <span className="hidden sm:inline">
                      Télécharger pour Chrome
                    </span>
                  </Button>
                )}
                {firefoxExtUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 min-h-11 flex-1 dark:border-white/15 sm:flex-none sm:px-4"
                  >
                    <a href={firefoxExtUrl} target="_blank" rel="noreferrer">
                      <span className="sm:hidden">Firefox</span>
                      <span className="hidden sm:inline">
                        Télécharger pour Firefox
                      </span>
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 flex-1 dark:border-white/15 sm:flex-none"
                    onClick={() =>
                      window.open("https://addons.mozilla.org", "_blank")
                    }
                  >
                    <span className="sm:hidden">Firefox</span>
                    <span className="hidden sm:inline">
                      Télécharger pour Firefox
                    </span>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex w-full justify-center">
              <OnboardingContinueButton onClick={() => void handleContinue()}>
                Continuer
              </OnboardingContinueButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
