import type { OnboardingScenario } from "../config";

export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onError: (msg: string) => void;
  onSkip?: () => void;
  scenario: OnboardingScenario;
  isFirst: boolean;
  isLast: boolean;
}
