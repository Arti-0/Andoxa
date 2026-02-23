"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/loading-spinner";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import { TarifsSection } from "@/components/v3/homepage/TarifsSection";

export default function PlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);

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
          .select("active_organization_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const profile = profileData as { active_organization_id?: string | null } | null;
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TarifsSection />
        </div>
      </div>
    </div>
  );
}
