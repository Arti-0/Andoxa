import { isFeatureEnabled } from "@/lib/config/feature-flags";

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
  | "owner.welcome"
  | "owner.qualify"
  | "owner.trial"
  | "org.create"
  | "org.invite"
  | "org.finish"
  | "install.linkedin"
  | "install.whatsapp"
  | "install.extension"
  | "source.setup"
  | "shared.finish";

export type OnboardingScenario = "new_owner" | "new_invited" | "new_org";

// new_owner activation funnel: owner.welcome merges name + org creation,
// owner.qualify drives the plan recommendation, and owner.trial activates the
// entitlement inline (instant no-card trial, or Stripe checkout fallback —
// the wizard resumes at install.linkedin once the org is entitled, see
// onboarding/page.tsx). source.setup ends the wizard by redirecting into the
// app (campaign handoff or CRM), never via onNext.
const RAW_SEQUENCES: Record<OnboardingScenario, StepId[]> = {
  new_owner: [
    "owner.welcome",
    "owner.qualify",
    "owner.trial",
    "install.linkedin",
    "source.setup",
  ],
  new_invited: [
    "welcome",
    "user.name",
    "install.linkedin",
    "install.whatsapp",
    "install.extension",
    "shared.finish",
  ],
  new_org: ["org.create", "org.invite", "org.finish"],
};

// #FF: whatsapp — while the WhatsApp flow is hidden, drop its onboarding
// connect step so users are never prompted to link a hidden channel.
export const SEQUENCES: Record<OnboardingScenario, StepId[]> = isFeatureEnabled(
  "whatsapp",
)
  ? RAW_SEQUENCES
  : (Object.fromEntries(
      Object.entries(RAW_SEQUENCES).map(([scenario, steps]) => [
        scenario,
        steps.filter((s) => s !== "install.whatsapp"),
      ]),
    ) as Record<OnboardingScenario, StepId[]>);

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
