"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhatsAppMark } from "@/lib/utils/onboarding-helpers";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import {
  cardShell,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function WhatsAppStep({ onNext }: StepProps) {
  const {
    scenario,
    orgId,
    whatsappConnected,
    fetchUnipile,
    refresh,
    jumpToStepId,
  } = useOnboardingRuntime();
  const [connectingWa, setConnectingWa] = useState(false);

  useEffect(() => {
    void fetchUnipile();
  }, [fetchUnipile]);

  useEffect(() => {
    if (whatsappConnected) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchUnipile();
      }
    };
    const onFocus = () => {
      void fetchUnipile();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchUnipile, whatsappConnected]);

  const handleConnectWhatsApp = async () => {
    if (!orgId) {
      toast.error(
        "Créez d’abord une organisation pour connecter WhatsApp."
      );
      return;
    }
    setConnectingWa(true);
    try {
      const res = await fetch("/api/unipile/connect-whatsapp", {
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
        (json?.error?.message as string) ??
          "Impossible de lancer WhatsApp"
      );
    } catch {
      toast.error("Impossible de lancer WhatsApp");
    } finally {
      setConnectingWa(false);
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
              {!whatsappConnected
                ? "Liez votre WhatsApp."
                : "WhatsApp connecté"}
            </h1>
            <div
              className={cn(cardShell, setupFormMax, "text-center")}
            >
              {!whatsappConnected ? (
                <>
                  <div className="mx-auto mb-4 flex size-13 items-center justify-center rounded-2xl bg-[#25D366]/10 shadow-inner shadow-[#25D366]/5 dark:bg-[#25D366]/15">
                    <WhatsAppMark className="size-8 text-[#25D366]" />
                  </div>
                  <p className={cn(subClass, "!mt-0")}>
                    Optionnel pour l’instant — à configurer quand vous serez
                    prêt. Messagerie instantanée depuis votre CRM.
                  </p>
                  {!orgId ? (
                    <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-sm text-zinc-800 dark:text-zinc-200 sm:p-4">
                      Une organisation est requise pour connecter WhatsApp.{" "}
                      {scenario === "new_owner" || scenario === "new_org" ? (
                        <button
                          type="button"
                          className="font-medium text-[#5e6ad2] underline-offset-2 hover:underline"
                          onClick={() => jumpToStepId("org.create")}
                        >
                          Configurer l’organisation
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="font-medium text-[#5e6ad2] underline-offset-2 hover:underline"
                          onClick={() => void refresh()}
                        >
                          Actualiser le profil
                        </button>
                      )}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    className="h-12 w-full rounded-xl border-0 bg-[#25D366] py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-[#20BD5A] disabled:opacity-60 sm:h-auto sm:text-sm"
                    disabled={connectingWa || !orgId}
                    onClick={() => void handleConnectWhatsApp()}
                  >
                    {connectingWa ? (
                      <Loader2 className="mr-2 inline size-4 animate-spin align-middle" />
                    ) : null}
                    Connecter WhatsApp
                  </Button>
                  {orgId ? (
                    <p className="mt-3 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                      Après ouverture du lien sur votre téléphone, la connexion
                      se met à jour automatiquement.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  <div className="relative mx-auto size-24 shrink-0 sm:size-29">
                    <div className="flex size-24 items-center justify-center rounded-full bg-[#25D366]/12 shadow-xl ring-4 ring-zinc-100 dark:bg-[#25D366]/18 dark:ring-zinc-800 sm:size-29">
                      <WhatsAppMark className="size-12 text-[#25D366] sm:size-14" />
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white dark:ring-zinc-900 sm:size-9"
                      aria-hidden
                    >
                      <Check className="size-4 sm:size-5" strokeWidth={2.5} />
                    </span>
                  </div>
                  <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                    Messagerie instantanée active
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Vous pouvez envoyer et recevoir des messages depuis Andoxa.
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
