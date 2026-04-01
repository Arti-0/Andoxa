"use client";

import { useRouter } from "next/navigation";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { setupFormMax, welcomeStepTitleClass } from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function OrgFinishStep({ onNext, isLast }: StepProps) {
  const router = useRouter();

  const handleContinue = () => {
    if (isLast) {
      router.push("/onboarding/plan");
    } else {
      onNext();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8">
      <div className={setupFormMax}>
        <div className="flex flex-col gap-12 text-center">
          <h1 className={welcomeStepTitleClass}>
            Organisation prête — poursuivons la configuration.
          </h1>
          <div className="flex justify-center">
            <OnboardingContinueButton onClick={handleContinue}>
              Continuer
            </OnboardingContinueButton>
          </div>
        </div>
      </div>
    </div>
  );
}
