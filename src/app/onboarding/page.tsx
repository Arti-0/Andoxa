import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OnboardingShell } from "@/app/onboarding/_components/OnboardingShell";
import {
  deriveScenario,
  ONBOARDING_PROFILE_STEP,
  SEQUENCES,
} from "@/app/onboarding/config";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, active_organization_id, onboarding_step")
    .eq("id", user.id)
    .single();

  if (
    params.step == null &&
    profile?.onboarding_step === ONBOARDING_PROFILE_STEP.PLAN
  ) {
    redirect("/onboarding/plan");
  }

  let onboardingStep = profile?.onboarding_step ?? null;

  console.log("[onboarding/page]", {
    userId: user.id,
    onboarding_step: profile?.onboarding_step,
    active_organization_id: profile?.active_organization_id,
  });

  const scenarioProbe = deriveScenario({
    hasOrg: !!profile?.active_organization_id,
    onboardingStep,
  });

  if (
    scenarioProbe === "new_owner" &&
    (onboardingStep == null || onboardingStep === "")
  ) {
    await supabase
      .from("profiles")
      .update({
        onboarding_step: ONBOARDING_PROFILE_STEP.NEW_OWNER,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    onboardingStep = ONBOARDING_PROFILE_STEP.NEW_OWNER;
  }

  const scenario = deriveScenario({
    hasOrg: !!profile?.active_organization_id,
    onboardingStep,
  });

  if (!scenario) {
    redirect("/dashboard");
  }

  const sequence = SEQUENCES[scenario];

  const urlStep = params.step ? parseInt(params.step, 10) : NaN;
  const initialStep =
    Number.isNaN(urlStep) || urlStep < 1 || urlStep > sequence.length
      ? 1
      : urlStep;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-[#0A0A0A]">
          Chargement…
        </div>
      }
    >
      <OnboardingShell
        sequence={sequence}
        initialStep={initialStep}
        scenario={scenario}
        userFullName={profile?.full_name ?? ""}
      />
    </Suspense>
  );
}
