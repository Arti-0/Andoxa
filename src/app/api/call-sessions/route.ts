import {
    createApiHandler,
    Errors,
    parseBody,
    getPagination,
} from '../../../lib/api';

/**
 * GET /api/call-sessions
 * List call sessions for the workspace
 */
export const GET = createApiHandler(async (req, ctx) => {
    if (!ctx.workspaceId) {
        throw Errors.badRequest('Workspace required');
    }

    const { page, pageSize, offset } = getPagination(req);

    const { data, error, count } = await ctx.supabase
        .from('call_sessions')
        .select('*', { count: 'exact' })
        .eq('organization_id', ctx.workspaceId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) {
        throw Errors.internal('Failed to fetch call sessions');
    }

    // ── Inline per-session stats ─────────────────────────────────────────────
    // Used by /campaigns2's sessions grid so each card shows real
    // processed / meetings / qualifications / pickupRate counters without
    // N+1 fetches. Aggregations on call_session_prospects per session id.
    const sessions = data ?? [];
    const sessionIds = sessions.map((s) => s.id);
    type ProspectRow = { call_session_id: string; outcome: string | null };
    let stats: Map<
        string,
        { total: number; processed: number; meetings: number; qualifications: number; pickup_rate: number | null }
    > = new Map();
    if (sessionIds.length > 0) {
        const { data: rows, error: pErr } = await ctx.supabase
            .from('call_session_prospects')
            .select('call_session_id, outcome')
            .in('call_session_id', sessionIds);
        if (pErr) throw Errors.internal('Failed to compute session stats');

        const agg = new Map<string, ProspectRow[]>();
        for (const r of (rows ?? []) as ProspectRow[]) {
            const list = agg.get(r.call_session_id) ?? [];
            list.push(r);
            agg.set(r.call_session_id, list);
        }
        stats = new Map(
            sessionIds.map((id) => {
                const list = agg.get(id) ?? [];
                const total = list.length;
                const processed = list.filter((r) => r.outcome).length;
                const meetings = list.filter((r) => r.outcome === 'rdv').length;
                const qualifications = list.filter((r) => r.outcome && r.outcome !== 'noanswer').length;
                const pickup_rate =
                    processed === 0
                        ? null
                        : Math.round(
                              ((processed -
                                  list.filter((r) => r.outcome === 'noanswer').length) /
                                  processed) *
                                  100,
                          );
                return [id, { total, processed, meetings, qualifications, pickup_rate }] as const;
            }),
        );
    }

    const enriched = sessions.map((s) => {
        const st = stats.get(s.id);
        return {
            ...s,
            total_count: st?.total ?? 0,
            processed: st?.processed ?? 0,
            meetings: st?.meetings ?? 0,
            qualifications: st?.qualifications ?? 0,
            pickup_rate: st?.pickup_rate ?? null,
        };
    });

    return {
        items: enriched,
        total: count ?? 0,
        page,
        pageSize,
        hasMore: (count ?? 0) > offset + pageSize,
    };
});

/**
 * POST /api/call-sessions
 * Create a new call session with prospect_ids or bdd_ids (listes)
 * Body: { prospect_ids?: string[], bdd_ids?: string[], title?: string }
 *
 * Rules:
 * - Only one active (non-completed) session per list (bdd_id set).
 * - Only prospects with a phone number are included.
 */
export const POST = createApiHandler(async (req, ctx) => {
    if (!ctx.workspaceId || !ctx.userId) {
        throw Errors.badRequest('Workspace required');
    }

    const body = await parseBody<{
        prospect_ids?: string[];
        bdd_ids?: string[];
        title?: string;
        /** Modal: "now" | "later" — when no prospects, creates an empty shell session. */
        schedule_mode?: 'now' | 'later';
        /** ISO8601 scheduled start when `schedule_mode === "later"` */
        scheduled_at?: string | null;
    }>(req);

    const prospectIdsProvided =
        Array.isArray(body.prospect_ids) && body.prospect_ids.length > 0;
    const bddProvided = Array.isArray(body.bdd_ids) && body.bdd_ids.length > 0;

    if (!prospectIdsProvided && !bddProvided) {
        const title =
            body.title?.trim() ||
            `Session ${new Date().toLocaleDateString('fr-FR')}`;
        const mode = body.schedule_mode ?? 'now';
        let scheduled_at: string | null =
            typeof body.scheduled_at === 'string' && body.scheduled_at.trim()
                ? body.scheduled_at.trim()
                : null;

        let status: 'active' | 'scheduled';
        if (mode === 'later') {
            if (!scheduled_at) {
                throw Errors.validation({
                    scheduled_at:
                        'Le créneau est requis pour une session planifiée sans sélection de prospects.',
                });
            }
            status = 'scheduled';
        } else {
            status = 'active';
            scheduled_at = null;
        }

        const { data: session, error: sessionError } =
            await ctx.supabase.from('call_sessions').insert({
                organization_id: ctx.workspaceId,
                created_by: ctx.userId,
                title,
                status,
                scheduled_at,
            }).select().single();

        if (sessionError || !session) {
            console.error(
                'call-sessions insert error (empty session):',
                sessionError,
            );
            throw Errors.internal("Impossible de créer la session d'appels");
        }

        return session;
    }

    let prospectRows: {
        id: string;
        phone: string | null;
        bdd_id: string | null;
    }[] = [];

    if (body.prospect_ids?.length) {
        const { data, error } = await ctx.supabase
            .from('prospects')
            .select('id, phone, bdd_id')
            .eq('organization_id', ctx.workspaceId)
            .in('id', body.prospect_ids)
            .is('deleted_at', null);

        if (error) throw Errors.internal('Failed to resolve prospects');
        prospectRows = data ?? [];
    } else if (body.bdd_ids?.length) {
        const { data, error } = await ctx.supabase
            .from('prospects')
            .select('id, phone, bdd_id')
            .eq('organization_id', ctx.workspaceId)
            .in('bdd_id', body.bdd_ids)
            .is('deleted_at', null);

        if (error)
            throw Errors.internal('Failed to resolve prospects from listes');
        prospectRows = data ?? [];
    }

    // Filter to prospects with a phone number
    const withPhone = prospectRows.filter((p) => p.phone?.trim());

    if (withPhone.length === 0) {
        throw Errors.validation({
            prospect_ids:
                "Aucun prospect avec numéro de téléphone. Une session d'appels n'est possible que pour des prospects ayant un numéro.",
        });
    }

    // Check: only one active session per list (bdd_id set)
    const bddIds = [
        ...new Set(withPhone.map((p) => p.bdd_id).filter(Boolean)),
    ] as string[];

    if (bddIds.length > 0) {
        const { data: activeSessions } = await ctx.supabase
            .from('call_sessions')
            .select('id, status')
            .eq('organization_id', ctx.workspaceId)
            .neq('status', 'completed');

        if (activeSessions && activeSessions.length > 0) {
            const activeIds = activeSessions.map((s) => s.id);
            const { data: linkedProspects } = await ctx.supabase
                .from('call_session_prospects')
                .select('prospect_id')
                .in('call_session_id', activeIds);

            if (linkedProspects && linkedProspects.length > 0) {
                const linkedPids = linkedProspects.map((lp) => lp.prospect_id);
                const { data: linkedWithBdd } = await ctx.supabase
                    .from('prospects')
                    .select('bdd_id')
                    .in('id', linkedPids)
                    .in('bdd_id', bddIds);

                if (linkedWithBdd && linkedWithBdd.length > 0) {
                    throw Errors.badRequest(
                        "Une session d'appels est déjà en cours pour une de ces listes. Terminez-la avant d'en créer une nouvelle."
                    );
                }
            }
        }
    }

    const prospectIds = withPhone.map((p) => p.id);

    const { data: session, error: sessionError } = await ctx.supabase
        .from('call_sessions')
        .insert({
            organization_id: ctx.workspaceId,
            created_by: ctx.userId,
            title:
                body.title ??
                `Session ${new Date().toLocaleDateString('fr-FR')}`,
            status: 'active',
        })
        .select()
        .single();

    if (sessionError || !session) {
        console.error('call-sessions insert error:', sessionError);
        throw Errors.internal("Impossible de créer la session d'appels");
    }

    const rows = prospectIds.map((prospect_id) => ({
        call_session_id: session.id,
        prospect_id,
    }));

    const { error: linkError } = await ctx.supabase
        .from('call_session_prospects')
        .insert(rows);

    if (linkError) {
        console.error('call-sessions link error:', linkError);
        await ctx.supabase.from('call_sessions').delete().eq('id', session.id);
        throw Errors.internal(
            "Impossible d'associer les prospects à la session"
        );
    }

    return session;
});
