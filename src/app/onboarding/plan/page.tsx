"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/loading-spinner";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import { TarifsSection } from "@/components/v3/homepage/TarifsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PlanPage() {
  const router = useRouter();
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
    let intervalId: NodeJS.Timeout | null = null;
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
        let organizationStatus: string | null = null;
        let organizationPlan: string | null = null;
        let subscriptionStatus: string | null = null;

        if (profile?.active_organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("plan, subscription_status, status")
            .eq("id", profile.active_organization_id)
            .maybeSingle();

          const organization = orgData as { plan?: string | null; subscription_status?: string | null; status?: string | null } | null;
          if (orgError) {
            console.error("Error fetching organization:", orgError);
          } else if (organization) {
            organizationStatus = organization.status || null;
            organizationPlan = organization.plan || null;
            subscriptionStatus = organization.subscription_status || null;
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

        const validPlans = ["essential", "pro", "business"];
        const hasActiveSubscription = subscription && (subscription.status === "active" || subscription.status === "trialing");
        const hasActiveOrgPlan =
          organizationPlan &&
          validPlans.includes(organizationPlan) &&
          organizationStatus === "active" &&
          subscriptionStatus !== "canceled";

        if (hasActiveSubscription || hasActiveOrgPlan) {
          if (isMounted) {
            setHasPlan(true);
            router.push("/dashboard");
          }
          return;
        }

        if (organizationStatus === "pending") {
          if (!intervalId && isMounted) {
            intervalId = setInterval(() => {
              if (isMounted) {
                checkPlan();
              }
            }, 2000);
          }
        } else {
          if (isMounted) {
            setNeedsLinkedInUrl(!profile?.active_organization_id);
            setLoading(false);
          }
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
      if (intervalId) {
        clearInterval(intervalId);
      }
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
