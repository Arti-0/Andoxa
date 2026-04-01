"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ONBOARDING_PROFILE_STEP } from "../../config";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import {
  cardShell,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function FinishStep(_props: StepProps) {
  const router = useRouter();
  const { fullName } = useOnboardingRuntime();

  const handleEnterDashboard = async () => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          onboarding_step: ONBOARDING_PROFILE_STEP.COMPLETED,
        }),
      });
      const json = (await res.json()) as { success?: boolean };
      if (!res.ok || json.success !== true) {
        toast.error("Impossible de finaliser.");
        return;
      }
    } catch {
      toast.error("Impossible de finaliser.");
      return;
    }
    router.push("/dashboard");
  };

  const title = fullName.trim()
    ? `Tout est prêt, ${fullName.trim()}.`
    : "Tout est prêt.";

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
            <h1 className={welcomeStepTitleClass}>{title}</h1>
            <div
              className={cn(
                cardShell,
                "w-full max-w-md text-center sm:max-w-lg"
              )}
            >
              <p className={cn(subClass, "!mt-0")}>
                Vous êtes prêt à utiliser Andoxa avec votre équipe. Accédez au
                tableau de bord pour commencer.
              </p>
              <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80">
                <div className="flex items-center gap-1.5 border-b border-zinc-200 px-3 py-2 dark:border-white/10">
                  <div className="size-2 rounded-full bg-red-400/90" />
                  <div className="size-2 rounded-full bg-amber-400/90" />
                  <div className="size-2 rounded-full bg-emerald-400/90" />
                  <span className="ml-2 text-[10px] text-zinc-500 dark:text-zinc-500">
                    Tableau de bord
                  </span>
                </div>
                <div className="grid gap-2 p-3 sm:grid-cols-3 sm:p-4">
                  <div className="h-16 rounded-lg bg-white/80 dark:bg-zinc-950/80 sm:h-20" />
                  <div className="h-16 rounded-lg bg-white/80 dark:bg-zinc-950/80 sm:col-span-2 sm:h-20" />
                  <div className="h-24 rounded-lg bg-white/80 dark:bg-zinc-950/80 sm:col-span-3 sm:h-28" />
                </div>
              </div>
            </div>
            <div className="flex w-full justify-center">
              <OnboardingContinueButton
                onClick={() => void handleEnterDashboard()}
              >
                Accéder au tableau de bord
              </OnboardingContinueButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
