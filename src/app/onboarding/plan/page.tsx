'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/loading-spinner';
import { TarifsSection } from '@/components/v3/homepage/TarifsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    type OrgDashboardGateRow,
    userDashboardEntitlement,
} from '@/lib/onboarding/dashboard-access';
import { logger } from '@/lib/utils/logger';
import {
    isMeaningfulPostgrestError,
    serializePostgrestError,
} from '@/lib/supabase/postgrest-error';

function PlanPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reasonParam = searchParams.get('reason');
    void reasonParam;

    const [loading, setLoading] = useState(true);
    const [hasPlan, setHasPlan] = useState(false);
    const [needsLinkedInUrl, setNeedsLinkedInUrl] = useState(false);
    const [linkedInInput, setLinkedInInput] = useState('');
    const [linkedInSaving, setLinkedInSaving] = useState(false);
    const [linkedInFeedback, setLinkedInFeedback] = useState<{
        type: 'ok' | 'err';
        message: string;
    } | null>(null);

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
                        router.push('/auth/login');
                    }
                    return;
                }

                const { data: profileData, error: profileError } =
                    await supabase
                        .from('profiles')
                        .select('active_organization_id, linkedin_url')
                        .eq('id', user.id)
                        .maybeSingle();

                if (profileError) {
                    logger.warn(
                        'onboarding/plan: profile fetch failed',
                        serializePostgrestError(profileError)
                    );
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
                    setNeedsLinkedInUrl(!profile?.active_organization_id);
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

    const handleLinkedInSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            const trimmed = linkedInInput.trim();
            if (!trimmed) {
                setLinkedInFeedback({
                    type: 'err',
                    message: 'Collez l’URL de votre profil LinkedIn.',
                });
                return;
            }
            setLinkedInSaving(true);
            setLinkedInFeedback(null);
            try {
                const res = await fetch('/api/profile/linkedin-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
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
                        type: 'err',
                        message:
                            json.error?.message ?? 'Une erreur est survenue.',
                    });
                    return;
                }

                const data = json.data;
                const invitationOk =
                    data?.joined ||
                    (data?.alreadyMember && Boolean(data?.organizationId));
                if (invitationOk) {
                    router.refresh();
                    router.push('/dashboard');
                    return;
                }

                setLinkedInFeedback({
                    type: 'ok',
                    message:
                        'URL enregistrée. Aucune invitation correspondante — vérifiez l’URL ou demandez à votre contact de renvoyer l’invitation.',
                });
            } catch {
                setLinkedInFeedback({
                    type: 'err',
                    message: 'Réseau indisponible. Réessayez.',
                });
            } finally {
                setLinkedInSaving(false);
            }
        },
        [linkedInInput, router]
    );

    if (loading || hasPlan) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-muted-foreground sm:py-12">
                <LoadingSpinner text="Vérification de votre plan..." />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col text-foreground dark:text-[#f7f7f8]">
            <div className="flex flex-1 flex-col py-10 sm:py-12">
                <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
                    {needsLinkedInUrl ? (
                        <div className="mx-auto w-full max-w-3xl rounded-[10px] border border-border/80 bg-card p-8 shadow-sm sm:p-10 dark:border-white/8 dark:bg-[#151516] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
                            <h2 className="text-lg font-semibold text-foreground dark:text-[#f7f7f8]">
                                Invitation à une organisation
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground dark:text-[#8a8a8e]">
                                Si un collègue vous a invité avec votre profil
                                LinkedIn, collez ici{' '}
                                <strong className="font-semibold text-foreground dark:text-[#f7f7f8]">la même URL publique</strong> (ex.&nbsp;
                                https://www.linkedin.com/in/votre-profil) que
                                celle utilisée pour l’invitation.
                            </p>
                            <form
                                onSubmit={handleLinkedInSubmit}
                                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                            >
                                <div className="min-w-0 flex-1">
                                    <label
                                        htmlFor="onboarding-linkedin-url"
                                        className="sr-only"
                                    >
                                        URL du profil LinkedIn
                                    </label>
                                    <Input
                                        id="onboarding-linkedin-url"
                                        type="url"
                                        inputMode="url"
                                        autoComplete="url"
                                        placeholder="https://www.linkedin.com/in/…"
                                        value={linkedInInput}
                                        onChange={(ev) =>
                                            setLinkedInInput(ev.target.value)
                                        }
                                        disabled={linkedInSaving}
                                        className="h-10 w-full border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/30 dark:border-white/8 dark:bg-[#0c0c0e] dark:text-[#f7f7f8] dark:placeholder:text-[#5c5c6f] dark:focus-visible:ring-[#5e6ad2]/25"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={linkedInSaving}
                                    className="h-10 shrink-0 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 dark:bg-[#5e6ad2] dark:text-white dark:hover:bg-[#5369d0]"
                                >
                                    {linkedInSaving
                                        ? 'Vérification…'
                                        : 'Valider'}
                                </Button>
                            </form>
                            {linkedInFeedback ? (
                                <p
                                    className={
                                        linkedInFeedback.type === 'err'
                                            ? 'mt-3 text-sm text-destructive'
                                            : 'mt-3 text-sm text-muted-foreground dark:text-[#8a8a8e]'
                                    }
                                    role={
                                        linkedInFeedback.type === 'err'
                                            ? 'alert'
                                            : 'status'
                                    }
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

export default function PlanPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-muted-foreground sm:py-12">
                    <LoadingSpinner text="Chargement…" />
                </div>
            }
        >
            <PlanPageContent />
        </Suspense>
    );
}
