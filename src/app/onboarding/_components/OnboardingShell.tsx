"use client";

import {
  type ComponentType,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingProfile } from "@/hooks/use-onboarding-profile";
import type { StepId, OnboardingScenario } from "../config";
import type { StepProps } from "../_steps/types";
import { WelcomeStep } from "../_steps/WelcomeStep";
import { NameStep } from "../_steps/user/NameStep";
import { ThemeStep } from "../_steps/user/ThemeStep";
import { CreateOrgStep } from "../_steps/org/CreateOrgStep";
import { InviteStep } from "../_steps/org/InviteStep";
import { OrgFinishStep } from "../_steps/org/OrgFinishStep";
import { LinkedInStep } from "../_steps/install/LinkedInStep";
import { WhatsAppStep } from "../_steps/install/WhatsAppStep";
import { ExtensionStep } from "../_steps/install/ExtensionStep";
import { FinishStep } from "../_steps/shared/FinishStep";
import {
  OnboardingRuntimeContext,
  type OnboardingRuntimeContextValue,
} from "./OnboardingContext";
import { OnboardingLinkedInReturnSync } from "./OnboardingLinkedInReturnSync";
import { OnboardingStepUrlHydration } from "./OnboardingStepUrlHydration";

const STEP_COMPONENTS: Record<StepId, ComponentType<StepProps>> = {
  welcome: WelcomeStep,
  "user.name": NameStep,
  "user.theme": ThemeStep,
  "org.create": CreateOrgStep,
  "org.invite": InviteStep,
  "org.finish": OrgFinishStep,
  "install.linkedin": LinkedInStep,
  "install.whatsapp": WhatsAppStep,
  "install.extension": ExtensionStep,
  "shared.finish": FinishStep,
};

interface OnboardingShellProps {
  sequence: StepId[];
  initialStep: number;
  scenario: OnboardingScenario;
  userFullName: string;
}

export function OnboardingShell({
  sequence,
  initialStep,
  scenario,
  userFullName,
}: OnboardingShellProps) {
  const pathname = usePathname();
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const profile = useOnboardingProfile(userFullName);

  const totalSteps = sequence.length;
  const stepId = sequence[step - 1]!;
  const StepComponent = STEP_COMPONENTS[stepId];

  const goTo = useCallback(
    (next: number, dir: 1 | -1 = 1) => {
      if (next < 1 || next > totalSteps) return;
      setDirection(dir);
      setError(null);
      setStep(next);
    },
    [totalSteps]
  );

  const jumpToStepId = useCallback(
    (id: StepId) => {
      const idx = sequence.indexOf(id);
      if (idx >= 0) goTo(idx + 1, -1);
    },
    [goTo, sequence]
  );

  const handleNext = useCallback(() => goTo(step + 1, 1), [step, goTo]);
  const handleBack = useCallback(() => goTo(step - 1, -1), [step, goTo]);
  const handleSkip = useCallback(() => goTo(step + 1, 1), [step, goTo]);
  const handleError = useCallback((msg: string) => setError(msg), []);

  const onHydrateStep = useCallback((n: number) => {
    setStep(n);
    setError(null);
  }, []);

  const ctxValue = useMemo<OnboardingRuntimeContextValue>(
    () => ({
      scenario,
      orgId: profile.orgId,
      setOrgId: profile.setOrgId,
      fullName: profile.fullName,
      setFullName: profile.setFullName,
      orgName: profile.orgName,
      setOrgName: profile.setOrgName,
      orgLogoRemoteUrl: profile.orgLogoRemoteUrl,
      setOrgLogoRemoteUrl: profile.setOrgLogoRemoteUrl,
      linkedinLinked: profile.linkedinLinked,
      liProfile: profile.liProfile,
      whatsappConnected: profile.whatsappConnected,
      refresh: profile.refresh,
      fetchUnipile: profile.fetchUnipile,
      jumpToStepId,
    }),
    [
      scenario,
      profile.orgId,
      profile.setOrgId,
      profile.fullName,
      profile.setFullName,
      profile.orgName,
      profile.setOrgName,
      profile.orgLogoRemoteUrl,
      profile.setOrgLogoRemoteUrl,
      profile.linkedinLinked,
      profile.liProfile,
      profile.whatsappConnected,
      profile.refresh,
      profile.fetchUnipile,
      jumpToStepId,
    ]
  );

  useEffect(() => {
    const url = `${pathname}?step=${step}`;
    window.history.replaceState(null, "", url);
  }, [step, pathname]);

  const variants = {
    initial: { opacity: 0, x: direction * 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction * -28 },
  };

  const stepProps: StepProps = {
    onNext: handleNext,
    onBack: handleBack,
    onError: handleError,
    onSkip: handleSkip,
    scenario,
    isFirst: step === 1,
    isLast: step === totalSteps,
  };

  const dots = (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3.5"
      role="tablist"
      aria-label={`Étape ${step} sur ${totalSteps}`}
    >
      {sequence.map((_, i) => {
        const n = i + 1;
        const active = step === n;
        return (
          <span
            key={n}
            role="tab"
            aria-selected={active}
            aria-current={active ? "step" : undefined}
            className={cn(
              "rounded-full transition-all duration-200",
              active
                ? "size-2 bg-zinc-900 dark:bg-white"
                : "size-1.5 bg-zinc-300/90 dark:bg-zinc-600"
            )}
          />
        );
      })}
    </div>
  );

  return (
    <OnboardingRuntimeContext.Provider value={ctxValue}>
      <Suspense fallback={null}>
        <OnboardingStepUrlHydration
          totalSteps={totalSteps}
          onHydrate={onHydrateStep}
        />
        <OnboardingLinkedInReturnSync refresh={profile.refresh} />
      </Suspense>
      <div className="flex min-h-dvh w-full flex-col bg-zinc-50 dark:bg-[#0A0A0A]">
        <header className="relative flex h-13 shrink-0 items-center px-3 pt-[env(safe-area-inset-top,0px)] sm:h-14 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="relative z-10 -ml-1 h-9 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            disabled={step <= 1}
            onClick={handleBack}
          >
            <ChevronLeft className="size-4" />
            <span className="max-sm:sr-only">Retour</span>
          </Button>
          {dots}
          <div className="relative z-10 ml-auto w-14 shrink-0" aria-hidden />
        </header>

        {error ? (
          <div className="mx-auto w-full max-w-md px-4">
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-4 shrink-0 font-medium underline-offset-2 hover:underline"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-4 sm:px-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <StepComponent {...stepProps} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </OnboardingRuntimeContext.Provider>
  );
}
