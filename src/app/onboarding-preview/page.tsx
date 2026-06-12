import type { Metadata } from "next";
import { OnboardingPreviewShell } from "./preview-shell";

/**
 * Public, backend-free preview of the redesigned onboarding flow.
 * Lets us iterate on visuals/flow without an account or any API —
 * every interaction is mocked client-side. Once validated, the
 * changes are ported to /onboarding.
 */
export const metadata: Metadata = {
  title: "Aperçu onboarding — Andoxa",
  robots: { index: false, follow: false },
};

export default function OnboardingPreviewPage() {
  return <OnboardingPreviewShell />;
}
