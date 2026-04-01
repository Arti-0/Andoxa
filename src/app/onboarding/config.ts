/** Persisted on `profiles.onboarding_step` */
export const ONBOARDING_PROFILE_STEP = {
  INVITED: "invited",
  NEW_OWNER: "new_owner",
  NEW_ORG: "new_org",
  /** Wizard finished; user is on pricing / checkout */
  PLAN: "plan",
  COMPLETED: "completed",
} as const;

export type StepId =
  | "welcome"
  | "user.name"
  | "user.theme"
  | "org.create"
  | "org.invite"
  | "org.finish"
  | "install.linkedin"
  | "install.whatsapp"
  | "install.extension"
  | "shared.finish";

export type OnboardingScenario = "new_owner" | "new_invited" | "new_org";

export const SEQUENCES: Record<OnboardingScenario, StepId[]> = {
  new_owner: [
    "welcome",
    "user.name",
    "user.theme",
    "org.create",
    "org.invite",
    "org.finish",
    "install.linkedin",
    "install.whatsapp",
    "install.extension",
  ],
  new_invited: [
    "welcome",
    "user.name",
    "user.theme",
    "install.linkedin",
    "install.whatsapp",
    "install.extension",
    "shared.finish",
  ],
  new_org: ["org.create", "org.invite", "org.finish"],
};

/**
 * Returns null when the user should leave the wizard (dashboard or other app area).
 */
export function deriveScenario(opts: {
  hasOrg: boolean;
  onboardingStep: string | null;
}): OnboardingScenario | null {
  const { hasOrg, onboardingStep: raw } = opts;
  const step = raw?.trim() || null;

  if (step === ONBOARDING_PROFILE_STEP.COMPLETED) return null;

  if (step === ONBOARDING_PROFILE_STEP.INVITED) return "new_invited";
  if (step === ONBOARDING_PROFILE_STEP.NEW_ORG) return "new_org";
  if (step === ONBOARDING_PROFILE_STEP.NEW_OWNER) return "new_owner";
  /** Pricing handoff: resume wizard when `?step=` is present (see onboarding page). */
  if (step === ONBOARDING_PROFILE_STEP.PLAN) return "new_owner";

  if (hasOrg) return null;
  return "new_owner";
}

/** 1-based step index in the given scenario sequence, or 1 if missing */
export function stepNumberForId(
  scenario: OnboardingScenario,
  id: StepId
): number {
  const seq = SEQUENCES[scenario];
  const i = seq.indexOf(id);
  return i >= 0 ? i + 1 : 1;
}
