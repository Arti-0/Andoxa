"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import {
  inputPremiumClass,
  setupFormMax,
  welcomeQuestionClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function NameStep({ onNext, onError }: StepProps) {
  const { fullName, setFullName } = useOnboardingRuntime();
  const [saving, setSaving] = useState(false);

  const canContinue = fullName.trim().length >= 2;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || json.success !== true) {
        throw new Error(
          json.error?.message ?? "Échec de l’enregistrement"
        );
      }
      onNext();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
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
            <h1 className={welcomeStepTitleClass}>Bienvenue sur Andoxa</h1>
            <p className={cn(welcomeQuestionClass, "text-center")}>
              Comment doit-on vous appeler ?
            </p>
            <div className="w-full space-y-2 text-left">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Votre nom
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Marie Dupont"
                autoComplete="name"
                className={cn(
                  inputPremiumClass,
                  "min-h-11 text-base sm:min-h-10 sm:text-sm"
                )}
              />
            </div>
          </div>
          <div className="flex w-full justify-center">
            <OnboardingContinueButton
              disabled={!canContinue}
              loading={saving}
              onClick={() => void handleContinue()}
            >
              Continuer
            </OnboardingContinueButton>
          </div>
        </div>
      </div>
    </div>
  );
}
