import { createApiHandler, Errors } from '../../../../lib/api';
import { createServiceClient } from '@/lib/supabase/service';
/**
 * GET /api/organization/members
 * List organization members with roles
 */
export const GET = createApiHandler(async (_req, ctx) => {
    if (!ctx.workspaceId) {
        throw Errors.badRequest('Workspace required');
    }

    const { data: membersData, error } = await ctx.supabase
        .from('organization_members')
        .select('user_id, role, active, created_at')
        .eq('organization_id', ctx.workspaceId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[API] Organization members fetch error:', error);
        throw Errors.internal('Failed to fetch members');
    }

    const userIds = [
        ...new Set(
            (membersData ?? []).map((m: { user_id: string }) => m.user_id)
        ),
    ];
    if (userIds.length === 0) {
        return { items: [] };
    }

    const service = createServiceClient();
    const { data: profiles } = await service
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

    const profileMap = new Map(
        (profiles ?? []).map(
            (p: {
                id: string;
                full_name: string | null;
                avatar_url?: string | null;
                email?: string | null;
            }) => [
                p.id,
                {
                    // full_name can be an empty string (account created but the
                    // onboarding name step skipped) — `?? 'Inconnu'` wouldn't
                    // catch that, so the campaign author chip rendered blank with
                    // a "?" avatar. Fall back to the email local-part, then a
                    // generic label, so there's always a readable name.
                    name:
                        p.full_name?.trim() ||
                        p.email?.split('@')[0] ||
                        'Membre',
                    avatar_url: p.avatar_url ?? null,
                    email: p.email ?? null,
                },
            ]
        )
    );

    const members = (membersData ?? []).map(
        (m: {
            user_id: string;
            role: string | null;
            active?: boolean | null;
            created_at?: string | null;
        }) => ({
            id: m.user_id,
            user_id: m.user_id,
            name: profileMap.get(m.user_id)?.name ?? 'Inconnu',
            avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
            email: profileMap.get(m.user_id)?.email ?? null,
            role: m.role ?? 'member',
            active: m.active ?? true,
            created_at: m.created_at ?? null,
        })
    );

    return { items: members };
});
