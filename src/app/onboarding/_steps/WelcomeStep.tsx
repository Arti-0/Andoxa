"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingContinueButton } from "../_components/OnboardingContinueButton";
import { welcomeStepTitleClass } from "./onboarding-layout-classes";
import type { StepProps } from "./types";

export function WelcomeStep({ onNext }: StepProps) {
  const router = useRouter();

  // Escape hatch: a freshly-created account that lands here by mistake (wrong
  // email, switched plans, etc.) must be able to sign out instead of being
  // trapped in the wizard.
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8">
      <div className="flex w-full max-w-sm flex-col gap-12">
        <h1 className={welcomeStepTitleClass}>Bienvenue sur Andoxa</h1>
        <div className="flex flex-col items-center gap-4">
          <OnboardingContinueButton onClick={onNext}>
            Commencer
          </OnboardingContinueButton>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            Ce n’est pas vous ? Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
