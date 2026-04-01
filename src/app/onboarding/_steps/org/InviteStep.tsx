"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/utils/onboarding-helpers";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import {
  inputPremiumClass,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function InviteStep({ onNext, onSkip }: StepProps) {
  const { orgId, jumpToStepId } = useOnboardingRuntime();
  const [inviteEmails, setInviteEmails] = useState(["", "", "", "", ""]);
  const [inviteSending, setInviteSending] = useState(false);

  const handleSendInvites = async () => {
    if (!orgId) {
      toast.error("Organisation requise pour inviter.");
      return;
    }
    const emails = inviteEmails.map((e) => e.trim()).filter(isValidEmail);
    if (emails.length === 0) {
      toast.error("Ajoutez au moins une adresse e-mail valide.");
      return;
    }
    setInviteSending(true);
    try {
      let ok = 0;
      for (const email of emails) {
        const res = await fetch("/api/invitations/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email,
            organization_id: orgId,
            role: "member",
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: { message?: string };
        };
        if (res.ok && json.success) ok += 1;
      }
      if (ok > 0) {
        const inviteMsg =
          ok === 1
            ? "1 invitation envoyée !"
            : `${ok} invitations envoyées !`;
        toast.success(inviteMsg);
        onNext();
      } else {
        toast.error("Aucune invitation n’a pu être envoyée.");
      }
    } finally {
      setInviteSending(false);
    }
  };

  const handleSkipInvites = () => {
    onSkip?.();
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
            <h1 className={welcomeStepTitleClass}>Invitez vos collègues.</h1>
            <div className={cn(setupFormMax, "w-full text-left")}>
              <p className={cn(subClass, "!mt-0 mb-6 text-center")}>
                Andoxa est plus puissant lorsque toute votre équipe est à bord.
                Chaque adresse recevra un e-mail d&apos;invitation Andoxa avec
                un lien sécurisé.
              </p>
              {!orgId ? (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                  Les invitations nécessitent une organisation active.{" "}
                  <button
                    type="button"
                    className="text-[#5e6ad2] underline"
                    onClick={() => jumpToStepId("org.create")}
                  >
                    Configurer l’organisation
                  </button>
                </p>
              ) : (
                <div className="space-y-3">
                  {inviteEmails.slice(0, 5).map((v, i) => (
                    <Input
                      key={i}
                      type="email"
                      inputMode="email"
                      placeholder={`collegue${i + 1}@entreprise.com`}
                      value={v}
                      onChange={(e) => {
                        const next = [...inviteEmails];
                        next[i] = e.target.value;
                        setInviteEmails(next);
                      }}
                      className={cn(
                        inputPremiumClass,
                        "min-h-11 text-base sm:min-h-10 sm:text-sm"
                      )}
                    />
                  ))}
                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                    <Button
                      type="button"
                      className="h-11 min-h-11 w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 sm:w-auto"
                      disabled={inviteSending || !orgId}
                      onClick={() => void handleSendInvites()}
                    >
                      {inviteSending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Envoyer les invitations
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 text-zinc-500 dark:text-zinc-400"
                  onClick={handleSkipInvites}
                >
                  Passer pour l’instant
                </Button>
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
    </div>
  );
}
