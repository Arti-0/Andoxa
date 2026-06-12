import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { deriveScenario } from "@/app/onboarding/config";
import { createClient } from "@/lib/supabase/server";
import { ProtectedLayoutContent } from "./protected-layout-content";

/**
 * App shell: workspace context only. Session and org gates live in src/proxy.ts.
 *
 * Onboarding gate lives here (not in the proxy, which is per-navigation
 * latency-sensitive): a user whose wizard isn't finished never sees the app
 * shell, even with a valid entitlement — they're sent back to /onboarding.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id, onboarding_step")
      .eq("id", userId)
      .maybeSingle();

    const scenario = deriveScenario({
      hasOrg: !!profile?.active_organization_id,
      onboardingStep: profile?.onboarding_step ?? null,
    });

    // new_org (extra workspace creation) intentionally doesn't trap an
    // existing user out of the app.
    if (scenario === "new_owner" || scenario === "new_invited") {
      redirect("/onboarding");
    }
  }

  return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>;
}
