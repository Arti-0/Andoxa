import { createApiHandler, Errors } from '@/lib/api';
import { assertMessagerieAndTemplatesPlan } from '@/lib/billing/plan-gates';

/** How far back to surface accepted-but-chatless prospects in messagerie. */
const ACCEPTED_PENDING_WINDOW_DAYS = 30;

/**
 * GET /api/unipile/chats/andoxa-ids
 * Returns unipile_chat_ids that were started via Andoxa (linked in unipile_chat_prospects),
 * a map chatId -> prospectId for navigation to prospect profile, and
 * `pendingProspects`: prospects whose LinkedIn invitation was accepted but who
 * have no chat yet — messagerie surfaces them ready for a first message.
 */
export const GET = createApiHandler(async (req, ctx) => {
    if (!ctx.workspaceId) {
        throw Errors.badRequest('Workspace required');
    }

    assertMessagerieAndTemplatesPlan(ctx);

    const { data, error } = await ctx.supabase
        .from('unipile_chat_prospects')
        .select('unipile_chat_id, prospect_id')
        .eq('organization_id', ctx.workspaceId);

    if (error) {
        throw Errors.internal('Impossible de récupérer les chats Andoxa');
    }

    const rows = data ?? [];
    const ids = [...new Set(rows.map((r) => r.unipile_chat_id))];
    const chatToProspect: Record<string, string> = {};
    for (const r of rows) {
        if (r.unipile_chat_id && r.prospect_id) {
            chatToProspect[r.unipile_chat_id] = r.prospect_id;
        }
    }

    // Accepted invitations with no chat: written by recordLinkedInInviteAccepted
    // with the provider/account ids stamped in details — exactly what the first
    // send needs to open the chat.
    const sinceIso = new Date(
        Date.now() - ACCEPTED_PENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: accepted } = await ctx.supabase
        .from('prospect_activity')
        .select('prospect_id, created_at, details')
        .eq('organization_id', ctx.workspaceId)
        .eq('actor_id', ctx.userId)
        .eq('action', 'linkedin_invite_accepted')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(200);

    const linkedProspects = new Set(rows.map((r) => r.prospect_id));
    const seen = new Set<string>();
    const pendingProspects: Array<{
        prospect_id: string;
        provider_id: string;
        account_id: string;
        accepted_at: string;
    }> = [];
    for (const a of accepted ?? []) {
        if (
            !a.prospect_id ||
            linkedProspects.has(a.prospect_id) ||
            seen.has(a.prospect_id)
        ) {
            continue;
        }
        const d = (a.details ?? null) as {
            provider_id?: string;
            account_id?: string;
        } | null;
        if (!d?.provider_id || !d?.account_id) continue;
        seen.add(a.prospect_id);
        pendingProspects.push({
            prospect_id: a.prospect_id,
            provider_id: d.provider_id,
            account_id: d.account_id,
            accepted_at: a.created_at,
        });
    }

    return { ids, chatToProspect, pendingProspects };
});
