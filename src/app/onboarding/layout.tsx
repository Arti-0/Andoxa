import type { ReactNode } from "react";
import { OnboardingLayoutShell } from "./onboarding-layout-shell";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingLayoutShell>{children}</OnboardingLayoutShell>;
}
