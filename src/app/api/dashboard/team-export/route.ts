import { createApiHandler, Errors, type ApiContext } from "@/lib/api";
import {
  getPeriodPair,
  parsePeriod,
  type DashboardPeriod,
} from "@/lib/dashboard/period";
import { getDashboardStats } from "../stats/route";
import { getDashboardFunnel } from "../funnel/route";

/**
 * GET /api/dashboard/team-export?period=today|week|month
 *
 * Server-side aggregation backing the "Performance de l'équipe" PDF export.
 * Everything is scoped to the caller's workspace (organization_id) — which IS
 * the team — so we compose the two existing org-wide aggregators rather than
 * duplicating their query logic:
 *
 *   • getDashboardStats  → KPIs, sparklines, pipeline composition, volume
 *   • getDashboardFunnel → conversion funnel + step-to-step passage rates
 *
 * On top of that it derives the few report-only figures the export needs
 * (closing rate, funnel summary ratios, "à contacter" pipeline stage) and the
 * team meta (name + active member count). Charts in the PDF are rendered from
 * these values, so they update with both the data and the selected period.
 */

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

export interface TeamExportKpi {
  /** Numeric value (a percentage when `isPercent`). */
  value: number;
  /** Pre-formatted display string (handles thousands separators / "%" / "pt"). */
  display: string;
  /** Delta vs previous period. Unit is "%" for counts, "pt" for rates. */
  delta: { text: string; dir: "up" | "down" | "flat" };
  /** Weekly sparkline series. */
  spark: number[];
}

export interface TeamExportFunnelStep {
  n: number;
  label: string;
  count: number;
  display: string;
  /** "% de passage" from the previous step (null for the first step). */
  passage: string | null;
}

export interface TeamExportData {
  org: { name: string | null; memberCount: number };
  period: DashboardPeriod;
  periodLabel: string;
  generatedAt: string;
  kpis: {
    pipeline: TeamExportKpi;
    closingRate: TeamExportKpi;
    closings: TeamExportKpi;
    rdvBooked: TeamExportKpi;
  };
  funnel: {
    steps: TeamExportFunnelStep[];
    summary: { key: string; value: string }[];
  };
  volume: {
    subtitle: string;
    weeks: { label: string; msg: number; app: number; rdv: number }[];
    legend: { key: "msg" | "app" | "rdv"; label: string; value: string }[];
  };
  pipelineComposition: { label: string; n: number; pct: number }[];
}

/* ============================ format helpers ============================ */

/** French thousands separator (narrow no-break space), e.g. 1111 → "1 111". */
function fr(n: number): string {
  return Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");
}

/** One-decimal French percent, e.g. 34.62 → "34,6 %". */
function pct1(n: number): string {
  return `${(Math.round(n * 10) / 10).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

function dirOf(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

/** Trend tag for a count KPI (percentage change). ASCII "-" so the base PDF
 *  font (Helvetica/WinAnsi) renders the sign — U+2212 minus is dropped. */
function countDelta(trendPts: number): TeamExportKpi["delta"] {
  const dir = dirOf(trendPts);
  const sign = trendPts > 0 ? "+" : trendPts < 0 ? "-" : "";
  return { text: `${sign}${Math.abs(trendPts)} %`, dir };
}

/** Trend tag for a rate KPI (point delta). */
function rateDelta(points: number): TeamExportKpi["delta"] {
  const rounded = Math.round(points * 10) / 10;
  const dir = dirOf(rounded);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return { text: `${sign}${abs} pt`, dir };
}

/**
 * Reconstruct a previous-period count from the value + integer trend_pts the
 * funnel returns (`trendPts = (cur - prev) / prev * 100`, with 100 used as the
 * "prev was 0" sentinel). Lets us derive a real closing-rate delta without
 * re-querying or widening the shared funnel response.
 */
function prevFromTrend(count: number, trendPts: number): number {
  if (trendPts === 100) return 0; // sentinel: previous period was empty
  const factor = 1 + trendPts / 100;
  if (factor <= 0) return 0;
  return count / factor;
}

function buildPeriodLabel(period: DashboardPeriod, start: Date): string {
  switch (period) {
    case "today":
      return "Aujourd'hui";
    case "week":
      return "Cette semaine";
    case "month":
    default:
      return "30 derniers jours";
  }
}

/* ============================ aggregation ============================ */

export async function getTeamExportData(
  ctx: ApiContext,
  period: DashboardPeriod,
): Promise<TeamExportData> {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { current } = getPeriodPair(period);

  const [stats, funnel, membersRes] = await Promise.all([
    getDashboardStats(ctx, period),
    getDashboardFunnel(ctx, period),
    ctx.supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .eq("active", true),
  ]);

  const memberCount = membersRes.count ?? 0;

  /* ── KPIs ─────────────────────────────────────────────────────── */
  const pipeline = stats.pipeline;
  const rdv = stats.rdv;
  const closings = stats.closings;

  const stepByKey = new Map(funnel.steps.map((s) => [s.key, s]));
  const convStep = stepByKey.get("conversations");
  const closeStep = stepByKey.get("closings");
  const rdvStep = stepByKey.get("rdvs");
  const invStep = stepByKey.get("invitations");

  const convCount = convStep?.count ?? 0;
  const closeCount = closeStep?.count ?? 0;
  const rdvCount = rdvStep?.count ?? 0;
  const invCount = invStep?.count ?? 0;

  // Closing rate = conversations → closing, with a real point-delta derived
  // from reconstructed previous-period counts.
  const closingRateNow = convCount > 0 ? (closeCount / convCount) * 100 : 0;
  const prevConv = prevFromTrend(convCount, convStep?.trend_pts ?? 0);
  const prevClose = prevFromTrend(closeCount, closeStep?.trend_pts ?? 0);
  const closingRatePrev = prevConv > 0 ? (prevClose / prevConv) * 100 : 0;
  const closingRateDeltaPts = closingRateNow - closingRatePrev;

  const kpis: TeamExportData["kpis"] = {
    pipeline: {
      value: pipeline.active_total,
      display: fr(pipeline.active_total),
      delta: countDelta(pipeline.trend_pts),
      spark: pipeline.sparkline ?? [],
    },
    closingRate: {
      value: Math.round(closingRateNow),
      display: `${Math.round(closingRateNow)} %`,
      delta: rateDelta(closingRateDeltaPts),
      spark: closings.sparkline ?? [],
    },
    closings: {
      value: closings.won_count,
      display: fr(closings.won_count),
      delta: countDelta(closings.trend_pts),
      spark: closings.sparkline ?? [],
    },
    rdvBooked: {
      value: rdv.booked_count,
      display: fr(rdv.booked_count),
      delta: countDelta(rdv.trend_pts),
      spark: rdv.sparkline ?? [],
    },
  };

  /* ── Funnel ───────────────────────────────────────────────────── */
  const funnelSteps: TeamExportFunnelStep[] = funnel.steps.map((s, i) => ({
    n: i + 1,
    label: s.label,
    count: s.count,
    display: fr(s.count),
    passage:
      s.conversion_pct_from_prev != null
        ? `${s.conversion_pct_from_prev} % de passage`
        : null,
  }));

  const funnelSummary = [
    {
      key: "Inv. » RDV",
      value: invCount > 0 ? pct1((rdvCount / invCount) * 100) : "—",
    },
    {
      key: "Inv. » closing",
      value: invCount > 0 ? pct1((closeCount / invCount) * 100) : "—",
    },
    {
      key: "RDV » closing",
      value: rdvCount > 0 ? pct1((closeCount / rdvCount) * 100) : "—",
    },
  ];

  /* ── Volume (recent weeks of activity) ────────────────────────── */
  const av = stats.charts?.activityVolume ?? [];
  const weeks = av.map((w) => ({
    label: String(w.week).replace(/^Sem\.\s*/, ""),
    msg: w.messages ?? 0,
    app: w.calls ?? 0,
    rdv: w.bookings ?? 0,
  }));
  const volTotals = weeks.reduce(
    (acc, w) => {
      acc.msg += w.msg;
      acc.app += w.app;
      acc.rdv += w.rdv;
      return acc;
    },
    { msg: 0, app: 0, rdv: 0 },
  );

  /* ── Pipeline composition ─────────────────────────────────────── */
  const byStage = pipeline.by_stage ?? { rdv: 0, proposal: 0, qualified: 0 };
  const active = pipeline.active_total ?? 0;
  const toContact = Math.max(
    active - (byStage.rdv + byStage.proposal + byStage.qualified),
    0,
  );
  const compRaw = [
    { label: "À contacter", n: toContact },
    { label: "Qualifiés", n: byStage.qualified },
    { label: "En proposition", n: byStage.proposal },
    { label: "En RDV", n: byStage.rdv },
  ];
  const pipelineComposition = compRaw.map((c) => ({
    ...c,
    pct: active > 0 ? Math.round((c.n / active) * 100) : 0,
  }));

  return {
    org: { name: ctx.workspace?.name ?? null, memberCount },
    period,
    periodLabel: buildPeriodLabel(period, current.start),
    generatedAt: new Date().toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    kpis,
    funnel: { steps: funnelSteps, summary: funnelSummary },
    volume: {
      subtitle: "Messages, appels et RDV · par semaine",
      weeks,
      legend: [
        { key: "msg", label: "Messages", value: fr(volTotals.msg) },
        { key: "app", label: "Appels", value: fr(volTotals.app) },
        { key: "rdv", label: "RDV", value: fr(volTotals.rdv) },
      ],
    },
    pipelineComposition,
  };
}

export const GET = createApiHandler(async (req, ctx) => {
  const url = new URL(req.url);
  const period = parsePeriod(url.searchParams.get("period"));
  return getTeamExportData(ctx, period);
});
