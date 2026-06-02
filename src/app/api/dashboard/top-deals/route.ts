import { createApiHandler, Errors, type ApiContext } from "@/lib/api";
import { isMockStatsEnabled, mockDashboardTopDeals } from "@/lib/mock-stats";
import { getProspectStatuses } from "@/lib/prospects/statuses";

/**
 * GET /api/dashboard/top-deals?limit=5
 *
 * Returns the hottest deals currently in the pipeline. Scoring:
 *   • stage_weight × recency_score
 *   • stage_weight: proposal=4, qualified=3.5, rdv=3, contacted=1.5, new=1
 *   • recency_score: 1 / (1 + days_since_last_activity)
 */

export interface TopDealRow {
  prospect_id: string;
  name: string;
  company: string | null;
  stage: string;
  stage_label: string;
  last_activity_label: string;
  last_activity_at: string;
  initials: string;
  avatar_url: string | null;
  href: string;
}

// Scoring weights keyed by the seeded status keys. Custom statuses get the
// default weight of 1 so the ranking still works in any pipeline shape.
const STAGE_WEIGHT: Record<string, number> = {
  proposal: 4,
  qualified: 3.5,
  rdv: 3,
  contacted: 1.5,
  new: 1,
};

/** Active = anything that isn't a terminal seed key. */
const TERMINAL_KEYS = new Set(["won", "lost"]);

function computeInitials(fullName: string | null): string {
  if (!fullName) return "??";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysSince(iso: string | null | undefined, fallbackIso: string): number {
  const ref = iso ?? fallbackIso;
  const d = new Date(ref).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - d) / (1000 * 60 * 60 * 24)));
}

function relativeFr(iso: string | null | undefined, fallbackIso: string): string {
  const days = daysSince(iso, fallbackIso);
  if (days === 0) return "Activité aujourd'hui";
  if (days === 1) return "Activité hier";
  return `Activité il y a ${days}j`;
}

export async function getTopDeals(
  ctx: ApiContext,
  opts: { limit?: number } = {},
): Promise<TopDealRow[]> {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const limit = Math.max(1, Math.min(20, opts.limit ?? 5));
  if (isMockStatsEnabled()) return mockDashboardTopDeals(limit);

  // Per-org statuses — labels + the "active" filter.
  const orgStatuses = await getProspectStatuses(ctx.supabase, ctx.workspaceId);
  const activeKeys = orgStatuses
    .map((s) => s.key)
    .filter((k) => !TERMINAL_KEYS.has(k));
  const labelByKey = new Map(orgStatuses.map((s) => [s.key, s.name] as const));

  // Pull a wider candidate set, score in JS, return top `limit`. Querying ~50
  // recent active prospects is cheap and avoids bespoke SQL ranking.
  const { data, error } = await ctx.supabase
    .from("prospects")
    .select(
      "id, full_name, company, status, last_contact, updated_at, created_at, enrichment_metadata",
    )
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .in("status", activeKeys.length > 0 ? activeKeys : ["new"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw Errors.internal("Failed to fetch top deals");

  const scored = (data ?? [])
    .map((p) => {
      const status = p.status ?? "new";
      const weight = STAGE_WEIGHT[status] ?? 1;
      const lastActivityIso =
        p.last_contact ??
        p.updated_at ??
        p.created_at ??
        new Date().toISOString();
      const days = daysSince(lastActivityIso, lastActivityIso);
      const recency = 1 / (1 + days);
      return {
        prospect: p,
        status,
        score: weight * recency,
        lastActivityIso,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ prospect, status, lastActivityIso }) => {
    const enrichment = prospect.enrichment_metadata as
      | { profile_picture_url?: string | null }
      | null;
    return {
      prospect_id: prospect.id,
      name: prospect.full_name ?? "Sans nom",
      company: prospect.company,
      stage: status,
      stage_label: labelByKey.get(status) ?? status,
      last_activity_label: relativeFr(lastActivityIso, lastActivityIso),
      last_activity_at: lastActivityIso,
      initials: computeInitials(prospect.full_name),
      avatar_url: enrichment?.profile_picture_url ?? null,
      href: `/prospect/${prospect.id}`,
    };
  });
}

export const GET = createApiHandler(async (req, ctx) => {
  const url = new URL(req.url);
  return getTopDeals(ctx, {
    limit: Number(url.searchParams.get("limit") ?? 5),
  });
});
