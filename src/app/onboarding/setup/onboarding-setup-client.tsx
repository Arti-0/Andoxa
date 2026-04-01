'use client';

import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { DragEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Check,
    ChevronLeft,
    Loader2,
    Moon,
    Puzzle,
    Send,
    Sun,
    Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { OnboardingContinueButton } from '@/components/onboarding/OnboardingContinueButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { linkLinkedInFromOnboarding } from '@/lib/auth/linkedin-auth';
import {
    createOwnerWorkspace,
    uploadOrgLogoIfPresent,
} from '@/lib/onboarding/create-workspace-client';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { validateImageFile } from '@/lib/utils/image-optimization';
import {
    OnboardingSetupUrlSync,
    type SetupUrlNavRef,
} from './onboarding-setup-url-sync';

export type OnboardingMode = 'owner' | 'invited';

export interface OnboardingSetupClientProps {
    mode?: OnboardingMode;
}

/** Invité : pas d’étapes org (2) ni invitations (7) — map step navigation → contenu owner. */
const INVITED_STEP_MAP: Record<number, number> = {
    1: 1,
    2: 3,
    3: 4,
    4: 5,
    5: 6,
    6: 8,
};

/** First step that wraps content in `cardShell` (theme step uses tiles only). */
const FIRST_CARD_STEP = 4;

const slide = {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -28 },
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function isValidEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function LinkedInMark({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
        >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
    );
}

function WhatsAppMark({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
        >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
    );
}

function linkedinDisplayFromUser(user: {
    identities?: {
        provider: string;
        identity_data?: Record<string, unknown>;
    }[];
    user_metadata?: Record<string, unknown>;
}): { name: string; picture: string | null } {
    const li = user.identities?.find((i) => i.provider === 'linkedin_oidc');
    const id = (li?.identity_data ?? {}) as Record<string, unknown>;
    const given = typeof id.given_name === 'string' ? id.given_name : '';
    const family = typeof id.family_name === 'string' ? id.family_name : '';
    const combined = `${given} ${family}`.trim();
    const name =
        (typeof id.name === 'string' && id.name) ||
        combined ||
        (typeof id.full_name === 'string' && id.full_name) ||
        (typeof user.user_metadata?.full_name === 'string' &&
            user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === 'string' &&
            user.user_metadata.name) ||
        'Profil LinkedIn';
    const picture =
        (typeof id.picture === 'string' && id.picture) ||
        (typeof id.avatar_url === 'string' && id.avatar_url) ||
        (typeof user.user_metadata?.avatar_url === 'string' &&
            user.user_metadata.avatar_url) ||
        (typeof user.user_metadata?.picture === 'string' &&
            user.user_metadata.picture) ||
        null;
    return { name, picture };
}

export function OnboardingSetupClient({
    mode = 'owner',
}: OnboardingSetupClientProps) {
    const router = useRouter();
    const TOTAL_STEPS = mode === 'invited' ? 6 : 8;
    const { setTheme, resolvedTheme } = useTheme();

    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(1);
    const [fullName, setFullName] = useState('');
    const [orgName, setOrgName] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    /** Logo URL persistée (storage) quand l’org existe déjà — affichée si pas de fichier local en cours */
    const [orgLogoRemoteUrl, setOrgLogoRemoteUrl] = useState<string | null>(
        null
    );
    const [logoDragActive, setLogoDragActive] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [linkedinLinked, setLinkedinLinked] = useState(false);
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const [liProfile, setLiProfile] = useState<{
        name: string;
        picture: string | null;
    } | null>(null);
    const [connectingLi, setConnectingLi] = useState(false);
    const [connectingWa, setConnectingWa] = useState(false);
    const [inviteEmails, setInviteEmails] = useState(['', '', '', '', '']);
    const [inviteSending, setInviteSending] = useState(false);
    const urlNavRef = useRef<SetupUrlNavRef | null>(null);
    const nameHydrated = useRef(false);
    const orgFieldsHydrated = useRef(false);

    const contentStep = useMemo(
        () =>
            mode === 'invited'
                ? (INVITED_STEP_MAP[step] ?? step)
                : step,
        [mode, step]
    );

    const chromeExtUrl = process.env.NEXT_PUBLIC_EXTENSION_CHROME_URL ?? '';
    const firefoxExtUrl = process.env.NEXT_PUBLIC_EXTENSION_FIREFOX_URL ?? '';

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        return () => {
            if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
        };
    }, [logoPreviewUrl]);

    const applyLogoFile = useCallback((file: File | null) => {
        if (!file || file.size === 0) {
            setLogoFile(null);
            setLogoPreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            return;
        }
        const msg = validateImageFile(file, 2);
        if (msg) {
            toast.error(msg);
            return;
        }
        setLogoFile(file);
        setLogoPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
    }, []);

    const handleLogoDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setLogoDragActive(true);
        } else if (e.type === 'dragleave') {
            setLogoDragActive(false);
        }
    }, []);

    const handleLogoDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setLogoDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) applyLogoFile(file);
        },
        [applyLogoFile]
    );

    const refreshAuthAndProfile = useCallback(async () => {
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const linked =
            user.identities?.some((i) => i.provider === 'linkedin_oidc') ??
            false;
        setLinkedinLinked(linked);
        if (linked) setLiProfile(linkedinDisplayFromUser(user));

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, active_organization_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profile?.active_organization_id) {
            setOrgId(profile.active_organization_id);
            if (!orgFieldsHydrated.current) {
                const { data: orgRow } = await supabase
                    .from('organizations')
                    .select('name, logo_url')
                    .eq('id', profile.active_organization_id)
                    .maybeSingle();
                if (orgRow?.name) {
                    setOrgName(orgRow.name);
                }
                if (orgRow?.logo_url && typeof orgRow.logo_url === 'string') {
                    setOrgLogoRemoteUrl(orgRow.logo_url);
                }
                orgFieldsHydrated.current = true;
            }
        } else {
            setOrgId(null);
        }
        if (profile?.full_name && !nameHydrated.current) {
            nameHydrated.current = true;
            setFullName(profile.full_name);
        }
    }, []);

    const fetchUnipile = useCallback(async () => {
        try {
            const res = await fetch('/api/unipile/me', {
                credentials: 'include',
            });
            const json = (await res.json()) as {
                success?: boolean;
                data?: { whatsapp_connected?: boolean };
                whatsapp_connected?: boolean;
            };
            const data = json.data ?? json;
            setWhatsappConnected(!!data.whatsapp_connected);
        } catch {
            setWhatsappConnected(false);
        }
    }, []);

    useEffect(() => {
        void refreshAuthAndProfile();
    }, [refreshAuthAndProfile]);

    useEffect(() => {
        if (contentStep !== 4) return;
        void fetchUnipile();
    }, [contentStep, fetchUnipile]);

    useEffect(() => {
        if (contentStep !== 4 || whatsappConnected) return;

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                void fetchUnipile();
            }
        };

        const onFocus = () => {
            void fetchUnipile();
        };

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onFocus);

        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onFocus);
        };
    }, [contentStep, whatsappConnected, fetchUnipile]);

    const applyStepInUrl = useCallback((next: number) => {
        if (urlNavRef.current) {
            urlNavRef.current.setStepInUrl(next);
        } else {
            setStep(next);
        }
    }, []);

    const canContinue = useMemo(() => {
        if (contentStep === 1) return fullName.trim().length >= 2;
        if (contentStep === 2) {
            if (mode === 'owner') {
                return !!orgId || orgName.trim().length >= 2;
            }
            return true;
        }
        return true;
    }, [contentStep, fullName, orgName, orgId, mode]);

    const handleContinue = async () => {
        if (!canContinue) return;
        if (contentStep === 1) {
            setSavingName(true);
            try {
                const res = await fetch('/api/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ full_name: fullName.trim() }),
                });
                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(
                        json.error?.message ?? 'Échec de l’enregistrement'
                    );
                }
                nameHydrated.current = true;
                applyStepInUrl(2);
            } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Erreur');
            } finally {
                setSavingName(false);
            }
            return;
        }
        if (contentStep === 2 && mode === 'owner') {
            if (orgId) {
                setSavingName(true);
                try {
                    const res = await fetch(`/api/organizations/${orgId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ name: orgName.trim() }),
                    });
                    const json = (await res.json()) as { error?: string };
                    if (!res.ok) {
                        throw new Error(json.error ?? 'Mise à jour impossible');
                    }
                    const newLogoUrl = await uploadOrgLogoIfPresent(
                        orgId,
                        logoFile
                    );
                    setLogoFile(null);
                    setLogoPreviewUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return null;
                    });
                    if (newLogoUrl) {
                        setOrgLogoRemoteUrl(newLogoUrl);
                    }
                    await refreshAuthAndProfile();
                    applyStepInUrl(3);
                } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Erreur');
                } finally {
                    setSavingName(false);
                }
                return;
            }
            setSavingName(true);
            try {
                const created = await createOwnerWorkspace({
                    orgName: orgName.trim(),
                    fullNameForProfile: fullName.trim(),
                    logoFile,
                });
                if (!created.ok) {
                    toast.error(created.error);
                    return;
                }
                setOrgId(created.organizationId);
                await refreshAuthAndProfile();
                applyStepInUrl(3);
            } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Erreur');
            } finally {
                setSavingName(false);
            }
            return;
        }
        if (step < TOTAL_STEPS) {
            applyStepInUrl(step + 1);
        }
    };

    const handleBack = () => {
        if (step <= 1) return;
        applyStepInUrl(step - 1);
    };

    const handleConnectLinkedIn = async () => {
        setConnectingLi(true);
        try {
            await linkLinkedInFromOnboarding();
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : 'Connexion LinkedIn impossible'
            );
            setConnectingLi(false);
        }
    };

    const handleConnectWhatsApp = async () => {
        if (!orgId) {
            toast.error(
                'Créez d’abord une organisation pour connecter WhatsApp.'
            );
            return;
        }
        setConnectingWa(true);
        try {
            const res = await fetch('/api/unipile/connect-whatsapp', {
                method: 'POST',
                credentials: 'include',
            });
            const json = await res.json();
            const data = json?.data ?? json;
            const url = (data as { url?: string })?.url;
            if (url) {
                window.location.href = url;
                return;
            }
            toast.error(
                (json?.error?.message as string) ??
                    'Impossible de lancer WhatsApp'
            );
        } catch {
            toast.error('Impossible de lancer WhatsApp');
        } finally {
            setConnectingWa(false);
        }
    };

    const handleSendInvites = async () => {
        if (!orgId) {
            toast.error('Organisation requise pour inviter.');
            return;
        }
        const emails = inviteEmails.map((e) => e.trim()).filter(isValidEmail);
        if (emails.length === 0) {
            toast.error('Ajoutez au moins une adresse e-mail valide.');
            return;
        }
        setInviteSending(true);
        try {
            let ok = 0;
            for (const email of emails) {
                const res = await fetch('/api/invitations/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        email,
                        organization_id: orgId,
                        role: 'member',
                    }),
                });
                const json = (await res.json()) as {
                    success?: boolean;
                    error?: { message?: string };
                };
                if (res.ok && json.success) ok += 1;
            }
            if (ok > 0) {
                const inviteMsg =
                    ok === 1
                        ? '1 invitation envoyée !'
                        : `${ok} invitations envoyées !`;
                toast.success(inviteMsg);
                applyStepInUrl(8);
            } else {
                toast.error('Aucune invitation n’a pu être envoyée.');
            }
        } finally {
            setInviteSending(false);
        }
    };

    const handleSkipInvites = () => {
        applyStepInUrl(8);
    };

    const handleEnterDashboard = () => {
        router.push(mode === 'invited' ? '/dashboard' : '/onboarding/plan');
    };

    const cardShell =
        'max-w-md w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl dark:shadow-none backdrop-blur-xl transition-all sm:rounded-3xl sm:p-10';

    const subClass =
        'text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mt-2 mb-8';

    const fieldLabelClass =
        'text-sm font-medium text-zinc-700 dark:text-zinc-300';

    const inputPremiumClass =
        'w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-lg px-4 py-3 h-auto shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:focus-visible:ring-white/20 transition-all';

    const setupFormMax = 'w-full max-w-sm sm:max-w-md mx-auto';

    /** Onboarding step titles (steps 1–3+): same scale, centered */
    const welcomeStepTitleClass =
        'text-balance text-center text-2xl font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl sm:leading-tight md:text-4xl';
    const welcomeQuestionClass =
        'text-base font-medium text-zinc-800 dark:text-zinc-200 sm:text-lg';

    const showCardChrome = contentStep >= FIRST_CARD_STEP;

    const stepDots = (
        <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3.5 sm:gap-4"
            role="tablist"
            aria-label={`Étape ${step} sur ${TOTAL_STEPS}`}
        >
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const n = i + 1;
                const active = step === n;
                return (
                    <span
                        key={n}
                        role="tab"
                        aria-selected={active}
                        aria-current={active ? 'step' : undefined}
                        className={cn(
                            'rounded-full transition-all duration-200 ease-out',
                            active
                                ? 'size-2 bg-zinc-900 dark:bg-white'
                                : 'size-1.5 bg-zinc-300/90 dark:bg-zinc-600'
                        )}
                    />
                );
            })}
        </div>
    );

    return (
        <div className="flex min-h-dvh w-full flex-col bg-zinc-50 transition-colors duration-300 dark:bg-[#0A0A0A]">
            <Suspense fallback={null}>
                <OnboardingSetupUrlSync
                    totalSteps={TOTAL_STEPS}
                    setStep={setStep}
                    refreshAuthAndProfile={refreshAuthAndProfile}
                    urlNavRef={urlNavRef}
                />
            </Suspense>

            <header className="relative flex h-13 shrink-0 items-center px-3 pt-[env(safe-area-inset-top,0px)] sm:h-14 sm:px-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="relative z-10 -ml-1 h-9 shrink-0 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 sm:-ml-2"
                    disabled={step <= 1}
                    onClick={handleBack}
                >
                    <ChevronLeft className="size-4" />
                    <span className="max-sm:sr-only">Retour</span>
                </Button>
                {stepDots}
                <div
                    className="relative z-10 ml-auto w-14 shrink-0 sm:w-18"
                    aria-hidden
                />
            </header>

            <div className="flex min-h-0 flex-1 flex-col">
                <div
                    className={cn(
                        'mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4 sm:max-w-xl sm:px-6',
                        showCardChrome && 'sm:px-6'
                    )}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={slide.initial}
                            animate={slide.animate}
                            exit={slide.exit}
                            transition={{
                                duration: 0.22,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            {contentStep === 1 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    Bienvenue sur Andoxa
                                                </h1>
                                                <p
                                                    className={cn(
                                                        welcomeQuestionClass,
                                                        'text-center'
                                                    )}
                                                >
                                                    Comment doit-on vous appeler
                                                    ?
                                                </p>
                                                <div className="w-full space-y-2 text-left">
                                                    <Label
                                                        htmlFor="fullName"
                                                        className={
                                                            fieldLabelClass
                                                        }
                                                    >
                                                        Votre nom
                                                    </Label>
                                                    <Input
                                                        id="fullName"
                                                        value={fullName}
                                                        onChange={(e) =>
                                                            setFullName(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Marie Dupont"
                                                        autoComplete="name"
                                                        className={cn(
                                                            inputPremiumClass,
                                                            'min-h-11 text-base sm:min-h-10 sm:text-sm'
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex w-full justify-center">
                                                <OnboardingContinueButton
                                                    disabled={!canContinue}
                                                    loading={savingName}
                                                    onClick={() =>
                                                        void handleContinue()
                                                    }
                                                >
                                                    Continuer
                                                </OnboardingContinueButton>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentStep === 2 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    Créez votre organisation
                                                </h1>
                                                <div className="space-y-5 text-left">
                                                    <div className="space-y-2">
                                                        <Label
                                                            htmlFor="setup-org-name"
                                                            className={
                                                                fieldLabelClass
                                                            }
                                                        >
                                                            Nom de
                                                            l’organisation
                                                        </Label>
                                                        <Input
                                                            id="setup-org-name"
                                                            value={orgName}
                                                            onChange={(e) =>
                                                                setOrgName(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="Acme"
                                                            autoComplete="organization"
                                                            className={cn(
                                                                inputPremiumClass,
                                                                'min-h-11 text-base sm:min-h-10 sm:text-sm'
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label
                                                            className={
                                                                fieldLabelClass
                                                            }
                                                        >
                                                            Logo (optionnel)
                                                        </Label>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(ev) => {
                                                                if (
                                                                    ev.key ===
                                                                        'Enter' ||
                                                                    ev.key ===
                                                                        ' '
                                                                ) {
                                                                    ev.preventDefault();
                                                                    document
                                                                        .getElementById(
                                                                            'setup-org-logo-input'
                                                                        )
                                                                        ?.click();
                                                                }
                                                            }}
                                                            onDragEnter={
                                                                handleLogoDrag
                                                            }
                                                            onDragLeave={
                                                                handleLogoDrag
                                                            }
                                                            onDragOver={
                                                                handleLogoDrag
                                                            }
                                                            onDrop={
                                                                handleLogoDrop
                                                            }
                                                            onClick={() =>
                                                                document
                                                                    .getElementById(
                                                                        'setup-org-logo-input'
                                                                    )
                                                                    ?.click()
                                                            }
                                                            className={cn(
                                                                'relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 p-3 transition-colors dark:border-white/10 sm:min-h-30 sm:p-4',
                                                                'hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-white/20 dark:hover:bg-white/5',
                                                                logoDragActive &&
                                                                    'border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-white/10'
                                                            )}
                                                        >
                                                            <input
                                                                id="setup-org-logo-input"
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                disabled={
                                                                    savingName
                                                                }
                                                                onChange={(
                                                                    ev
                                                                ) =>
                                                                    applyLogoFile(
                                                                        ev
                                                                            .target
                                                                            .files?.[0] ??
                                                                            null
                                                                    )
                                                                }
                                                            />
                                                            {logoPreviewUrl ? (
                                                                // eslint-disable-next-line @next/next/no-img-element -- blob preview
                                                                <img
                                                                    src={
                                                                        logoPreviewUrl
                                                                    }
                                                                    alt=""
                                                                    className="h-14 w-14 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-white/15 sm:h-16 sm:w-16"
                                                                />
                                                            ) : orgLogoRemoteUrl ? (
                                                                <Image
                                                                    src={
                                                                        orgLogoRemoteUrl
                                                                    }
                                                                    alt=""
                                                                    width={64}
                                                                    height={64}
                                                                    className="h-14 w-14 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-white/15 sm:h-16 sm:w-16"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <>
                                                                    <Upload
                                                                        className={cn(
                                                                            'size-6',
                                                                            logoDragActive
                                                                                ? 'text-zinc-600 dark:text-zinc-300'
                                                                                : 'text-zinc-400 dark:text-zinc-500'
                                                                        )}
                                                                    />
                                                                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                                                        Glisser-déposer
                                                                        ou
                                                                        cliquer
                                                                        — max 2
                                                                        Mo
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <OnboardingContinueButton
                                                        disabled={!canContinue}
                                                        loading={savingName}
                                                        onClick={() =>
                                                            void handleContinue()
                                                        }
                                                    >
                                                        Continuer
                                                    </OnboardingContinueButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentStep === 3 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    Sélectionnez un thème
                                                </h1>
                                                <div className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setTheme('light')
                                                        }
                                                        className={cn(
                                                            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors sm:gap-3 sm:p-6',
                                                            mounted &&
                                                                resolvedTheme ===
                                                                    'light'
                                                                ? 'border-zinc-900 bg-zinc-50 dark:border-white'
                                                                : 'border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20'
                                                        )}
                                                    >
                                                        <Sun className="size-7 text-amber-500 sm:size-8" />
                                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:text-base">
                                                            Mode clair
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setTheme('dark')
                                                        }
                                                        className={cn(
                                                            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors sm:gap-3 sm:p-6',
                                                            mounted &&
                                                                resolvedTheme ===
                                                                    'dark'
                                                                ? 'border-zinc-100 bg-zinc-900'
                                                                : 'border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20'
                                                        )}
                                                    >
                                                        <Moon className="size-7 text-violet-300 sm:size-8" />
                                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:text-base">
                                                            Mode sombre
                                                        </span>
                                                    </button>
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <OnboardingContinueButton
                                                        disabled={!canContinue}
                                                        loading={savingName}
                                                        onClick={() =>
                                                            void handleContinue()
                                                        }
                                                    >
                                                        Continuer
                                                    </OnboardingContinueButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentStep === 4 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    {!linkedinLinked
                                                        ? 'Connectez votre LinkedIn.'
                                                        : 'LinkedIn connecté'}
                                                </h1>
                                                <div
                                                    className={cn(
                                                        cardShell,
                                                        setupFormMax,
                                                        'text-center'
                                                    )}
                                                >
                                            {!linkedinLinked ? (
                                                <>
                                                    <div className="mx-auto mb-4 flex size-13 items-center justify-center rounded-2xl bg-[#0077B5]/10 shadow-inner shadow-[#0077B5]/5 dark:bg-[#0077B5]/15">
                                                        <LinkedInMark className="size-8 text-[#0077B5]" />
                                                    </div>
                                                    <p
                                                        className={cn(
                                                            subClass,
                                                            '!mt-0'
                                                        )}
                                                    >
                                                        Optionnel pour l’instant
                                                        — vous pourrez le faire
                                                        plus tard depuis les
                                                        paramètres. Andoxa
                                                        s’appuie sur LinkedIn
                                                        pour les prospects et
                                                        l’automatisation.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        className="h-12 w-full rounded-xl border-0 bg-[#0077B5] py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#00669c] disabled:opacity-60 sm:h-auto sm:text-sm"
                                                        disabled={connectingLi}
                                                        onClick={() =>
                                                            void handleConnectLinkedIn()
                                                        }
                                                    >
                                                        {connectingLi ? (
                                                            <Loader2 className="mr-2 inline size-4 animate-spin align-middle" />
                                                        ) : null}
                                                        Connecter LinkedIn
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="space-y-4 sm:space-y-5">
                                                    <div className="relative mx-auto size-24 shrink-0 sm:size-29">
                                                        {liProfile?.picture ? (
                                                            <Image
                                                                src={
                                                                    liProfile.picture
                                                                }
                                                                alt="Photo de profil LinkedIn"
                                                                width={116}
                                                                height={116}
                                                                className="size-24 rounded-full object-cover shadow-xl ring-4 ring-zinc-100 dark:ring-zinc-800 sm:size-29"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <Avatar className="size-24 shadow-xl ring-4 ring-zinc-100 dark:ring-zinc-800 sm:size-29">
                                                                <AvatarFallback className="text-xl font-semibold sm:text-2xl">
                                                                    {initialsFromName(
                                                                        liProfile?.name ??
                                                                            '?'
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        )}
                                                        <span
                                                            className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white dark:ring-zinc-900 sm:size-9"
                                                            aria-hidden
                                                        >
                                                            <Check
                                                                className="size-4 sm:size-5"
                                                                strokeWidth={
                                                                    2.5
                                                                }
                                                            />
                                                        </span>
                                                    </div>
                                                    <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                                                        {liProfile?.name ??
                                                            'Profil LinkedIn'}
                                                    </p>
                                                    <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                        Votre compte est prêt
                                                        pour la prospection.
                                                    </p>
                                                    <div
                                                        className="mx-auto flex w-full items-center justify-center rounded-xl bg-green-500/10 py-3 text-sm font-semibold text-green-500 dark:text-green-400"
                                                        role="status"
                                                    >
                                                        Compte lié
                                                    </div>
                                                </div>
                                            )}
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <OnboardingContinueButton
                                                        disabled={!canContinue}
                                                        loading={savingName}
                                                        onClick={() =>
                                                            void handleContinue()
                                                        }
                                                    >
                                                        Continuer
                                                    </OnboardingContinueButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentStep === 5 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    {!whatsappConnected
                                                        ? 'Liez votre WhatsApp.'
                                                        : 'WhatsApp connecté'}
                                                </h1>
                                                <div
                                                    className={cn(
                                                        cardShell,
                                                        setupFormMax,
                                                        'text-center'
                                                    )}
                                                >
                                            {!whatsappConnected ? (
                                                <>
                                                    <div className="mx-auto mb-4 flex size-13 items-center justify-center rounded-2xl bg-[#25D366]/10 shadow-inner shadow-[#25D366]/5 dark:bg-[#25D366]/15">
                                                        <WhatsAppMark className="size-8 text-[#25D366]" />
                                                    </div>
                                                    <p
                                                        className={cn(
                                                            subClass,
                                                            '!mt-0'
                                                        )}
                                                    >
                                                        Optionnel pour l’instant
                                                        — à configurer quand
                                                        vous serez prêt.
                                                        Messagerie instantanée
                                                        depuis votre CRM.
                                                    </p>
                                                    {!orgId ? (
                                                        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-sm text-zinc-800 dark:text-zinc-200 sm:p-4">
                                                            Une organisation est
                                                            requise pour connecter
                                                            WhatsApp.{' '}
                                                            {mode === 'owner' ? (
                                                                <button
                                                                    type="button"
                                                                    className="font-medium text-[#5e6ad2] underline-offset-2 hover:underline"
                                                                    onClick={() =>
                                                                        applyStepInUrl(
                                                                            2
                                                                        )
                                                                    }
                                                                >
                                                                    Configurer
                                                                    l’organisation
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="font-medium text-[#5e6ad2] underline-offset-2 hover:underline"
                                                                    onClick={() =>
                                                                        void refreshAuthAndProfile()
                                                                    }
                                                                >
                                                                    Actualiser le
                                                                    profil
                                                                </button>
                                                            )}
                                                        </p>
                                                    ) : null}
                                                    <Button
                                                        type="button"
                                                        className="h-12 w-full rounded-xl border-0 bg-[#25D366] py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-[#20BD5A] disabled:opacity-60 sm:h-auto sm:text-sm"
                                                        disabled={
                                                            connectingWa ||
                                                            !orgId
                                                        }
                                                        onClick={() =>
                                                            void handleConnectWhatsApp()
                                                        }
                                                    >
                                                        {connectingWa ? (
                                                            <Loader2 className="mr-2 inline size-4 animate-spin align-middle" />
                                                        ) : null}
                                                        Connecter WhatsApp
                                                    </Button>
                                                    {orgId ? (
                                                        <p className="mt-3 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                                                            Après ouverture du
                                                            lien sur votre
                                                            téléphone, la
                                                            connexion se met à
                                                            jour
                                                            automatiquement.
                                                        </p>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <div className="space-y-4 sm:space-y-5">
                                                    <div className="relative mx-auto size-24 shrink-0 sm:size-29">
                                                        <div className="flex size-24 items-center justify-center rounded-full bg-[#25D366]/12 shadow-xl ring-4 ring-zinc-100 dark:bg-[#25D366]/18 dark:ring-zinc-800 sm:size-29">
                                                            <WhatsAppMark className="size-12 text-[#25D366] sm:size-14" />
                                                        </div>
                                                        <span
                                                            className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white dark:ring-zinc-900 sm:size-9"
                                                            aria-hidden
                                                        >
                                                            <Check
                                                                className="size-4 sm:size-5"
                                                                strokeWidth={
                                                                    2.5
                                                                }
                                                            />
                                                        </span>
                                                    </div>
                                                    <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                                                        Messagerie instantanée
                                                        active
                                                    </p>
                                                    <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                        Vous pouvez envoyer et
                                                        recevoir des messages
                                                        depuis Andoxa.
                                                    </p>
                                                    <div
                                                        className="mx-auto flex w-full items-center justify-center rounded-xl bg-green-500/10 py-3 text-sm font-semibold text-green-500 dark:text-green-400"
                                                        role="status"
                                                    >
                                                        Compte lié
                                                    </div>
                                                </div>
                                            )}
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <OnboardingContinueButton
                                                        disabled={!canContinue}
                                                        loading={savingName}
                                                        onClick={() =>
                                                            void handleContinue()
                                                        }
                                                    >
                                                        Continuer
                                                    </OnboardingContinueButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentStep === 6 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    Installez l’extension.
                                                </h1>
                                                <div
                                                    className={cn(
                                                        cardShell,
                                                        setupFormMax,
                                                        'text-center'
                                                    )}
                                                >
                                            <p
                                                className={cn(
                                                    subClass,
                                                    '!mt-0'
                                                )}
                                            >
                                                L’extension Andoxa vous permet
                                                d’extraire des prospects et de
                                                déclencher des flux depuis votre
                                                navigateur.
                                            </p>
                                            <div
                                                className="mx-auto mt-2 max-w-xs rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-white/10 dark:bg-zinc-900"
                                                aria-hidden
                                            >
                                                <div className="flex h-9 items-center gap-1 rounded-md bg-white px-2 dark:bg-zinc-950">
                                                    <div className="h-2 w-2 rounded-full bg-red-400" />
                                                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                                    <div className="ml-4 flex flex-1 justify-end gap-1">
                                                        <span className="inline-flex size-7 items-center justify-center rounded border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
                                                            <Puzzle className="size-4 text-zinc-500" />
                                                        </span>
                                                        <span className="inline-flex size-7 items-center justify-center rounded border border-[#5e6ad2]/40 bg-[#5e6ad2]/15 text-xs font-bold text-[#5e6ad2]">
                                                            A
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-center text-[10px] text-zinc-500 dark:text-zinc-500">
                                                    Repérez l’icône puzzle →
                                                    Andoxa dans la barre
                                                    d’outils
                                                </p>
                                            </div>
                                            <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
                                                {chromeExtUrl ? (
                                                    <Button
                                                        asChild
                                                        className="h-11 min-h-11 flex-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 sm:flex-none sm:px-4"
                                                    >
                                                        <a
                                                            href={chromeExtUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <span className="sm:hidden">
                                                                Chrome
                                                            </span>
                                                            <span className="hidden sm:inline">
                                                                Télécharger pour
                                                                Chrome
                                                            </span>
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-11 min-h-11 flex-1 border-zinc-300 dark:border-white/15 sm:flex-none"
                                                        onClick={() =>
                                                            toast.message(
                                                                'Lien Chrome non configuré',
                                                                {
                                                                    description:
                                                                        'Définissez NEXT_PUBLIC_EXTENSION_CHROME_URL.',
                                                                }
                                                            )
                                                        }
                                                    >
                                                        <span className="sm:hidden">
                                                            Chrome
                                                        </span>
                                                        <span className="hidden sm:inline">
                                                            Télécharger pour
                                                            Chrome
                                                        </span>
                                                    </Button>
                                                )}
                                                {firefoxExtUrl ? (
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        className="h-11 min-h-11 flex-1 dark:border-white/15 sm:flex-none sm:px-4"
                                                    >
                                                        <a
                                                            href={firefoxExtUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <span className="sm:hidden">
                                                                Firefox
                                                            </span>
                                                            <span className="hidden sm:inline">
                                                                Télécharger pour
                                                                Firefox
                                                            </span>
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-11 min-h-11 flex-1 dark:border-white/15 sm:flex-none"
                                                        onClick={() =>
                                                            window.open(
                                                                'https://addons.mozilla.org',
                                                                '_blank'
                                                            )
                                                        }
                                                    >
                                                        <span className="sm:hidden">
                                                            Firefox
                                                        </span>
                                                        <span className="hidden sm:inline">
                                                            Télécharger pour
                                                            Firefox
                                                        </span>
                                                    </Button>
                                                )}
                                            </div>
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <OnboardingContinueButton
                                                        disabled={!canContinue}
                                                        loading={savingName}
                                                        onClick={() =>
                                                            void handleContinue()
                                                        }
                                                    >
                                                        Continuer
                                                    </OnboardingContinueButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentStep === 7 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    Invitez vos collègues.
                                                </h1>
                                                <div
                                                    className={cn(
                                                        setupFormMax,
                                                        'w-full text-left'
                                                    )}
                                                >
                                            <p
                                                className={cn(
                                                    subClass,
                                                    '!mt-0 mb-6 text-center'
                                                )}
                                            >
                                                Andoxa est plus puissant lorsque
                                                toute votre équipe est à bord.
                                                Chaque adresse recevra un e-mail
                                                d&apos;invitation Andoxa avec un
                                                lien sécurisé.
                                            </p>
                                            {!orgId ? (
                                                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                                                    Les invitations nécessitent
                                                    une organisation active.{' '}
                                                    <button
                                                        type="button"
                                                        className="text-[#5e6ad2] underline"
                                                        onClick={() =>
                                                            applyStepInUrl(2)
                                                        }
                                                    >
                                                        Configurer
                                                        l’organisation
                                                    </button>
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {inviteEmails
                                                        .slice(0, 5)
                                                        .map((v, i) => (
                                                            <Input
                                                                key={i}
                                                                type="email"
                                                                inputMode="email"
                                                                placeholder={`collegue${i + 1}@entreprise.com`}
                                                                value={v}
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    const next =
                                                                        [
                                                                            ...inviteEmails,
                                                                        ];
                                                                    next[i] =
                                                                        e.target.value;
                                                                    setInviteEmails(
                                                                        next
                                                                    );
                                                                }}
                                                                className={cn(
                                                                    inputPremiumClass,
                                                                    'min-h-11 text-base sm:min-h-10 sm:text-sm'
                                                                )}
                                                            />
                                                        ))}
                                                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                                                        <Button
                                                            type="button"
                                                            className="h-11 min-h-11 w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 sm:w-auto"
                                                            disabled={
                                                                inviteSending ||
                                                                !orgId
                                                            }
                                                            onClick={() =>
                                                                void handleSendInvites()
                                                            }
                                                        >
                                                            {inviteSending ? (
                                                                <Loader2 className="size-4 animate-spin" />
                                                            ) : (
                                                                <Send className="size-4" />
                                                            )}
                                                            Envoyer les
                                                            invitations
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-8 flex justify-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="h-10 text-zinc-500 dark:text-zinc-400"
                                                    onClick={handleSkipInvites}
                                                >
                                                    Passer pour l’instant
                                                </Button>
                                            </div>
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <OnboardingContinueButton
                                                        disabled={!canContinue}
                                                        loading={savingName}
                                                        onClick={() =>
                                                            void handleContinue()
                                                        }
                                                    >
                                                        Continuer
                                                    </OnboardingContinueButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contentStep === 8 && (
                                <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
                                    <div
                                        className={cn(
                                            'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                setupFormMax,
                                                'flex min-h-[450px] w-full flex-col justify-center gap-20'
                                            )}
                                        >
                                            <div className="flex w-full flex-col gap-12">
                                                <h1
                                                    className={
                                                        welcomeStepTitleClass
                                                    }
                                                >
                                                    {fullName.trim()
                                                        ? `Tout est prêt, ${fullName.trim()}.`
                                                        : 'Tout est prêt.'}
                                                </h1>
                                                <div
                                                    className={cn(
                                                        cardShell,
                                                        'w-full max-w-md text-center sm:max-w-lg'
                                                    )}
                                                >
                                            <p
                                                className={cn(
                                                    subClass,
                                                    '!mt-0'
                                                )}
                                            >
                                                {mode === 'invited'
                                                    ? 'Vous êtes prêt à utiliser Andoxa avec votre équipe. Accédez au tableau de bord pour commencer.'
                                                    : 'Il reste à choisir votre offre pour activer l’espace, puis vous accéderez au tableau de bord.'}
                                            </p>
                                            <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80">
                                                <div className="flex items-center gap-1.5 border-b border-zinc-200 px-3 py-2 dark:border-white/10">
                                                    <div className="size-2 rounded-full bg-red-400/90" />
                                                    <div className="size-2 rounded-full bg-amber-400/90" />
                                                    <div className="size-2 rounded-full bg-emerald-400/90" />
                                                    <span className="ml-2 text-[10px] text-zinc-500 dark:text-zinc-500">
                                                        Tableau de bord
                                                    </span>
                                                </div>
                                                <div className="grid gap-2 p-3 sm:p-4 sm:grid-cols-3">
                                                    <div className="h-16 rounded-lg bg-white/80 dark:bg-zinc-950/80 sm:h-20" />
                                                    <div className="h-16 rounded-lg bg-white/80 dark:bg-zinc-950/80 sm:col-span-2 sm:h-20" />
                                                    <div className="h-24 rounded-lg bg-white/80 dark:bg-zinc-950/80 sm:col-span-3 sm:h-28" />
                                                </div>
                                            </div>
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <OnboardingContinueButton
                                                        onClick={
                                                            handleEnterDashboard
                                                        }
                                                    >
                                                        {mode === 'invited'
                                                            ? 'Accéder au tableau de bord'
                                                            : 'Continuer vers l’offre'}
                                                    </OnboardingContinueButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
