"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DonePreviewStep,
  LinkedInPreviewStep,
  ProfilePreviewStep,
  ProspectsPreviewStep,
  TrialPreviewStep,
  WelcomePreviewStep,
  type PreviewState,
  type PreviewStepProps,
} from "./preview-steps";

/** Ordered steps; `done` is the post-wizard landing and is excluded from progress. */
const STEPS = [
  "welcome",
  "profile",
  "trial",
  "linkedin",
  "prospects",
  "done",
] as const;

type PreviewStepId = (typeof STEPS)[number];

const STEP_COMPONENTS: Record<
  PreviewStepId,
  (props: PreviewStepProps) => React.ReactNode
> = {
  welcome: WelcomePreviewStep,
  profile: ProfilePreviewStep,
  trial: TrialPreviewStep,
  linkedin: LinkedInPreviewStep,
  prospects: ProspectsPreviewStep,
  done: DonePreviewStep,
};

const INITIAL_STATE: PreviewState = {
  fullName: "",
  company: "",
  teamSize: null,
  plan: null,
  trialStarted: false,
  linkedinConnected: false,
  source: null,
};

export function OnboardingPreviewShell() {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);

  const stepId = STEPS[stepIndex]!;
  const progressTotal = STEPS.length - 1; // exclude "done"
  const isDone = stepId === "done";

  const patch = useCallback((p: Partial<PreviewState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  const goTo = useCallback((next: number, dir: 1 | -1) => {
    if (next < 0 || next >= STEPS.length) return;
    setDirection(dir);
    setStepIndex(next);
  }, []);

  const onNext = useCallback(
    () => goTo(stepIndex + 1, 1),
    [goTo, stepIndex]
  );
  const onBack = useCallback(
    () => goTo(stepIndex - 1, -1),
    [goTo, stepIndex]
  );
  const restart = useCallback(() => {
    setState(INITIAL_STATE);
    setDirection(-1);
    setStepIndex(0);
  }, []);

  const StepComponent = STEP_COMPONENTS[stepId];

  const variants = {
    initial: { opacity: 0, x: direction * 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction * -28 },
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 px-4 pt-[env(safe-area-inset-top,0px)] sm:px-6">
        <div className="flex w-28 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "-ml-2 h-9 text-sm font-medium text-muted-foreground hover:text-foreground",
              (stepIndex === 0 || isDone) && "invisible"
            )}
            onClick={onBack}
          >
            <ChevronLeft className="size-4" />
            <span className="max-sm:sr-only">Retour</span>
          </Button>
        </div>

        {!isDone ? (
          <div
            className="absolute inset-x-0 mx-auto flex w-full max-w-45 items-center gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={progressTotal}
            aria-valuenow={stepIndex + 1}
            aria-label={`Étape ${stepIndex + 1} sur ${progressTotal}`}
          >
            {Array.from({ length: progressTotal }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i <= stepIndex ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        ) : null}

        <span className="ml-auto inline-flex w-28 justify-end">
          <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Aperçu
          </span>
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={stepId}
              custom={direction}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <StepComponent
                state={state}
                patch={patch}
                onNext={onNext}
                onBack={onBack}
                restart={restart}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="flex shrink-0 items-center justify-center pb-4 pt-2">
        <p className="text-[11px] text-muted-foreground/70">
          Aperçu de démonstration — aucune donnée n’est enregistrée.
        </p>
      </footer>
    </div>
  );
}
