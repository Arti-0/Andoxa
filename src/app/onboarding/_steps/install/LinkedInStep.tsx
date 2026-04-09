"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LinkedInMark } from "@/lib/utils/onboarding-helpers";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import {
  cardShell,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function LinkedInStep({ onNext, onError }: StepProps) {
  const [connectingLi, setConnectingLi] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);

  const checkLinkedIn = async () => {
    try {
      const res = await fetch("/api/unipile/me", { credentials: "include" });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: { connected?: boolean } };
      const data = json.data ?? (json as { connected?: boolean });
      setLinkedinConnected(!!data.connected);
    } catch {
      // silencieux
    }
  };

  useEffect(() => {
    void checkLinkedIn();
  }, []);

  useEffect(() => {
    if (linkedinConnected) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkLinkedIn();
    };
    const onFocus = () => void checkLinkedIn();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [linkedinConnected]);

  const handleConnectLinkedIn = async () => {
    setConnectingLi(true);
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
        (json?.error?.message as string) ?? "Impossible de lancer LinkedIn"
      );
    } catch {
      onError("Connexion LinkedIn impossible");
    } finally {
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
              {!linkedinConnected
                ? "Connectez votre LinkedIn."
                : "LinkedIn connecté"}
            </h1>
            <div className={cn(cardShell, setupFormMax, "text-center")}>
              {!linkedinConnected ? (
                <>
                  <div className="mx-auto mb-4 flex size-13 items-center justify-center rounded-2xl bg-[#0077B5]/10 shadow-inner shadow-[#0077B5]/5 dark:bg-[#0077B5]/15">
                    <LinkedInMark className="size-8 text-[#0077B5]" />
                  </div>
                  <p className={cn(subClass, "!mt-0")}>
                    Optionnel pour l&apos;instant — vous pourrez le faire plus
                    tard depuis les paramètres. Andoxa s&apos;appuie sur
                    LinkedIn pour les prospects et l&apos;automatisation.
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
                    <div className="flex size-24 items-center justify-center rounded-full bg-[#0077B5]/10 shadow-xl ring-4 ring-zinc-100 dark:bg-[#0077B5]/15 dark:ring-zinc-800 sm:size-29">
                      <LinkedInMark className="size-12 text-[#0077B5] sm:size-14" />
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white dark:ring-zinc-900 sm:size-9"
                      aria-hidden
                    >
                      <Check className="size-4 sm:size-5" strokeWidth={2.5} />
                    </span>
                  </div>
                  <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
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
