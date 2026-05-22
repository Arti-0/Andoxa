import { createApiHandler, Errors, type ApiContext } from "@/lib/api";
import { isMockStatsEnabled, mockDashboardAtRisk } from "@/lib/mock-stats";
import { getProspectStatuses } from "@/lib/prospects/statuses";

/**
 * GET /api/dashboard/at-risk?min_silence_days=6&limit=5
 *
 * Returns active prospects whose last activity is at least
 * `min_silence_days` ago. Severity buckets:
 *   • high — silence ≥ 10 days
 *   • med  — 7–9 days
 *   • low  — exactly the floor (default 6)
 */

export interface AtRiskRow {
  prospect_id: string;
  name: string;
  company: string | null;
  stage: string;
  stage_label: string;
  silence_days: number;
  severity: "high" | "med" | "low";
  initials: string;
  href: string;
}

/** Keys considered "in flight" — excludes seed terminals (won/lost) and the
 *  zero state (new). Custom statuses are treated as active by default. */
const TERMINAL_KEYS = new Set(["new", "won", "lost"]);

function computeInitials(fullName: string | null): string {
  if (!fullName) return "??";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  return Math.max(0, Math.round((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export async function getAtRisk(
  ctx: ApiContext,
  opts: { minSilenceDays?: number; limit?: number } = {},
): Promise<AtRiskRow[]> {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const minSilence = Math.max(1, Math.min(60, opts.minSilenceDays ?? 6));
  const limit = Math.max(1, Math.min(20, opts.limit ?? 5));
  if (isMockStatsEnabled()) return mockDashboardAtRisk(limit);

  // Per-org statuses — drives label resolution + the "active" filter so
  // custom statuses (anything that isn't new/won/lost) get included.
  const orgStatuses = await getProspectStatuses(ctx.supabase, ctx.workspaceId);
  const activeKeys = orgStatuses
    .map((s) => s.key)
    .filter((k) => !TERMINAL_KEYS.has(k));
  const labelByKey = new Map(orgStatuses.map((s) => [s.key, s.name] as const));

  // Cut-off date for "stale": last_contact (or updated_at fallback) older than
  // (now - minSilence days).
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - minSilence);
  const cutoffIso = cutoff.toISOString();

  const { data, error } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, company, status, last_contact, updated_at")
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .in("status", activeKeys.length > 0 ? activeKeys : ["contacted"])
    .or(
      `last_contact.lt.${cutoffIso},and(last_contact.is.null,updated_at.lt.${cutoffIso})`,
    )
    .order("last_contact", { ascending: true, nullsFirst: true })
    .limit(50);

  if (error) throw Errors.internal("Failed to fetch at-risk deals");

  const rows = (data ?? [])
    .map((p) => {
      const status = p.status ?? "contacted";
      const silence = daysSince(p.last_contact ?? p.updated_at);
      const severity: AtRiskRow["severity"] =
        silence >= 10 ? "high" : silence >= 7 ? "med" : "low";
      return { p, status, silence, severity };
    })
    .filter((r) => Number.isFinite(r.silence) && r.silence >= minSilence)
    .sort((a, b) => b.silence - a.silence)
    .slice(0, limit);

  return rows.map(({ p, status, silence, severity }) => ({
    prospect_id: p.id,
    name: p.full_name ?? "Sans nom",
    company: p.company,
    stage: status,
    stage_label: labelByKey.get(status) ?? status,
    silence_days: silence,
    severity,
    initials: computeInitials(p.full_name),
    href: `/prospect/${p.id}`,
  }));
}

export const GET = createApiHandler(async (req, ctx) => {
  const url = new URL(req.url);
  return getAtRisk(ctx, {
    minSilenceDays: Number(url.searchParams.get("min_silence_days") ?? 6),
    limit: Number(url.searchParams.get("limit") ?? 5),
  });
});
