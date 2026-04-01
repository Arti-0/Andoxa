"use client";

import { OnboardingContinueButton } from "../_components/OnboardingContinueButton";
import { welcomeStepTitleClass } from "./onboarding-layout-classes";
import type { StepProps } from "./types";

export function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8">
      <div className="flex w-full max-w-sm flex-col gap-12">
        <h1 className={welcomeStepTitleClass}>Bienvenue sur Andoxa</h1>
        <div className="flex justify-center">
          <OnboardingContinueButton onClick={onNext}>
            Commencer
          </OnboardingContinueButton>
        </div>
      </div>
    </div>
  );
}
