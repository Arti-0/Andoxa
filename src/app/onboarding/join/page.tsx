import { redirect } from "next/navigation";

/**
 * Arrivée après acceptation d’une invitation (magic link + redeem).
 * Les invités sans mot de passe passent d’abord par la définition du mot de passe.
 */
export default function OnboardingJoinPage() {
  redirect("/auth/update-password?next=/dashboard");
}
