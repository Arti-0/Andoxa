"use client";

import { createContext, useContext } from "react";
import type { StepId, OnboardingScenario } from "../config";

/** Qualification answer from owner.qualify — drives the owner.trial recommendation. */
export type OnboardingTeamSize = "solo" | "team" | "large";

export type OnboardingRuntimeContextValue = {
  scenario: OnboardingScenario;
  teamSize: OnboardingTeamSize | null;
  setTeamSize: (s: OnboardingTeamSize) => void;
  orgId: string | null;
  setOrgId: (id: string | null) => void;
  fullName: string;
  setFullName: (n: string) => void;
  orgName: string;
  setOrgName: (n: string) => void;
  orgLogoRemoteUrl: string | null;
  setOrgLogoRemoteUrl: (u: string | null) => void;
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
