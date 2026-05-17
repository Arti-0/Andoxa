'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import {
    MarketingPricingSection,
    type PricingPlanChoice,
} from '@/components/marketing/sections/pricing';
import type { Billing } from '@/components/marketing/pricing/billing-toggle';
import {
    type OrgDashboardGateRow,
    userDashboardEntitlement,
} from '@/lib/onboarding/dashboard-access';
import { logger } from '@/lib/utils/logger';
import {
    isMeaningfulPostgrestError,
    serializePostgrestError,
} from '@/lib/supabase/postgrest-error';
import { toast } from 'sonner';

const PLAN_BACK_HREF = '/onboarding?step=9';

const planShellClass =
    'flex min-h-dvh w-full flex-col bg-background transition-colors duration-300';

function PlanBackHeader() {
    return (
        <header className="flex w-full shrink-0 items-center px-4 py-3">
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 text-sm font-medium text-muted-foreground hover:text-foreground"
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
    const [loadingPlan, setLoadingPlan] = useState<PricingPlanChoice | null>(
        null
    );

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
                    if (isMounted) setLoading(false);
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
                        router.replace('/onboarding');
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
                    } else if (orgData) {
                        orgGate = orgData as OrgDashboardGateRow;
                    }
                }

                let subscription:
                    | { plan_id?: string; status?: string }
                    | null = null;
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
                    // ignore
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
                        router.replace('/onboarding');
                        return;
                    }
                    setLoading(false);
                }
            } catch (error) {
                logger.warn('onboarding/plan: checkPlan failed', {
                    ...serializePostgrestError(error),
                });
                if (isMounted) setLoading(false);
            }
        }

        checkPlan();

        return () => {
            isMounted = false;
        };
    }, [router]);

    const handleSelectPlan = useCallback(
        async (plan: PricingPlanChoice, billing: Billing) => {
            if (plan === 'custom') {
                router.push('/contact?objet=custom');
                return;
            }

            setLoadingPlan(plan);
            try {
                // Detect existing active subscription → send to billing portal
                // to upgrade/downgrade. Otherwise start a fresh checkout.
                const subRes = await fetch('/api/subscription/info', {
                    method: 'GET',
                    credentials: 'include',
                });

                let hasActiveStripeSub = false;
                if (subRes.ok) {
                    const info = (await subRes.json()) as {
                        hasActivePlan?: boolean;
                    };
                    hasActiveStripeSub = Boolean(info.hasActivePlan);
                }

                if (hasActiveStripeSub) {
                    const portalRes = await fetch('/api/paiements/portal', {
                        method: 'POST',
                        credentials: 'include',
                    });
                    const portalJson = (await portalRes.json()) as {
                        url?: string;
                        error?: string;
                    };
                    if (!portalRes.ok || !portalJson.url) {
                        throw new Error(
                            portalJson.error ??
                                'Impossible d’ouvrir le portail de facturation.'
                        );
                    }
                    window.location.href = portalJson.url;
                    return;
                }

                const checkoutRes = await fetch('/api/paiements/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ planId: plan, billing }),
                });
                const checkoutJson = (await checkoutRes.json()) as {
                    url?: string;
                    redirect_url?: string;
                    error?: string;
                };

                if (!checkoutRes.ok) {
                    throw new Error(
                        checkoutJson.error ??
                            'Impossible de démarrer le checkout.'
                    );
                }

                if (checkoutJson.redirect_url) {
                    // Solo: instant trial activation, no Stripe redirect.
                    router.push(checkoutJson.redirect_url);
                    return;
                }
                if (checkoutJson.url) {
                    window.location.href = checkoutJson.url;
                    return;
                }
                throw new Error('Réponse de checkout vide.');
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : 'Une erreur est survenue.';
                toast.error(message);
                setLoadingPlan(null);
            }
        },
        [router]
    );

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
            <main className="flex flex-1 flex-col">
                <MarketingPricingSection
                    onSelectPlan={handleSelectPlan}
                    loadingPlan={loadingPlan}
                />
            </main>
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
