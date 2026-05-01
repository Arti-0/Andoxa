import { createApiHandler, Errors } from "@/lib/api";
import {
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/lib/types/prospects";

/**
 * GET /api/dashboard/at-risk?min_silence_days=6&limit=5
 *
 * Returns active prospects whose last activity is at least
 * `min_silence_days` ago. Severity buckets:
 *   • high — silence ≥ 10 days
 *   • med  — 7–9 days
 *   • low  — exactly the floor (default 6)
 */

interface AtRiskRow {
  prospect_id: string;
  name: string;
  company: string | null;
  stage: ProspectStatus;
  stage_label: string;
  silence_days: number;
  severity: "high" | "med" | "low";
  initials: string;
  href: string;
}

const ACTIVE_STAGES: ProspectStatus[] = [
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

function daysSince(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  return Math.max(0, Math.round((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export const GET = createApiHandler(async (req, ctx): Promise<AtRiskRow[]> => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const url = new URL(req.url);
  const minSilence = Math.max(
    1,
    Math.min(60, Number(url.searchParams.get("min_silence_days") ?? 6)),
  );
  const limit = Math.max(
    1,
    Math.min(20, Number(url.searchParams.get("limit") ?? 5)),
  );

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
    .in("status", ACTIVE_STAGES)
    .or(
      `last_contact.lt.${cutoffIso},and(last_contact.is.null,updated_at.lt.${cutoffIso})`,
    )
    .order("last_contact", { ascending: true, nullsFirst: true })
    .limit(50);

  if (error) throw Errors.internal("Failed to fetch at-risk deals");

  const rows = (data ?? [])
    .map((p) => {
      const status = (p.status ?? "contacted") as ProspectStatus;
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
    stage_label: PROSPECT_STATUS_LABELS[status] ?? status,
    silence_days: silence,
    severity,
    initials: computeInitials(p.full_name),
    href: `/prospect/${p.id}`,
  }));
});
