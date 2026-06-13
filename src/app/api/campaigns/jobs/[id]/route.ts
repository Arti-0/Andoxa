import { createApiHandler, Errors, parseBody } from '@/lib/api';
import { NextRequest } from 'next/server';
import type { Database, Json } from '@/lib/types/supabase';

type CampaignJobUpdate =
    Database['public']['Tables']['campaign_jobs']['Update'];

function extractJobId(req: NextRequest) {
    const parts = new URL(req.url).pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
}

/**
 * GET /api/campaigns/jobs/[id]
 * Get a campaign job detail with prospect statuses
 */
export const GET = createApiHandler(async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest('Workspace required');
    const id = extractJobId(req);

    // The job row and its prospect rows are independent — fetch in parallel.
    const [{ data: job, error }, { data: jobProspects }] = await Promise.all([
        ctx.supabase
            .from('campaign_jobs')
            .select('*')
            .eq('id', id)
            .eq('organization_id', ctx.workspaceId)
            .single(),
        ctx.supabase
            .from('campaign_job_prospects')
            .select('id, prospect_id, status, error, processed_at')
            .eq('job_id', id)
            .order('processed_at', { ascending: true, nullsFirst: false }),
    ]);

    if (error || !job) throw Errors.notFound('Campaign job');

    const prospectIds = (jobProspects ?? []).map((p) => p.prospect_id);
    let prospectNames: Record<string, string> = {};
    const prospectAvatars: Record<string, string | null> = {};
    const acceptedAtByProspect: Record<string, string> = {};
    // For invite_then_message the phase-2 message is sent later (on acceptance,
    // or immediately when already connected). Its `linkedin_message_outbound`
    // activity is the only signal that the *message* step is done — surfaced to
    // the detail table as a second status pill alongside the invite step.
    const messageSentAtByProspect: Record<string, string> = {};
    if (prospectIds.length > 0) {
        const [prospectRowsResult, acceptedRowsResult, messagedRowsResult] =
            await Promise.all([
                ctx.supabase
                    .from('prospects')
                    .select('id, full_name, company, enrichment_metadata')
                    .in('id', prospectIds),
                ctx.supabase
                    .from('prospect_activity')
                    .select('prospect_id, created_at')
                    .eq('organization_id', ctx.workspaceId)
                    .eq('campaign_job_id', id)
                    .eq('action', 'linkedin_invite_accepted')
                    .in('prospect_id', prospectIds)
                    .order('created_at', { ascending: false }),
                ctx.supabase
                    .from('prospect_activity')
                    .select('prospect_id, created_at')
                    .eq('organization_id', ctx.workspaceId)
                    .eq('campaign_job_id', id)
                    .eq('action', 'linkedin_message_outbound')
                    .in('prospect_id', prospectIds)
                    .order('created_at', { ascending: false }),
            ]);
        const { data: prospectRows } = prospectRowsResult;
        const { data: acceptedRows } = acceptedRowsResult;
        const { data: messagedRows } = messagedRowsResult;
        for (const row of messagedRows ?? []) {
            if (row.prospect_id && !messageSentAtByProspect[row.prospect_id]) {
                messageSentAtByProspect[row.prospect_id] = row.created_at;
            }
        }
        if (prospectRows) {
            prospectNames = Object.fromEntries(
                prospectRows.map((r) => [
                    r.id,
                    r.full_name ?? r.company ?? r.id.slice(0, 8),
                ])
            );
            for (const r of prospectRows) {
                const em = r.enrichment_metadata as {
                    profile_picture_url?: string | null;
                } | null;
                prospectAvatars[r.id] = em?.profile_picture_url ?? null;
            }
        }
        for (const row of acceptedRows ?? []) {
            if (row.prospect_id && !acceptedAtByProspect[row.prospect_id]) {
                acceptedAtByProspect[row.prospect_id] = row.created_at;
            }
        }
    }

    const enriched = (jobProspects ?? []).map((p) => ({
        ...p,
        prospect_name:
            prospectNames[p.prospect_id] ?? p.prospect_id.slice(0, 8),
        avatar_url: prospectAvatars[p.prospect_id] ?? null,
        accepted_at: acceptedAtByProspect[p.prospect_id] ?? null,
        message_sent_at: messageSentAtByProspect[p.prospect_id] ?? null,
    }));

    return { ...job, prospects: enriched };
});

/**
 * PATCH /api/campaigns/jobs/[id]
 * Update job status (pause/resume/cancel) or metadata.name
 */
export const PATCH = createApiHandler(async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest('Workspace required');
    const id = extractJobId(req);

    const body = await parseBody<{
        status?: string;
        name?: string;
        send_on_weekends?: boolean;
    }>(req);
    const updates: CampaignJobUpdate = {};

    if (typeof body.send_on_weekends === 'boolean') {
        updates.send_on_weekends = body.send_on_weekends;
    }

    if (body.status !== undefined) {
        if (!['paused', 'running', 'failed'].includes(body.status)) {
            throw Errors.validation({
                status: "Must be 'paused', 'running', or 'failed'",
            });
        }
        updates.status = body.status;
        // `started_at` is the campaign's launch time. Only stamp it the first time
        // the job actually starts running — resuming from pause must NOT reset it,
        // otherwise the "Lancée" column would jump to the resume time.
        if (body.status === 'running') {
            const { data: existing } = await ctx.supabase
                .from('campaign_jobs')
                .select('started_at')
                .eq('id', id)
                .eq('organization_id', ctx.workspaceId)
                .single();
            if (!existing?.started_at) {
                updates.started_at = new Date().toISOString();
            }
        }
    }

    if (body.name !== undefined) {
        const { data: existing } = await ctx.supabase
            .from('campaign_jobs')
            .select('metadata')
            .eq('id', id)
            .eq('organization_id', ctx.workspaceId)
            .single();
        const existingMeta =
            (existing?.metadata as Record<string, unknown> | null) ?? {};
        const trimmed = body.name.trim();
        if (trimmed) {
            updates.metadata = { ...existingMeta, name: trimmed } as Json;
        } else {
            const { name: _n, ...rest } = existingMeta;
            updates.metadata =
                Object.keys(rest).length > 0 ? (rest as Json) : null;
        }
    }

    if (Object.keys(updates).length === 0) {
        throw Errors.validation({ body: 'Nothing to update' });
    }

    const { data, error } = await ctx.supabase
        .from('campaign_jobs')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', ctx.workspaceId)
        .select()
        .single();

    if (error || !data) throw Errors.notFound('Campaign job');

    return data;
});

/**
 * DELETE /api/campaigns/jobs/[id]
 * Soft-delete a campaign job. Used by /campaigns2's row action and the bulk
 * delete bar. Owner-only (the existing RLS policies already restrict to org
 * members + `created_by`).
 *
 * Implementation: stamp `deleted_at` (real soft-delete). The list query
 * filters `deleted_at IS NULL`, so the row disappears and `status` keeps its
 * true meaning (a genuinely failed job stays visible as "Échouée").
 */
export const DELETE = createApiHandler(async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest('Workspace required');
    const id = extractJobId(req);

    const { data: existing, error: fetchErr } = await ctx.supabase
        .from('campaign_jobs')
        .select('created_by')
        .eq('id', id)
        .eq('organization_id', ctx.workspaceId)
        .single();
    if (fetchErr || !existing) throw Errors.notFound('Campaign job');
    if (existing.created_by && existing.created_by !== ctx.userId) {
        throw Errors.forbidden('Owner-only');
    }

    const { error } = await ctx.supabase
        .from('campaign_jobs')
        .update({ deleted_at: new Date().toISOString() } as CampaignJobUpdate)
        .eq('id', id)
        .eq('organization_id', ctx.workspaceId);
    if (error) throw Errors.internal('Failed to delete campaign job');

    return { id, deleted: true };
});
