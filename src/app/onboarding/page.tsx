import { redirect } from "next/navigation";

export default function OnboardingIndexRedirectPage() {
  redirect("/onboarding/setup");
}
