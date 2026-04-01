'use client';

import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/lib/utils/logger';
import { translateAuthError } from '@/lib/utils/translate-auth-error';
import { toast } from 'sonner';

const MIN_PASSWORD_LEN = 8;

function isInvalidCredentialsMessage(message: string, code?: string): boolean {
    const m = message.toLowerCase();
    if (code === 'invalid_credentials') return true;
    return (
        m.includes('invalid login credentials') ||
        m.includes('invalid credentials') ||
        m.includes('wrong password')
    );
}

function isEmailNotConfirmedError(message: string, code?: string): boolean {
    const m = message.toLowerCase();
    if (code === 'email_not_confirmed') return true;
    return m.includes('email not confirmed') || m.includes('not confirmed');
}

function isDuplicateSignupError(message: string, code?: string): boolean {
    const m = message.toLowerCase();
    if (
        code === 'user_already_exists' ||
        code === 'signup_disabled' ||
        code === 'identity_already_exists'
    ) {
        return true;
    }
    return (
        m.includes('already registered') ||
        m.includes('already exists') ||
        m.includes('user already') ||
        m.includes('duplicate') ||
        m.includes('email address is already')
    );
}

function appPublicOrigin(): string {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (fromEnv) return fromEnv;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
}

async function postUpdatePassword(password: string): Promise<{
    ok: boolean;
    error?: string;
}> {
    const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    return { ok: res.ok && data.success === true, error: data.error };
}

async function redeemInviteToken(token: string): Promise<boolean> {
    const res = await fetch('/api/invitations/redeem', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
    const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
    };
    if (!res.ok || !json.success) {
        toast.error(
            json.error?.message ??
                'Impossible d’activer l’invitation. Vérifiez l’e-mail ou demandez une nouvelle invitation.'
        );
        return false;
    }
    return true;
}

function EmailPasswordLoginFormInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const nextParam = searchParams.get('next');
    const modeParam = searchParams.get('mode');
    const inviteToken = searchParams.get('invite_token');
    const inviteEmailParam = searchParams.get('email');

    const safeNext =
        nextParam?.startsWith('/') && !nextParam.startsWith('//')
            ? nextParam
            : '/dashboard';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const urlErrorHandled = useRef(false);
    const invitePrefillDone = useRef(false);

    const urlError = searchParams.get('error');

    const emailLocked = Boolean(
        inviteEmailParam?.trim() &&
        (Boolean(inviteToken) || modeParam === 'set-password')
    );

    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (invitePrefillDone.current || !inviteEmailParam?.trim()) return;
        invitePrefillDone.current = true;
        setEmail(inviteEmailParam.trim());
    }, [inviteEmailParam]);

    useEffect(() => {
        if (!urlError || urlErrorHandled.current) return;
        urlErrorHandled.current = true;
        const decoded = decodeURIComponent(urlError);
        toast.error(translateAuthError(decoded));
        const params = new URLSearchParams(searchParams.toString());
        params.delete('error');
        const q = params.toString();
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }, [urlError, pathname, router, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            toast.error('Veuillez saisir votre adresse e-mail.');
            return;
        }
        if (password.length < MIN_PASSWORD_LEN) {
            toast.error(
                `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LEN} caractères.`
            );
            return;
        }

        setLoading(true);
        try {
            if (modeParam === 'set-password') {
                const res = await fetch('/api/auth/update-password', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });

                const data = (await res.json()) as {
                    success?: boolean;
                    error?: string;
                };

                console.log('[set-password] status:', res.status, 'data:', data);
                console.log(
                    '[set-password] safeNext:',
                    safeNext,
                    'nextParam:',
                    nextParam
                );

                if (!res.ok || !data.success) {
                    toast.error(
                        data.error ?? 'Impossible de définir le mot de passe.'
                    );
                    return;
                }

                // router.push peut échouer après un flux auth (session non vue côté client) ; reload lit les cookies et le proxy correctement.
                window.location.href = safeNext;
                return;
            }

            const { error: signInErr } = await supabase.auth.signInWithPassword(
                {
                    email: trimmedEmail,
                    password,
                }
            );

            if (!signInErr) {
                if (inviteToken) {
                    const ok = await redeemInviteToken(inviteToken);
                    if (!ok) {
                        return;
                    }
                    router.push('/onboarding');
                } else {
                    router.push(safeNext);
                }
                router.refresh();
                return;
            }

            const signInMsg = signInErr.message ?? '';
            const signInCode =
                'code' in signInErr
                    ? (signInErr as { code?: string }).code
                    : undefined;

            if (isEmailNotConfirmedError(signInMsg, signInCode)) {
                toast.error(translateAuthError(signInErr));
                return;
            }

            if (!isInvalidCredentialsMessage(signInMsg, signInCode)) {
                toast.error(translateAuthError(signInErr));
                return;
            }

            const base = appPublicOrigin();
            const nextAfterConfirm = inviteToken ? '/onboarding' : '/dashboard';
            const confirmQuery = inviteToken
                ? `invite_token=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent(nextAfterConfirm)}`
                : `next=${encodeURIComponent(nextAfterConfirm)}`;
            const emailRedirectTo = base
                ? `${base}/api/auth/confirm?${confirmQuery}`
                : undefined;

            const { data: signUpData, error: signUpErr } =
                await supabase.auth.signUp({
                    email: trimmedEmail,
                    password,
                    options: emailRedirectTo ? { emailRedirectTo } : undefined,
                });

            if (signUpErr) {
                if (
                    isDuplicateSignupError(
                        signUpErr.message ?? '',
                        signUpErr.code
                    )
                ) {
                    if (inviteToken) {
                        const { ok: pwdOk, error: pwdErr } =
                            await postUpdatePassword(password);
                        if (!pwdOk) {
                            toast.error(
                                pwdErr ??
                                    'Veuillez d’abord cliquer sur le lien reçu par e-mail avant de définir votre mot de passe.'
                            );
                            return;
                        }
                        const ok = await redeemInviteToken(inviteToken);
                        if (!ok) return;
                        router.push('/onboarding');
                        router.refresh();
                        return;
                    }
                    toast.error('Mot de passe incorrect.');
                } else {
                    toast.error(translateAuthError(signUpErr));
                }
                return;
            }

            if (signUpData.session) {
                if (inviteToken) {
                    const ok = await redeemInviteToken(inviteToken);
                    if (!ok) return;
                    router.push('/onboarding');
                } else {
                    router.push(safeNext);
                }
                router.refresh();
                return;
            }

            toast.success(
                'Un e-mail de confirmation vient de vous être envoyé.'
            );
            setPassword('');
            return;
        } catch (err: unknown) {
            logger.error('Email auth error:', err);
            toast.error(
                translateAuthError(err instanceof Error ? err : String(err))
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
            <CardContent className="p-8 sm:p-10">
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                            E-mail et mot de passe
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="auth-email">E-mail</Label>
                            <Input
                                id="auth-email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                readOnly={emailLocked}
                                required
                                className={
                                    emailLocked
                                        ? 'cursor-not-allowed opacity-90'
                                        : undefined
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="auth-password">Mot de passe</Label>
                            <Input
                                id="auth-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={MIN_PASSWORD_LEN}
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="secondary"
                            className="w-full h-11"
                            disabled={loading}
                        >
                            {loading ? 'Patientez…' : 'Continuer'}
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}

export function EmailPasswordLoginForm() {
    return (
        <Suspense
            fallback={
                <div className="h-48 animate-pulse rounded-2xl bg-white/5" />
            }
        >
            <EmailPasswordLoginFormInner />
        </Suspense>
    );
}
