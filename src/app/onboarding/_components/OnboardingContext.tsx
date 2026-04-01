"use client";

import { createContext, useContext } from "react";
import type { StepId, OnboardingScenario } from "../config";

export type OnboardingRuntimeContextValue = {
  scenario: OnboardingScenario;
  orgId: string | null;
  setOrgId: (id: string | null) => void;
  fullName: string;
  setFullName: (n: string) => void;
  orgName: string;
  setOrgName: (n: string) => void;
  orgLogoRemoteUrl: string | null;
  setOrgLogoRemoteUrl: (u: string | null) => void;
  linkedinLinked: boolean;
  liProfile: { name: string; picture: string | null } | null;
  whatsappConnected: boolean;
  refresh: () => Promise<void>;
  fetchUnipile: () => Promise<void>;
  jumpToStepId: (id: StepId) => void;
};

export const OnboardingRuntimeContext =
  createContext<OnboardingRuntimeContextValue | null>(null);

export function useOnboardingRuntime() {
  const v = useContext(OnboardingRuntimeContext);
  if (!v) {
    throw new Error("useOnboardingRuntime must be used within provider");
  }
  return v;
}
