'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { TarifsSection } from '@/components/v3/homepage/TarifsSection';
import {
    type OrgDashboardGateRow,
    userDashboardEntitlement,
} from '@/lib/onboarding/dashboard-access';
import { logger } from '@/lib/utils/logger';
import {
    isMeaningfulPostgrestError,
    serializePostgrestError,
} from '@/lib/supabase/postgrest-error';

const PLAN_BACK_HREF = '/onboarding/setup?step=8';

const planShellClass =
    'flex min-h-dvh w-full flex-col bg-zinc-50 transition-colors duration-300 dark:bg-[#0A0A0A]';

function PlanBackHeader() {
    return (
        <header className="flex w-full shrink-0 items-center px-4 py-3">
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
                <Link href={PLAN_BACK_HREF}>
                    <ChevronLeft className="size-4" />
                    Retour
                </Link>
            </Button>
        </header>
    );
}

function PlanPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reasonParam = searchParams.get('reason');
    void reasonParam;

    const [loading, setLoading] = useState(true);
    const [hasPlan, setHasPlan] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function checkPlan() {
            try {
                const supabase = createClient();

                const {
                    data: { user },
                    error: authError,
                } = await supabase.auth.getUser();

                if (authError || !user) {
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }

                const { data: profileData, error: profileError } =
                    await supabase
                        .from('profiles')
                        .select('active_organization_id')
                        .eq('id', user.id)
                        .maybeSingle();

                if (profileError) {
                    logger.warn(
                        'onboarding/plan: profile fetch failed',
                        serializePostgrestError(profileError)
                    );
                    if (isMounted) {
                        router.replace('/onboarding/setup');
                        setLoading(false);
                    }
                    return;
                }

                const profile = profileData as {
                    active_organization_id?: string | null;
                } | null;

                let orgGate: OrgDashboardGateRow | null = null;

                if (profile?.active_organization_id) {
                    const { data: orgData, error: orgError } = await supabase
                        .from('organizations')
                        .select(
                            'status, subscription_status, deleted_at, trial_ends_at'
                        )
                        .eq('id', profile.active_organization_id)
                        .maybeSingle();

                    if (orgError && isMeaningfulPostgrestError(orgError)) {
                        logger.warn(
                            'onboarding/plan: organization fetch failed',
                            {
                                organizationId: profile.active_organization_id,
                                ...serializePostgrestError(orgError),
                            }
                        );
                    } else if (orgError) {
                        logger.warn(
                            'onboarding/plan: organization fetch returned non-actionable error',
                            {
                                organizationId: profile.active_organization_id,
                            }
                        );
                    } else if (orgData) {
                        orgGate = orgData as OrgDashboardGateRow;
                    }
                }

                let subscription: { plan_id?: string; status?: string } | null =
                    null;
                try {
                    const { data: subData, error: subError } = await supabase
                        .from('user_subscriptions')
                        .select('plan_id, status')
                        .eq('user_id', user.id)
                        .in('status', ['active', 'trialing'])
                        .maybeSingle();

                    if (!subError) {
                        subscription = subData as {
                            plan_id?: string;
                            status?: string;
                        } | null;
                    }
                } catch {
                    // Continue
                }

                const { allowed: entitledToDashboard } =
                    userDashboardEntitlement({
                        org: orgGate,
                        personalSub: subscription,
                    });

                if (entitledToDashboard) {
                    if (isMounted) {
                        setHasPlan(true);
                        router.push('/dashboard');
                    }
                    return;
                }

                if (isMounted) {
                    if (!profile?.active_organization_id) {
                        router.replace('/onboarding/setup');
                        return;
                    }
                    setLoading(false);
                }
            } catch (error) {
                logger.warn('onboarding/plan: checkPlan failed', {
                    ...serializePostgrestError(error),
                });
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

    if (loading || hasPlan) {
        return (
            <div className={planShellClass}>
                <PlanBackHeader />
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-muted-foreground sm:py-12">
                    <LoadingSpinner text="Vérification de votre plan..." />
                </div>
            </div>
        );
    }

    return (
        <div className={planShellClass}>
            <PlanBackHeader />
            <div className="flex flex-1 flex-col text-foreground dark:text-[#f7f7f8]">
                <div className="flex flex-1 flex-col py-10 sm:py-12">
                    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6 lg:px-10">
                        <TarifsSection />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PlanPage() {
    return (
        <Suspense
            fallback={
                <div className={planShellClass}>
                    <PlanBackHeader />
                    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-muted-foreground sm:py-12">
                        <LoadingSpinner text="Chargement…" />
                    </div>
                </div>
            }
        >
            <PlanPageContent />
        </Suspense>
    );
}
