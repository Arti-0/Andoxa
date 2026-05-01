import { createApiHandler, Errors } from "@/lib/api";
import {
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/lib/types/prospects";

/**
 * GET /api/dashboard/top-deals?limit=5
 *
 * Returns the hottest deals currently in the pipeline. Scoring:
 *   • stage_weight × recency_score
 *   • stage_weight: proposal=4, qualified=3.5, rdv=3, contacted=1.5, new=1
 *   • recency_score: 1 / (1 + days_since_last_activity)
 */

interface TopDealRow {
  prospect_id: string;
  name: string;
  company: string | null;
  stage: ProspectStatus;
  stage_label: string;
  last_activity_label: string;
  last_activity_at: string;
  initials: string;
  href: string;
}

const STAGE_WEIGHT: Partial<Record<ProspectStatus, number>> = {
  proposal: 4,
  qualified: 3.5,
  rdv: 3,
  contacted: 1.5,
  new: 1,
};

const ACTIVE_STAGES: ProspectStatus[] = [
  "new",
  "contacted",
  "qualified",
  "rdv",
  "proposal",
];

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

export const GET = createApiHandler(async (req, ctx): Promise<TopDealRow[]> => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(20, Number(url.searchParams.get("limit") ?? 5)),
  );

  // Pull a wider candidate set, score in JS, return top `limit`. Querying ~50
  // recent active prospects is cheap and avoids bespoke SQL ranking.
  const { data, error } = await ctx.supabase
    .from("prospects")
    .select(
      "id, full_name, company, status, last_contact, updated_at, created_at",
    )
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .in("status", ACTIVE_STAGES)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw Errors.internal("Failed to fetch top deals");

  const scored = (data ?? [])
    .map((p) => {
      const status = (p.status ?? "new") as ProspectStatus;
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

  return scored.map(({ prospect, status, lastActivityIso }) => ({
    prospect_id: prospect.id,
    name: prospect.full_name ?? "Sans nom",
    company: prospect.company,
    stage: status,
    stage_label: PROSPECT_STATUS_LABELS[status] ?? status,
    last_activity_label: relativeFr(lastActivityIso, lastActivityIso),
    last_activity_at: lastActivityIso,
    initials: computeInitials(prospect.full_name),
    href: `/prospect/${prospect.id}`,
  }));
});
