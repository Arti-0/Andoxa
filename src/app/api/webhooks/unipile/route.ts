import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/lib/types/supabase';
import { unipileFetch } from '@/lib/unipile/client';
import type { UnipileAccount } from '@/lib/unipile/types';
import { syncAllLinkedInRelations } from '@/lib/linkedin/sync-relations-full';
import { processConnectionAccepted } from '@/lib/workflows/process-connection-accepted';
import { createNotification } from '@/lib/notifications/create-notification';
import { insertWebhookDedupe } from '@/lib/webhooks/dedupe';
import { insertProspectActivity } from '@/lib/prospect-activity';
import { emitWorkflowTrigger } from '@/lib/workflows/fire-trigger';

const UNIPILE_MESSAGING_HANDLED_EVENTS = new Set([
    'message_received',
    'new_relation',
]);

/**
 * Builds an idempotency key for a Unipile webhook event. Inserted into
 * `webhook_events(provider='unipile', event_id=<key>)`; duplicates are dropped.
 * Returns null when the event has no stable identity (in which case we just
 * accept the dupe risk — better than dropping it).
 */
function computeUnipileDedupeKey(body: UnipileWebhookPayload): string | null {
    if (body.event === 'message_received') {
        const chatId = body.chat_id ?? '';
        const messageId = body.message_id ?? '';
        if (!chatId || !messageId) return null;
        return `message_received:${chatId}:${messageId}`;
    }
    if (body.event === 'new_relation') {
        const attendee = body.user_provider_id ?? body.attendee_id ?? '';
        const account = body.account_id ?? '';
        const ts = body.timestamp ?? '';
        if (!attendee || !account) return null;
        return `new_relation:${account}:${attendee}:${ts}`;
    }
    return null;
}

/** Unipile event/status → statut normalisé stocké en base */
const UNIPILE_STATUS_MAP: Record<string, string> = {
    CREATION_SUCCESS: 'connected',
    RECONNECTED: 'connected',
    ACCOUNT_STATUS_OK: 'connected',
    ACCOUNT_CONNECTING: 'connecting',
    ACCOUNT_STOPPED: 'stopped',
    ACCOUNT_DELETION: 'disconnected',
    ACCOUNT_ERROR: 'error',
    ACCOUNT_CREDENTIALS: 'error',
    ACCOUNT_PERMISSIONS: 'error',
    CREATION_ERROR: 'error',
};

/** Messages lisibles pour les erreurs critiques */
const UNIPILE_ERROR_LABELS: Record<string, string> = {
    ACCOUNT_ERROR: 'Erreur de compte LinkedIn — reconnexion requise.',
    ACCOUNT_CREDENTIALS:
        'Identifiants LinkedIn invalides — reconnexion requise.',
    ACCOUNT_PERMISSIONS:
        'Permissions LinkedIn insuffisantes — reconnexion requise.',
    CREATION_ERROR: 'Échec de la connexion LinkedIn.',
    ACCOUNT_STOPPED: 'Compte LinkedIn suspendu ou arrêté.',
};

/** Statuts renvoyés sur notify_url (Hosted Auth) — utilisé pour reconnaître le callback même sans `name`. */
const HOSTED_AUTH_NOTIFY_STATUSES = new Set([
    'CREATION_SUCCESS',
    'RECONNECTED',
    'CREATION_ERROR',
]);

/**
 * Unipile webhook payloads:
 * - Hosted Auth notify_url: { status, account_id, name? } — name = our user_id (ou récupéré via GET /accounts)
 * - Dashboard AccountStatus: { AccountStatus: { account_id, message, account_type } } — no name
 */
function extractPremiumData(account: UnipileAccount): {
    isPremium: boolean;
    premiumFeatures: string[];
} {
    const im = account.connection_params?.im;
    const isPremium = !!im?.premiumId;
    const premiumFeatures = im?.premiumFeatures ?? [];
    return { isPremium, premiumFeatures };
}

function truncateInboundPreview(text: string | undefined, maxLen: number): string {
    const raw = typeof text === 'string' ? text.trim() : '';
    if (!raw) return 'Nouveau message';
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen - 1)}…`;
}

interface UnipileWebhookPayload {
    account_id?: string;
    /** Ancien nom possible ; le payload réel `new_relation` utilise `user_provider_id`. */
    attendee_id?: string;
    user_provider_id?: string;
    account_type?: string;
    event?: string;
    chat_id?: string;
    message_id?: string;
    message?: string;
    timestamp?: string;
    status?: string;
    name?: string;
    AccountStatus?: {
        account_id?: string;
        message?: string;
        account_type?: string;
    };
    account_info?: { user_id?: string; id?: string };
    sender?: { attendee_provider_id?: string };
}

async function fetchUnipileAccount(
    accountId: string
): Promise<UnipileAccount | null> {
    try {
        return await unipileFetch<UnipileAccount>(
            `/accounts/${encodeURIComponent(accountId)}`
        );
    } catch {
        return null;
    }
}

/**
 * @returns false si un autre utilisateur possède déjà ce compte Unipile (pas d’écriture).
 */
async function storeUnipileAccount(
    rawName: string,
    accountId: string,
    eventCode?: string,
    premiumData?: { isPremium: boolean; premiumFeatures: string[] }
): Promise<boolean> {
    const isWhatsApp = rawName.endsWith('__whatsapp');
    const userId = isWhatsApp ? rawName.replace(/__whatsapp$/, '') : rawName;
    const accountType = isWhatsApp ? 'WHATSAPP' : 'LINKEDIN';

    const status = eventCode
        ? (UNIPILE_STATUS_MAP[eventCode] ?? 'unknown')
        : 'connected';
    const isError = status === 'error' || status === 'stopped';

    const supabase = createServiceClient();

    const { data: otherOwner } = await supabase
        .from('user_unipile_accounts')
        .select('user_id')
        .eq('unipile_account_id', accountId)
        .maybeSingle();

    if (otherOwner?.user_id && otherOwner.user_id !== userId) {
        console.warn(
            `[Unipile webhook] unipile_account_id ${accountId} already linked to user ${otherOwner.user_id}; skip store for user ${userId}`
        );
        return false;
    }

    const { data: existingRow } = await supabase
        .from('user_unipile_accounts')
        .select('unipile_account_id')
        .eq('user_id', userId)
        .eq('account_type', accountType)
        .maybeSingle();

    if (
        existingRow?.unipile_account_id &&
        existingRow.unipile_account_id !== accountId
    ) {
        console.info(
            `[Unipile] Replacing old account_id ${existingRow.unipile_account_id} with new ${accountId} for user ${userId}`
        );
    }

    const { error } = await supabase.from('user_unipile_accounts').upsert(
        [
            {
                user_id: userId,
                unipile_account_id: accountId,
                account_type: accountType,
                status,
                error_code: isError ? (eventCode ?? null) : null,
                error_message: isError
                    ? (UNIPILE_ERROR_LABELS[eventCode ?? ''] ?? null)
                    : null,
                last_status_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...(premiumData != null && {
                    is_premium: premiumData.isPremium,
                    premium_features: premiumData.premiumFeatures,
                }),
            },
        ],
        { onConflict: 'user_id,account_type' }
    );

    if (error) {
        console.error('[Unipile webhook] upsert user_unipile_accounts:', error);
        throw new Error('Failed to store account');
    }
    return true;
}

/**
 * Sync les 50 connexions LinkedIn les plus récentes vers linkedin_relations.
 * Appelé uniquement à CREATION_SUCCESS / RECONNECTED pour ne pas surcharger l’API.
 * Non bloquant côté appelant — les erreurs sont loguées sans throw.
 */
async function syncLinkedInRelations(
    supabase: SupabaseClient<Database>,
    userId: string,
    unipileAccountId: string
): Promise<void> {
    try {
        const data = await unipileFetch<{
            object?: string;
            items?: Array<{
                provider_id?: string;
                id?: string;
            }>;
        }>(
            `/users/relations?account_id=${encodeURIComponent(unipileAccountId)}&limit=50`
        );

        const items = data?.items ?? [];
        if (!items.length) return;

        const rows = items
            .map((r) => ({
                user_id: userId,
                attendee_id: r.provider_id ?? r.id ?? null,
                connected_at: new Date().toISOString(),
            }))
            .filter(
                (
                    r
                ): r is {
                    user_id: string;
                    attendee_id: string;
                    connected_at: string;
                } => r.attendee_id != null
            );

        if (!rows.length) return;

        const { error } = await supabase
            .from('linkedin_relations')
            .upsert(rows, {
                onConflict: 'user_id,attendee_id',
                ignoreDuplicates: true,
            });

        if (error) {
            console.error(
                '[Unipile webhook] syncLinkedInRelations upsert:',
                error
            );
        } else {
            console.info(
                `[Unipile webhook] syncLinkedInRelations: ${rows.length} relations stored for user ${userId}`
            );
        }
    } catch (err) {
        console.warn(
            '[Unipile webhook] syncLinkedInRelations failed (non-blocking):',
            err
        );
    }
}

/**
 * POST /api/webhooks/unipile
 * Receives Unipile webhook events (new messages, etc.)
 *
 * Configuration: Document the URL in Unipile dashboard:
 *   https://{your-domain}/api/webhooks/unipile
 *
 * Optional auth: if your Unipile project can send a custom header on webhooks, set
 * UNIPILE_WEBHOOK_SECRET and configure the same value as header "Unipile-Auth" (or
 * X-Unipile-Auth) in Unipile. If Unipile does not send this header, leave
 * UNIPILE_WEBHOOK_SECRET unset — otherwise non-Hosted-Auth payloads will return 401.
 *
 * On "message_received": updates `unipile_chat_prospects.last_inbound_at`, writes
 * `inbox_events` for realtime badge refresh, and emits an org-scoped in-app
 * notification (deep-link to `/messagerie?chat=…`) when the chat is linked to CRM.
 */
export async function POST(req: NextRequest) {
    let body: UnipileWebhookPayload;
    try {
        body = (await req.json()) as UnipileWebhookPayload;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Événements Hosted Auth (notify_url) : { status, account_id, name? }
    const isHostedAuthCallback =
        typeof body.status === 'string' &&
        typeof body.account_id === 'string' &&
        HOSTED_AUTH_NOTIFY_STATUSES.has(body.status);

    // Événements AccountStatus dashboard : { AccountStatus: { account_id, message } }
    const ACCOUNT_STATUS_EVENTS = new Set([
        'CREATION_SUCCESS',
        'RECONNECTED',
        'ACCOUNT_STATUS_OK',
        'ACCOUNT_CONNECTING',
        'ACCOUNT_STOPPED',
        'ACCOUNT_DELETION',
        'ACCOUNT_ERROR',
        'ACCOUNT_CREDENTIALS',
        'ACCOUNT_PERMISSIONS',
    ]);
    const accountStatus = body.AccountStatus;
    const isAccountStatusCallback =
        typeof accountStatus?.account_id === 'string' &&
        typeof accountStatus?.message === 'string' &&
        ACCOUNT_STATUS_EVENTS.has(accountStatus.message);

    // Shared secret for messaging events (Hosted Auth + AccountStatus callbacks are
    // identified by payload shape and skip this check — Unipile cannot attach a
    // header on those). For everything else (message_received, new_relation,
    // unknown events) the secret is REQUIRED in production: missing env = 500,
    // bad header = 401. This prevents spoofed inbound events from corrupting
    // workflows or sending fake notifications.
    if (!isHostedAuthCallback && !isAccountStatusCallback) {
        const secret = process.env.UNIPILE_WEBHOOK_SECRET?.trim();
        if (!secret) {
            Sentry.captureMessage(
                '[Unipile webhook] UNIPILE_WEBHOOK_SECRET not configured',
                { level: 'error' }
            );
            return NextResponse.json(
                { error: 'Server misconfigured' },
                { status: 500 }
            );
        }
        const authHeader =
            req.headers.get('Unipile-Auth') ??
            req.headers.get('X-Unipile-Auth');
        if (
            !authHeader ||
            !crypto.timingSafeEqual(
                crypto.createHash('sha256').update(authHeader).digest(),
                crypto.createHash('sha256').update(secret).digest()
            )
        ) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    // Idempotency: Unipile retries non-2xx and occasionally redelivers. Dedupe
    // by message_id (message_received) or by attendee/account/timestamp triple
    // (new_relation has no event id). On duplicate, early-ack.
    const dedupeKey = computeUnipileDedupeKey(body);
    if (dedupeKey) {
        const dedupeResult = await insertWebhookDedupe(
            createServiceClient(),
            'unipile',
            dedupeKey
        );
        if (dedupeResult === 'duplicate') {
            return NextResponse.json({ received: true, duplicate: true });
        }
        // On "error", fall through — better to risk a duplicate than drop the event.
    }

    if (isHostedAuthCallback) {
        const eventCode = body.status!;
        const accountId = body.account_id!;
        const isSuccess =
            eventCode === 'CREATION_SUCCESS' || eventCode === 'RECONNECTED';

        let rawName = typeof body.name === 'string' ? body.name.trim() : '';
        let account: UnipileAccount | null = null;

        const needAccountFetch =
            !rawName || (isSuccess && !rawName.endsWith('__whatsapp'));

        if (needAccountFetch) {
            account = await fetchUnipileAccount(accountId);
            if (!rawName && account?.name?.trim()) {
                rawName = account.name.trim();
            }
        }

        if (!rawName) {
            Sentry.captureMessage(
                '[Unipile webhook] Hosted auth: cannot resolve user (missing name)',
                {
                    level: 'warning',
                    extra: { account_id: accountId, status: eventCode },
                }
            );
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const isLinkedIn = !rawName.endsWith('__whatsapp');

        let premiumData:
            | { isPremium: boolean; premiumFeatures: string[] }
            | undefined;

        if (isLinkedIn && isSuccess) {
            if (!account) {
                account = await fetchUnipileAccount(accountId);
            }
            if (account) {
                premiumData = extractPremiumData(account);
            } else {
                console.warn(
                    '[Unipile webhook] Hosted Auth premium fetch failed'
                );
            }
        }

        let stored = true;
        try {
            stored = await storeUnipileAccount(
                rawName,
                accountId,
                eventCode,
                premiumData
            );
        } catch (err) {
            console.error('[Unipile webhook] Hosted Auth store:', err);
            Sentry.captureException(err);
            return NextResponse.json(
                { error: 'Internal error' },
                { status: 500 }
            );
        }

        if (stored && isLinkedIn && isSuccess) {
            const syncUserId = rawName.endsWith('__whatsapp')
                ? rawName.replace(/__whatsapp$/, '')
                : rawName;
            const svc = createServiceClient();
            void syncLinkedInRelations(svc, syncUserId, accountId);
            void syncAllLinkedInRelations(syncUserId, accountId, svc)
                .then((result) =>
                    console.log('[LinkedIn] Full sync complete:', result)
                )
                .catch((err) =>
                    console.error('[LinkedIn] Full sync error:', err)
                );
        }

        if (eventCode === 'CREATION_ERROR') {
            Sentry.captureMessage(`Unipile CREATION_ERROR for ${rawName}`, {
                level: 'warning',
                extra: { name: rawName, account_id: accountId },
            });
        }

        return NextResponse.json({ received: true }, { status: 200 });
    }

    if (isAccountStatusCallback) {
        const accountId = accountStatus!.account_id!;
        const eventCode = accountStatus!.message!;
        const isSuccess =
            eventCode === 'CREATION_SUCCESS' || eventCode === 'RECONNECTED';
        try {
            const account = await unipileFetch<UnipileAccount>(
                `/accounts/${accountId}`
            );
            const userId = account?.name;
            if (userId) {
                const isLinkedIn = !userId.endsWith('__whatsapp');
                const premiumData =
                    isLinkedIn && isSuccess
                        ? extractPremiumData(account)
                        : undefined;
                const stored = await storeUnipileAccount(
                    userId,
                    accountId,
                    eventCode,
                    premiumData
                );
                if (stored && isLinkedIn && isSuccess) {
                    const svc = createServiceClient();
                    void syncLinkedInRelations(svc, userId, accountId);
                    void syncAllLinkedInRelations(userId, accountId, svc)
                        .then((result) =>
                            console.log(
                                '[LinkedIn] Full sync complete:',
                                result
                            )
                        )
                        .catch((err) =>
                            console.error('[LinkedIn] Full sync error:', err)
                        );
                }
            }
        } catch (err) {
            console.error('[Unipile webhook] AccountStatus fetch/store:', err);
            Sentry.captureException(err);
        }

        const criticalEvents = new Set([
            'ACCOUNT_ERROR',
            'ACCOUNT_CREDENTIALS',
            'ACCOUNT_PERMISSIONS',
            'ACCOUNT_STOPPED',
        ]);
        if (criticalEvents.has(eventCode)) {
            Sentry.captureMessage(
                `Unipile account issue: ${eventCode} on ${accountId}`,
                {
                    level: 'warning',
                    extra: { accountId, eventCode },
                }
            );
        }

        return NextResponse.json({ received: true }, { status: 200 });
    }

    const event = body.event;
    const chatId = body.chat_id;

    if (event === 'message_received' && chatId) {
        const accountInfo = body.account_info as
            | { user_id?: string; id?: string }
            | undefined;
        const sender = body.sender as
            | { attendee_provider_id?: string }
            | undefined;

        const unipileAccountId = body.account_id ?? accountInfo?.id ?? null;

        const isOutbound =
            accountInfo?.user_id &&
            sender?.attendee_provider_id &&
            accountInfo.user_id === sender.attendee_provider_id;

        if (!isOutbound) {
            const supabase = createServiceClient();

            const { data: chatLinkRow } = await supabase
                .from('unipile_chat_prospects')
                .select('organization_id, prospect_id')
                .eq('unipile_chat_id', chatId)
                .maybeSingle();

            const { error: inboundErr } = await supabase
                .from('unipile_chat_prospects')
                .update({ last_inbound_at: new Date().toISOString() })
                .eq('unipile_chat_id', chatId);

            if (inboundErr) {
                console.error(
                    '[Unipile webhook] inbound last_inbound_at:',
                    inboundErr
                );
                Sentry.captureException(inboundErr);
            }

            let accountRow:
                | { user_id: string; account_type: string | null }
                | undefined;

            if (unipileAccountId) {
                const { data } = await supabase
                    .from('user_unipile_accounts')
                    .select('user_id, account_type')
                    .eq('unipile_account_id', unipileAccountId)
                    .maybeSingle();
                accountRow = data ?? undefined;

                if (accountRow?.user_id) {
                    const messageId = body.message_id ?? null;
                    const occurredAt = body.timestamp
                        ? new Date(body.timestamp).toISOString()
                        : new Date().toISOString();

                    const row = {
                        user_id: accountRow.user_id,
                        chat_id: chatId,
                        account_type: accountRow.account_type ?? 'LINKEDIN',
                        message_id: messageId,
                        occurred_at: occurredAt,
                    };

                    if (messageId) {
                        const { error: eventErr } = await supabase
                            .from('inbox_events')
                            .upsert([row], {
                                onConflict: 'user_id,message_id',
                                ignoreDuplicates: true,
                            });
                        if (eventErr) {
                            console.error(
                                '[Unipile webhook] inbox_events upsert:',
                                eventErr
                            );
                            Sentry.captureException(eventErr);
                        }
                    } else {
                        const { error: eventErr } = await supabase
                            .from('inbox_events')
                            .insert([row]);
                        if (eventErr) {
                            console.error(
                                '[Unipile webhook] inbox_events insert:',
                                eventErr
                            );
                            Sentry.captureException(eventErr);
                        }
                    }
                }
            }

            if (chatLinkRow?.organization_id) {
                let prospectLabel = 'Un contact';
                if (chatLinkRow.prospect_id) {
                    const { data: prospect } = await supabase
                        .from('prospects')
                        .select('full_name')
                        .eq('id', chatLinkRow.prospect_id)
                        .maybeSingle();
                    if (prospect?.full_name?.trim()) {
                        prospectLabel = prospect.full_name.trim();
                    }
                }

                const chLabel =
                    (accountRow?.account_type ?? 'LINKEDIN').toUpperCase() ===
                    'WHATSAPP'
                        ? 'WhatsApp'
                        : 'LinkedIn';

                const dedupeInbound =
                    typeof body.message_id === 'string' &&
                    body.message_id.trim().length > 0
                        ? `unipile:inbound:${chatId}:${body.message_id.trim()}`
                        : undefined;

                await createNotification(supabase, {
                    title: `Nouveau message · ${chLabel}`,
                    message: `${prospectLabel} : ${truncateInboundPreview(body.message, 160)}`,
                    category: 'prospect',
                    action_type: 'other',
                    actor_id: null,
                    organization_id: chatLinkRow.organization_id,
                    target_url: `/messagerie?chat=${encodeURIComponent(chatId)}`,
                    metadata: {
                        chat_id: chatId,
                        message_id: body.message_id ?? null,
                        source: 'unipile_webhook_message_received',
                    },
                    dedupe_key: dedupeInbound,
                });

                // Emit linkedin_message_inbound / whatsapp_message_inbound so
                // /api/campaigns/jobs/stats (and the Performance column)
                // counts replies. `campaign_job_id` is copied from the most
                // recent outbound on the same prospect when present.
                if (chatLinkRow.prospect_id) {
                    try {
                        const isWhatsApp =
                            (accountRow?.account_type ?? 'LINKEDIN').toUpperCase() ===
                            'WHATSAPP';
                        const action = isWhatsApp
                            ? ('whatsapp_message_inbound' as const)
                            : ('linkedin_message_inbound' as const);
                        const outboundActions = isWhatsApp
                            ? ['whatsapp_message_outbound']
                            : [
                                  'linkedin_message_outbound',
                                  'linkedin_invite_sent',
                              ];

                        const { data: lastOutbound } = await supabase
                            .from('prospect_activity')
                            .select('campaign_job_id')
                            .eq('prospect_id', chatLinkRow.prospect_id)
                            .in('action', outboundActions)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        await insertProspectActivity(supabase, {
                            organization_id: chatLinkRow.organization_id,
                            prospect_id: chatLinkRow.prospect_id,
                            actor_id: null,
                            campaign_job_id: lastOutbound?.campaign_job_id ?? null,
                            action,
                            details: {
                                message: truncateInboundPreview(body.message, 500),
                                chat_id: chatId,
                                message_id: body.message_id ?? null,
                                campaign_job_id: lastOutbound?.campaign_job_id ?? null,
                            },
                        });

                        // Fire workflow triggers for the inbound reply. Three
                        // possibilities, in order:
                        //   1. on_linkedin_reply OR on_whatsapp_reply — always
                        //      fires for any inbound from a known prospect.
                        //   2. on_campaign_reply — additionally fires when the
                        //      reply is linked to a campaign_job (resolved
                        //      from the most recent outbound on this prospect).
                        // All three are deduped by message_id inside the
                        // emitter (uq_workflow_runs_dedupe partial index).
                        const messageId = body.message_id ?? null;
                        if (messageId) {
                            const occurredAt = new Date().toISOString();
                            try {
                                await emitWorkflowTrigger(supabase, {
                                    organizationId: chatLinkRow.organization_id,
                                    prospectId: chatLinkRow.prospect_id,
                                    startedByUserId: null,
                                    payload: isWhatsApp
                                        ? {
                                              kind: 'on_whatsapp_reply',
                                              messageId,
                                              occurredAt,
                                          }
                                        : {
                                              kind: 'on_linkedin_reply',
                                              messageId,
                                              occurredAt,
                                          },
                                });
                            } catch (err) {
                                // Sentry captured inside emitWorkflowTrigger.
                                console.error(
                                    '[Unipile webhook] reply trigger emit:',
                                    err
                                );
                            }

                            if (lastOutbound?.campaign_job_id) {
                                try {
                                    await emitWorkflowTrigger(supabase, {
                                        organizationId:
                                            chatLinkRow.organization_id,
                                        prospectId: chatLinkRow.prospect_id,
                                        startedByUserId: null,
                                        payload: {
                                            kind: 'on_campaign_reply',
                                            messageId,
                                            campaignJobId:
                                                lastOutbound.campaign_job_id,
                                            channel: isWhatsApp
                                                ? 'whatsapp'
                                                : 'linkedin',
                                        },
                                    });
                                } catch (err) {
                                    console.error(
                                        '[Unipile webhook] campaign reply trigger emit:',
                                        err
                                    );
                                }
                            }
                        }
                    } catch (err) {
                        console.error(
                            '[Unipile webhook] inbound message activity:',
                            err
                        );
                        Sentry.captureException(err);
                    }
                }
            }
        }
    }

    if (event === 'new_relation') {
        const attendeeId = body.user_provider_id ?? body.attendee_id ?? null;
        const unipileAccountId = body.account_id ?? null;

        if (!attendeeId || !unipileAccountId) {
            console.warn(
                '[Unipile webhook] new_relation missing user_provider_id (or attendee_id) or account_id'
            );
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const supabase = createServiceClient();

        const { data: accountRow } = await supabase
            .from('user_unipile_accounts')
            .select('user_id')
            .eq('unipile_account_id', unipileAccountId)
            .maybeSingle();

        const userId = accountRow?.user_id;
        if (!userId) {
            console.warn('[Unipile webhook] new_relation: account not found', {
                unipileAccountId,
            });
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const connectedAt = new Date().toISOString();
        const { error: relErr } = await supabase
            .from('linkedin_relations')
            .upsert(
                [
                    {
                        user_id: userId,
                        attendee_id: attendeeId,
                        connected_at: connectedAt,
                    },
                ],
                { onConflict: 'user_id,attendee_id' }
            );
        if (relErr) {
            console.error(
                '[Unipile webhook] linkedin_relations upsert:',
                relErr
            );
            Sentry.captureException(relErr);
        }

        const { data: waitingExecutions, error: waitErr } = await supabase
            .from('workflow_step_executions')
            .select(
                'id, run_id, step_index, step_id, step_type, config_snapshot'
            )
            .eq('status', 'pending')
            .eq('step_type', 'linkedin_invite')
            .filter('config_snapshot->>pending_provider_id', 'eq', attendeeId)
            .filter(
                'config_snapshot->>pending_account_id',
                'eq',
                unipileAccountId
            );

        if (waitErr) {
            console.error(
                '[Unipile webhook] new_relation workflow_step_executions:',
                waitErr
            );
            Sentry.captureException(waitErr);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        if (waitingExecutions?.length) {
            for (const exec of waitingExecutions) {
                try {
                    await processConnectionAccepted(supabase, exec.id, userId);
                } catch (err) {
                    console.error(
                        '[Unipile webhook] new_relation processConnectionAccepted:',
                        err
                    );
                    Sentry.captureException(err);
                }
            }
        }

        // Emit `linkedin_invite_accepted` activity for every campaign invite
        // matching this attendee. process-job-batch.ts stamps `provider_id` and
        // `account_id` into the invite's details so we can pair the acceptance
        // back to the exact campaign job — which feeds `campaign_job_stats`
        // and the /campaigns "Performance" column.
        try {
            const { data: matchingInvites } = await supabase
                .from('prospect_activity')
                .select(
                    'id, prospect_id, organization_id, actor_id, campaign_job_id, details'
                )
                .eq('action', 'linkedin_invite_sent')
                .filter('details->>provider_id', 'eq', attendeeId)
                .filter('details->>account_id', 'eq', unipileAccountId)
                .order('created_at', { ascending: false })
                .limit(5);

            for (const inv of matchingInvites ?? []) {
                if (!inv.prospect_id) continue;
                // Skip if we've already logged the acceptance for this prospect+job.
                let dedupeQ = supabase
                    .from('prospect_activity')
                    .select('id')
                    .eq('action', 'linkedin_invite_accepted')
                    .eq('prospect_id', inv.prospect_id);
                dedupeQ = inv.campaign_job_id
                    ? dedupeQ.eq('campaign_job_id', inv.campaign_job_id)
                    : dedupeQ.is('campaign_job_id', null);
                const { data: existing } = await dedupeQ.limit(1).maybeSingle();
                if (existing) continue;

                await insertProspectActivity(supabase, {
                    organization_id: inv.organization_id,
                    prospect_id: inv.prospect_id,
                    actor_id: inv.actor_id ?? userId,
                    campaign_job_id: inv.campaign_job_id ?? null,
                    action: 'linkedin_invite_accepted',
                    details: {
                        campaign_job_id: inv.campaign_job_id ?? null,
                        provider_id: attendeeId,
                    },
                });
            }
        } catch (err) {
            console.error(
                '[Unipile webhook] new_relation invite-accepted activity:',
                err
            );
            Sentry.captureException(err);
        }

        return NextResponse.json({ received: true }, { status: 200 });
    }

    if (
        typeof event === 'string' &&
        event.length > 0 &&
        !UNIPILE_MESSAGING_HANDLED_EVENTS.has(event) &&
        !isHostedAuthCallback &&
        !isAccountStatusCallback
    ) {
        console.info('[Unipile webhook] Unknown event type (no-op)', { event });
        Sentry.captureMessage(`Unipile webhook unknown event: ${event}`, {
            level: 'info',
            extra: { event },
        });
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
