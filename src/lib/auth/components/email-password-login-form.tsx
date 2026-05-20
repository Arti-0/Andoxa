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
import { resolveClientAppOrigin } from '@/lib/config/app-url';
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
    return resolveClientAppOrigin();
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

                console.log(
                    '[set-password] status:',
                    res.status,
                    'data:',
                    data
                );
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

                // Navigation document complète : le proxy voit les cookies posés par update-password.
                // assign est plus fiable que location.href (moins interceptable) vs router.refresh/push.
                window.location.assign(safeNext);
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

    const handleGoogle = async () => {
        // Supabase OAuth handles the round-trip — emailRedirectTo equivalent
        // is `redirectTo`. We send users back to /auth/callback which finishes
        // the code exchange and forwards to `safeNext` (or /onboarding when an
        // invite is in play).
        const base = appPublicOrigin();
        const nextAfter = inviteToken ? '/onboarding' : safeNext;
        const callbackQuery = inviteToken
            ? `?invite_token=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent(nextAfter)}`
            : `?next=${encodeURIComponent(nextAfter)}`;
        const redirectTo = base ? `${base}/auth/callback${callbackQuery}` : undefined;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: redirectTo ? { redirectTo } : undefined,
        });
        if (error) {
            toast.error(translateAuthError(error));
        }
        // No success-path navigation here — Supabase performs a full redirect.
    };

    return (
        <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
            <CardContent className="p-8 sm:p-10">
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                            Connexion ou création
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Un seul formulaire — on détecte si vous avez déjà un compte.
                        </p>
                    </div>

                    {/* Google OAuth — single click, no password to remember. The
                        Supabase callback finishes the exchange via /auth/callback. */}
                    <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={loading}
                        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                    >
                        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
                            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.9 35.3 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
                        </svg>
                        Continuer avec Google
                    </button>

                    <div className="relative flex items-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-400">
                        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                        <span>ou</span>
                        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
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

                    <p className="text-center text-[11.5px] text-slate-500 dark:text-slate-400">
                        Première fois ? On crée votre compte automatiquement.{' '}
                        Déjà inscrit ? On vous connecte.
                    </p>
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
