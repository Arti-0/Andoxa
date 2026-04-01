"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { linkLinkedInFromOnboarding } from "@/lib/auth/linkedin-auth";
import { cn } from "@/lib/utils";
import {
  initialsFromName,
  LinkedInMark,
} from "@/lib/utils/onboarding-helpers";
import { stepNumberForId } from "../../config";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import {
  cardShell,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function LinkedInStep({ onNext, onError }: StepProps) {
  const {
    scenario,
    linkedinLinked,
    liProfile,
    refresh,
    fetchUnipile,
  } = useOnboardingRuntime();
  const [connectingLi, setConnectingLi] = useState(false);

  useEffect(() => {
    void fetchUnipile();
  }, [fetchUnipile]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    const onFocus = () => {
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const handleConnectLinkedIn = async () => {
    setConnectingLi(true);
    try {
      const n = stepNumberForId(scenario, "install.linkedin");
      await linkLinkedInFromOnboarding(
        `/onboarding?step=${n}&linked=1`
      );
    } catch (e) {
      onError(
        e instanceof Error ? e.message : "Connexion LinkedIn impossible"
      );
      setConnectingLi(false);
    }
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
            <h1 className={welcomeStepTitleClass}>
              {!linkedinLinked
                ? "Connectez votre LinkedIn."
                : "LinkedIn connecté"}
            </h1>
            <div
              className={cn(cardShell, setupFormMax, "text-center")}
            >
              {!linkedinLinked ? (
                <>
                  <div className="mx-auto mb-4 flex size-13 items-center justify-center rounded-2xl bg-[#0077B5]/10 shadow-inner shadow-[#0077B5]/5 dark:bg-[#0077B5]/15">
                    <LinkedInMark className="size-8 text-[#0077B5]" />
                  </div>
                  <p className={cn(subClass, "!mt-0")}>
                    Optionnel pour l’instant — vous pourrez le faire plus tard
                    depuis les paramètres. Andoxa s’appuie sur LinkedIn pour les
                    prospects et l’automatisation.
                  </p>
                  <Button
                    type="button"
                    className="h-12 w-full rounded-xl border-0 bg-[#0077B5] py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#00669c] disabled:opacity-60 sm:h-auto sm:text-sm"
                    disabled={connectingLi}
                    onClick={() => void handleConnectLinkedIn()}
                  >
                    {connectingLi ? (
                      <Loader2 className="mr-2 inline size-4 animate-spin align-middle" />
                    ) : null}
                    Connecter LinkedIn
                  </Button>
                </>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  <div className="relative mx-auto size-24 shrink-0 sm:size-29">
                    {liProfile?.picture ? (
                      <Image
                        src={liProfile.picture}
                        alt="Photo de profil LinkedIn"
                        width={116}
                        height={116}
                        className="size-24 rounded-full object-cover shadow-xl ring-4 ring-zinc-100 dark:ring-zinc-800 sm:size-29"
                        unoptimized
                      />
                    ) : (
                      <Avatar className="size-24 shadow-xl ring-4 ring-zinc-100 dark:ring-zinc-800 sm:size-29">
                        <AvatarFallback className="text-xl font-semibold sm:text-2xl">
                          {initialsFromName(liProfile?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white dark:ring-zinc-900 sm:size-9"
                      aria-hidden
                    >
                      <Check className="size-4 sm:size-5" strokeWidth={2.5} />
                    </span>
                  </div>
                  <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                    {liProfile?.name ?? "Profil LinkedIn"}
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Votre compte est prêt pour la prospection.
                  </p>
                  <div
                    className="mx-auto flex w-full items-center justify-center rounded-xl bg-green-500/10 py-3 text-sm font-semibold text-green-500 dark:text-green-400"
                    role="status"
                  >
                    Compte lié
                  </div>
                </div>
              )}
            </div>
            <div className="flex w-full justify-center">
              <OnboardingContinueButton onClick={onNext}>
                Continuer
              </OnboardingContinueButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
