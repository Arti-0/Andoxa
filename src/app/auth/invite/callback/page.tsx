'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const INVITE_LINK_ERROR_MESSAGE =
    "Lien invalide ou expiré. Demandez un nouvel email d'invitation.";

function InviteCallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite_token');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function handleInvite() {
            try {
                const hashParams = new URLSearchParams(
                    window.location.hash.slice(1)
                );

                const hashError = hashParams.get('error');
                if (hashError) {
                    setErrorMsg(
                        hashParams.get('error_description') ??
                            INVITE_LINK_ERROR_MESSAGE
                    );
                    return;
                }

                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (!accessToken || !refreshToken) {
                    setErrorMsg(INVITE_LINK_ERROR_MESSAGE);
                    return;
                }

                const supabaseUrl = (
                    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
                ).replace(/\/$/, '');
                const supabaseKey =
                    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
                if (!supabaseUrl || !supabaseKey) {
                    setErrorMsg('Configuration Supabase manquante.');
                    return;
                }

                const tokenRes = await fetch(
                    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            apikey: supabaseKey,
                        },
                        body: JSON.stringify({ refresh_token: refreshToken }),
                        signal: controller.signal,
                    }
                );

                if (!tokenRes.ok) {
                    const err = (await tokenRes
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>;
                    setErrorMsg(
                        (err.error_description as string) ??
                            INVITE_LINK_ERROR_MESSAGE
                    );
                    return;
                }

                const tokenData = (await tokenRes.json()) as {
                    access_token: string;
                    refresh_token: string;
                };

                window.history.replaceState(
                    null,
                    '',
                    window.location.pathname + window.location.search
                );

                const sessionRes = await fetch('/api/auth/set-session', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token,
                        invite_token: inviteToken,
                    }),
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                const sessionData = (await sessionRes.json()) as {
                    success?: boolean;
                    redirect?: string;
                    error?: string;
                };

                if (!sessionRes.ok || !sessionData.success) {
                    setErrorMsg(
                        sessionData.error ?? 'Erreur lors de la validation.'
                    );
                    return;
                }

                router.replace(sessionData.redirect ?? '/dashboard');
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error('InviteCallback unexpected error:', err);
                setErrorMsg('Une erreur inattendue est survenue.');
            }
        }

        void handleInvite();

        return () => {
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once at mount; inviteToken stable for this flow
    }, []);

    if (errorMsg) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="max-w-md space-y-4 text-center">
                    <p className="text-destructive text-base">{errorMsg}</p>
                    <a
                        href="/auth/login"
                        className="text-muted-foreground block text-base underline"
                    >
                        Retour à la connexion
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground text-sm">
                Connexion en cours…
            </p>
        </div>
    );
}

export default function InviteCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-muted-foreground text-sm">
                        Connexion en cours…
                    </p>
                </div>
            }
        >
            <InviteCallbackInner />
        </Suspense>
    );
}
