"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/loading-spinner";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import { TarifsSection } from "@/components/v3/homepage/TarifsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type OrgDashboardGateRow,
  userDashboardEntitlement,
} from "@/lib/onboarding/dashboard-access";
import type { OnboardingRedirectReason } from "@/lib/onboarding/onboarding-redirect";

const REASON_BANNER: Partial<Record<OnboardingRedirectReason, string>> = {
  profile_error:
    "Impossible de charger votre profil pour le moment. Réessayez dans un instant ou contactez le support si le problème persiste.",
  no_profile:
    "Votre profil n’est pas encore disponible. Complétez une invitation ou choisissez un plan ci-dessous.",
  no_workspace:
    "Aucun espace de travail actif n’est associé à votre compte. Rejoignez une organisation ou souscrivez un plan.",
  not_member:
    "Votre compte n’est pas reconnu comme membre de l’organisation sélectionnée. Vérifiez votre invitation ou choisissez un plan.",
  workspace_inaccessible:
    "L’organisation active n’a pas pu être chargée (droits ou synchronisation). Réessayez ou contactez le support.",
};

export default function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reasonParam = searchParams.get("reason");
  const reasonBanner = useMemo(() => {
    if (
      reasonParam === "profile_error" ||
      reasonParam === "no_profile" ||
      reasonParam === "no_workspace" ||
      reasonParam === "not_member" ||
      reasonParam === "workspace_inaccessible"
    ) {
      return REASON_BANNER[reasonParam] ?? null;
    }
    return null;
  }, [reasonParam]);
  const [loading, setLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);
  const [needsLinkedInUrl, setNeedsLinkedInUrl] = useState(false);
  const [linkedInInput, setLinkedInInput] = useState("");
  const [linkedInSaving, setLinkedInSaving] = useState(false);
  const [linkedInFeedback, setLinkedInFeedback] = useState<{
    type: "ok" | "err";
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkPlan() {
      try {
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (isMounted) {
            router.push("/auth/login");
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("active_organization_id, linkedin_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          if (isMounted) {
            setNeedsLinkedInUrl(true);
            setLoading(false);
          }
          return;
        }

        const profile = profileData as {
          active_organization_id?: string | null;
          linkedin_url?: string | null;
        } | null;

        let orgGate: OrgDashboardGateRow | null = null;

        if (profile?.active_organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("status, subscription_status, deleted_at, trial_ends_at")
            .eq("id", profile.active_organization_id)
            .maybeSingle();

          if (orgError) {
            console.error("Error fetching organization:", orgError);
          } else if (orgData) {
            orgGate = orgData as OrgDashboardGateRow;
          }
        }

        let subscription: { plan_id?: string; status?: string } | null = null;
        try {
          const { data: subData, error: subError } = await supabase
            .from("user_subscriptions")
            .select("plan_id, status")
            .eq("user_id", user.id)
            .in("status", ["active", "trialing"])
            .maybeSingle();

          if (!subError) {
            subscription = subData as { plan_id?: string; status?: string } | null;
          }
        } catch {
          // Continue
        }

        const { allowed: entitledToDashboard } = userDashboardEntitlement({
          org: orgGate,
          personalSub: subscription,
        });

        if (entitledToDashboard) {
          if (isMounted) {
            setHasPlan(true);
            router.push("/dashboard");
          }
          return;
        }

        if (isMounted) {
          setNeedsLinkedInUrl(!profile?.active_organization_id);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in checkPlan:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkPlan();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLinkedInSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = linkedInInput.trim();
      if (!trimmed) {
        setLinkedInFeedback({
          type: "err",
          message: "Collez l’URL de votre profil LinkedIn.",
        });
        return;
      }
      setLinkedInSaving(true);
      setLinkedInFeedback(null);
      try {
        const res = await fetch("/api/profile/linkedin-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ linkedin_url: trimmed }),
        });
        const json: {
          success?: boolean;
          data?: {
            joined?: boolean;
            alreadyMember?: boolean;
            organizationId?: string;
          };
          error?: { message?: string };
        } = await res.json();

        if (!json.success) {
          setLinkedInFeedback({
            type: "err",
            message: json.error?.message ?? "Une erreur est survenue.",
          });
          return;
        }

        const data = json.data;
        const invitationOk =
          data?.joined ||
          (data?.alreadyMember && Boolean(data?.organizationId));
        if (invitationOk) {
          router.refresh();
          router.push("/dashboard");
          return;
        }

        setLinkedInFeedback({
          type: "ok",
          message:
            "URL enregistrée. Aucune invitation correspondante — vérifiez l’URL ou demandez à votre contact de renvoyer l’invitation.",
        });
      } catch {
        setLinkedInFeedback({
          type: "err",
          message: "Réseau indisponible. Réessayez.",
        });
      } finally {
        setLinkedInSaving(false);
      }
    },
    [linkedInInput, router]
  );

  if (loading || hasPlan) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <LoadingSpinner text="Vérification de votre plan..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-8 sm:py-12 md:py-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {reasonBanner ? (
            <div
              role="status"
              className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
            >
              {reasonBanner}
            </div>
          ) : null}
          {needsLinkedInUrl ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Invitation à une organisation
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Si un collègue vous a invité avec votre profil LinkedIn, collez ici{" "}
                <strong>la même URL publique</strong> (ex.&nbsp;
                https://www.linkedin.com/in/votre-profil) que celle utilisée pour
                l’invitation.
              </p>
              <form onSubmit={handleLinkedInSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label htmlFor="onboarding-linkedin-url" className="sr-only">
                    URL du profil LinkedIn
                  </label>
                  <Input
                    id="onboarding-linkedin-url"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://www.linkedin.com/in/…"
                    value={linkedInInput}
                    onChange={(ev) => setLinkedInInput(ev.target.value)}
                    disabled={linkedInSaving}
                    className="w-full"
                  />
                </div>
                <Button type="submit" disabled={linkedInSaving} className="shrink-0">
                  {linkedInSaving ? "Vérification…" : "Valider"}
                </Button>
              </form>
              {linkedInFeedback ? (
                <p
                  className={
                    linkedInFeedback.type === "err"
                      ? "mt-3 text-sm text-red-600 dark:text-red-400"
                      : "mt-3 text-sm text-slate-600 dark:text-slate-400"
                  }
                  role={linkedInFeedback.type === "err" ? "alert" : "status"}
                >
                  {linkedInFeedback.message}
                </p>
              ) : null}
            </div>
          ) : null}
          <TarifsSection />
        </div>
      </div>
    </div>
  );
}
