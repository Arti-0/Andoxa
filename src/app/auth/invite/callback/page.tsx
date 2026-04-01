'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createImplicitClient } from '@/lib/supabase/client-implicit';

/** Lien magique Supabase invalide / expiré — message unique (pas de texte fournisseur brut). */
const INVITE_LINK_ERROR_MESSAGE =
    "Lien invalide ou expiré. Demandez un nouvel email d'invitation.";

function isNewAccountFromIdentities(user: User | null): boolean {
    if (!user?.identities?.length) return false;
    return user.identities
        .filter((i) => i.provider === 'email')
        .some(
            (i) =>
                i.created_at != null &&
                i.updated_at != null &&
                i.created_at === i.updated_at
        );
}

function InviteCallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite_token');
    const [errorMsg, setErrorMsg] = useState('');
    const [debugSteps, setDebugSteps] = useState<string[]>([]);
    const handled = useRef(false);

    const addStep = (msg: string) => {
        console.log('[invite-callback]', msg);
        setDebugSteps((prev) => [
            ...prev,
            `${new Date().toISOString().slice(11, 19)} ${msg}`,
        ]);
    };

    const supabase = useMemo(() => createImplicitClient(), []);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        // AbortController uniquement pour le fetch redeem — pas pour setSession (Strict Mode
        // déclenche le cleanup tout de suite et abort() ne doit pas couper setSession).
        const controller = new AbortController();
        let unmounted = false;

        async function handleInvite() {
            try {
                addStep('start — inviteToken: ' + (inviteToken ?? 'none'));

                const hash = window.location.hash.slice(1);
                const hashParams = new URLSearchParams(hash);
                addStep(
                    'hash keys: ' + [...hashParams.keys()].join(', ') ||
                        '(empty)'
                );

                const hashError = hashParams.get('error');
                if (hashError) {
                    addStep(
                        'hash error: ' +
                            hashError +
                            ' / ' +
                            (hashParams.get('error_description') ?? '')
                    );
                    setErrorMsg(
                        hashParams.get('error_description') ??
                            hashError ??
                            INVITE_LINK_ERROR_MESSAGE
                    );
                    return;
                }

                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                addStep(
                    'tokens present: ' +
                        Boolean(accessToken) +
                        ' / ' +
                        Boolean(refreshToken)
                );

                if (accessToken && refreshToken) {
                    const supabaseUrl = (
                        process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
                    ).replace(/\/$/, '');
                    const supabaseKey =
                        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
                    if (!supabaseUrl || !supabaseKey) {
                        addStep(
                            'missing NEXT_PUBLIC_SUPABASE_URL or PUBLISHABLE_KEY'
                        );
                        setErrorMsg('Configuration Supabase manquante.');
                        return;
                    }

                    addStep('raw fetch start');

                    let tokenData: Record<string, unknown> = {};
                    try {
                        const tokenRes = await fetch(
                            `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    apikey: supabaseKey,
                                },
                                body: JSON.stringify({
                                    refresh_token: refreshToken,
                                }),
                            }
                        );
                        addStep(
                            'raw fetch done — status: ' + tokenRes.status
                        );
                        tokenData = (await tokenRes.json()) as Record<
                            string,
                            unknown
                        >;
                        addStep(
                            'raw fetch keys: ' + Object.keys(tokenData).join(', ')
                        );
                    } catch (fetchErr: unknown) {
                        addStep('raw fetch threw: ' + String(fetchErr));
                        setErrorMsg('Erreur réseau vers Supabase.');
                        return;
                    }

                    if (!tokenData.access_token || !tokenData.refresh_token) {
                        addStep('no tokens in response');
                        setErrorMsg('Token invalide ou expiré.');
                        return;
                    }

                    const freshAccess = tokenData.access_token as string;
                    const freshRefresh = tokenData.refresh_token as string;
                    const expiresIn = Number(tokenData.expires_in) || 3600;
                    const nowSec = Math.floor(Date.now() / 1000);
                    let expiresAt: number;
                    if (typeof tokenData.expires_at === 'number') {
                        expiresAt = tokenData.expires_at;
                    } else if (typeof tokenData.expires_at === 'string') {
                        expiresAt = parseInt(tokenData.expires_at, 10);
                    } else {
                        expiresAt = nowSec + expiresIn;
                    }

                    let userObj = tokenData.user as User | undefined;
                    if (!userObj || typeof userObj !== 'object' || !userObj.id) {
                        addStep('fetching user via /auth/v1/user...');
                        try {
                            const userRes = await fetch(
                                `${supabaseUrl}/auth/v1/user`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${freshAccess}`,
                                        apikey: supabaseKey,
                                    },
                                }
                            );
                            const userJson = (await userRes.json()) as {
                                id?: string;
                                user?: User;
                            };
                            userObj =
                                userJson.user ??
                                (userJson.id ? (userJson as User) : undefined);
                            addStep(
                                'user fetch status: ' +
                                    userRes.status +
                                    ' hasUser: ' +
                                    Boolean(userObj?.id)
                            );
                        } catch (uErr: unknown) {
                            addStep('user fetch threw: ' + String(uErr));
                            setErrorMsg('Erreur réseau vers Supabase.');
                            return;
                        }
                    }

                    if (!userObj?.id) {
                        addStep('no user in token response or /user');
                        setErrorMsg('Token invalide ou expiré.');
                        return;
                    }

                    const sessionPayload = {
                        access_token: freshAccess,
                        refresh_token: freshRefresh,
                        expires_in: expiresIn,
                        expires_at: expiresAt,
                        token_type:
                            (tokenData.token_type as string) || 'bearer',
                        user: userObj,
                    };

                    // Contourne setSession (getUser interne peut être annulé par Abort).
                    addStep('storing session manually...');
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const authAny = supabase.auth as any;
                        if (typeof authAny._saveSession === 'function') {
                            await authAny._saveSession(sessionPayload);
                            addStep('_saveSession done');
                        } else if (
                            authAny.storage &&
                            typeof authAny.storage.setItem === 'function' &&
                            typeof authAny.storageKey === 'string'
                        ) {
                            addStep('_saveSession not available — storage.setItem');
                            await authAny.storage.setItem(
                                authAny.storageKey,
                                JSON.stringify(sessionPayload)
                            );
                            addStep('storage.setItem done');
                        } else {
                            addStep('_saveSession not available — cookie fallback');
                            const projectRef = new URL(
                                supabaseUrl.startsWith('http')
                                    ? supabaseUrl
                                    : `https://${supabaseUrl}`
                            ).hostname.split('.')[0];
                            const cookieName = `sb-${projectRef}-auth-token`;
                            const raw = JSON.stringify(sessionPayload);
                            document.cookie = `${cookieName}=${encodeURIComponent(raw)}; path=/; max-age=${String(expiresIn)}; SameSite=Lax`;
                            addStep('cookie written: ' + cookieName);
                        }
                    } catch (saveErr: unknown) {
                        addStep('save threw: ' + String(saveErr));
                        setErrorMsg('Impossible de sauvegarder la session.');
                        return;
                    }

                    window.history.replaceState(
                        null,
                        '',
                        window.location.pathname + window.location.search
                    );
                    addStep('replaceState done');

                    const {
                        data: { session: savedSession },
                    } = await supabase.auth.getSession();
                    addStep(
                        'getSession after save: ' +
                            (savedSession
                                ? 'found uid=' + savedSession.user.id
                                : 'null')
                    );
                    if (!savedSession) {
                        setErrorMsg(
                            'Session non persistée — contactez le support.'
                        );
                        return;
                    }
                } else {
                    const {
                        data: { session },
                    } = await supabase.auth.getSession();
                    addStep('getSession: ' + (session ? 'found' : 'null'));
                    if (!session) {
                        setErrorMsg(INVITE_LINK_ERROR_MESSAGE);
                        return;
                    }
                }

                if (unmounted) {
                    addStep('unmounted after session save — stopping');
                    return;
                }

                if (inviteToken) {
                    addStep('fetching redeem...');
                    const res = await fetch('/api/invitations/redeem', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ invite_token: inviteToken }),
                        signal: controller.signal,
                    });
                    if (controller.signal.aborted) {
                        addStep('aborted after fetch');
                        return;
                    }

                    const data: Record<string, unknown> = await res
                        .json()
                        .catch(() => ({}) as Record<string, unknown>);
                    addStep(
                        'redeem status: ' +
                            res.status +
                            ' data: ' +
                            JSON.stringify(data)
                    );

                    if (controller.signal.aborted) {
                        addStep('aborted after json');
                        return;
                    }

                    const redeemSucceeded =
                        res.ok &&
                        typeof data === 'object' &&
                        data !== null &&
                        data.success === true;
                    if (!redeemSucceeded) {
                        const err = data.error;
                        setErrorMsg(
                            typeof err === 'string'
                                ? err
                                : err &&
                                    typeof err === 'object' &&
                                    'message' in err &&
                                    typeof (err as { message: unknown })
                                        .message === 'string'
                                  ? (err as { message: string }).message
                                  : 'Erreur lors de la validation.'
                        );
                        return;
                    }
                }

                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();
                addStep(
                    'getUser: ' +
                        (user?.id ?? 'null') +
                        ' error: ' +
                        (userError?.message ?? 'none')
                );
                if (!user) {
                    setErrorMsg('Utilisateur introuvable après connexion.');
                    return;
                }

                const isNew = isNewAccountFromIdentities(user);
                addStep('isNew: ' + isNew + ' → redirecting');
                router.replace(
                    isNew
                        ? '/auth/update-password?next=/dashboard'
                        : '/dashboard'
                );
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') {
                    addStep('AbortError — ignoring');
                    return;
                }
                addStep('unexpected error: ' + String(err));
                console.error('InviteCallback unexpected error:', err);
                setErrorMsg('Une erreur inattendue est survenue.');
            }
        }

        void handleInvite();

        return () => {
            unmounted = true;
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once at mount; inviteToken/router stable for this flow
    }, []);

    const debugPanel = (
        <div className="text-center space-y-1">
            {debugSteps.map((s, i) => (
                <p
                    key={i}
                    className="text-muted-foreground text-left font-mono text-xs"
                >
                    {s}
                </p>
            ))}
        </div>
    );

    if (errorMsg) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="max-w-md space-y-4 text-center">
                    <p className="text-destructive text-base">{errorMsg}</p>
                    {debugPanel}
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
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">
                    Connexion en cours…
                </p>
                {debugPanel}
            </div>
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
