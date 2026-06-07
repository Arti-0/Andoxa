/**
 * Fixed dashboard numbers for the dedicated marketing-screenshot org.
 *
 * Why this exists: the dashboard always re-aggregates real DB rows. The seed
 * (`scripts/seed-screenshot-fixtures.ts`) tries to insert rows that aggregate
 * to the marketing targets, but some targets are impossible to hit by seeding
 * alone — e.g. `stale_conversations` and the funnel `conversations` step both
 * read `unipile_chat_prospects.last_inbound_at` with overlapping windows, so
 * any conversation replied >7d ago is *necessarily* also "stale". Rather than
 * fight the aggregation, we short-circuit the dashboard fetchers for this one
 * org so the marketing screenshots show exact figures — on localhost AND in
 * production. Real customer orgs never hit this path.
 *
 * NUMBERS BELOW MUST STAY IN SYNC with `SCREENSHOT_DASHBOARD_STATS` in
 * `scripts/lib/screenshot-seed-data.ts` (the seed still uses those to generate
 * the underlying entities/rows that the live list views read).
 */

import { isFeatureEnabled } from "@/lib/config/feature-flags";
import type { DashboardPeriod } from "@/lib/dashboard/period";

/** Same default + env override as `scripts/lib/screenshot-config.ts`. */
export const SCREENSHOT_ORG_ID =
  process.env.ANDOXA_SCREENSHOT_ORG_ID ??
  "a1111111-1111-4111-8111-111111111111";

export function isScreenshotWorkspace(
  workspaceId: string | null | undefined,
): boolean {
  return !!workspaceId && workspaceId === SCREENSHOT_ORG_ID;
}

/** Mirror of the seed targets — keep in sync (see file header). */
const STATS = {
  priorities: {
    rdvToday: 6,
    staleConversations: 23,
    recentResponses: 18,
    proposalsToFollow: 9,
    activeCampaigns: 4,
  },
  pipeline: {
    activeTotal: 172,
    contacted: 71,
    qualified: 43,
    rdv: 32,
    proposal: 26,
  },
  kpi: {
    rdvBooked: 27,
    rdvTarget: 48,
    linkedinInvitations: 560,
    linkedinMessages: 560,
    linkedinResponses: 78,
    linkedinAcceptances: 207,
    closings: 7,
    closingsTarget: 12,
  },
  funnel: {
    invitations: 560,
    accepted: 207,
    conversations: 78,
    rdvs: 27,
    closings: 7,
    avgCycleDays: 8,
  },
  activityVolume: {
    messages: [120, 130, 135, 140, 150, 165, 175, 165],
    calls: [3, 4, 5, 5, 6, 6, 7, 5],
    rdv: [4, 5, 6, 6, 7, 7, 8, 7],
  },
} as const;

/** Gentle ascending sparkline that ends near `end`. */
function ramp(end: number, n = 12, spread = 0.4): number[] {
  const start = Math.max(0, Math.round(end * (1 - spread)));
  if (n <= 1) return [end];
  return Array.from({ length: n }, (_, i) =>
    Math.round(start + (end - start) * (i / (n - 1))),
  );
}

// ── priorities ──────────────────────────────────────────────────────────────

export function screenshotPriorities() {
  const p = STATS.priorities;
  const channelSub = isFeatureEnabled("whatsapp")
    ? "LinkedIn + WhatsApp · 7 derniers jours"
    : "LinkedIn · 7 derniers jours";

  const items = [
    {
      key: "rdv_today" as const,
      count: p.rdvToday,
      label: "RDV aujourd'hui",
      sub: "Prochain : 11:00, Démo NovaTech",
      href: "/calendar",
    },
    {
      key: "stale_conversations" as const,
      count: p.staleConversations,
      label: "Conversations à relancer",
      sub: "Silence > 7 jours",
      href: "/messagerie",
    },
    {
      key: "unread_responses" as const,
      count: p.recentResponses,
      label: "Réponses récentes",
      sub: channelSub,
      href: "/messagerie",
    },
    {
      key: "proposals_to_follow" as const,
      count: p.proposalsToFollow,
      label: "Propositions à suivre",
      sub: "Sans relance depuis 2 jours",
      href: "/crm?status=proposal",
    },
    {
      key: "active_campaigns" as const,
      count: p.activeCampaigns,
      label: "Campagnes actives",
      sub: "Séquences d'envoi en cours",
      href: "/campaigns?status=running",
    },
    ...(isFeatureEnabled("workflows")
      ? [
          {
            key: "pending_workflows" as const,
            count: 5,
            label: "Workflows en attente",
            sub: "« Relance 48 h sans réponse » · étape 2/2",
            href: "/workflows",
          },
        ]
      : []),
  ];

  return {
    generated_at: new Date().toISOString(),
    items,
  };
}

// ── funnel ──────────────────────────────────────────────────────────────────

export function screenshotFunnel(period: DashboardPeriod) {
  const f = STATS.funnel;
  const pct = (n: number, d: number) =>
    d > 0 ? Math.round((n / d) * 100) : null;

  return {
    steps: [
      {
        key: "invitations" as const,
        label: "Invitations envoyées",
        count: f.invitations,
        conversion_pct_from_prev: null,
        trend_pts: 9,
      },
      {
        key: "accepted" as const,
        label: "Acceptées",
        count: f.accepted,
        conversion_pct_from_prev: pct(f.accepted, f.invitations),
        trend_pts: 6,
      },
      {
        key: "conversations" as const,
        label: "Conversations",
        count: f.conversations,
        conversion_pct_from_prev: pct(f.conversations, f.accepted),
        trend_pts: 5,
      },
      {
        key: "rdvs" as const,
        label: "RDV bookés",
        count: f.rdvs,
        conversion_pct_from_prev: pct(f.rdvs, f.conversations),
        trend_pts: 4,
      },
      {
        key: "closings" as const,
        label: "Closings",
        count: f.closings,
        conversion_pct_from_prev: pct(f.closings, f.rdvs),
        trend_pts: 2,
      },
    ],
    global_rate_pct: Math.round((f.closings / f.invitations) * 1000) / 10,
    avg_cycle_days: f.avgCycleDays,
    pipeline_target_closings: STATS.kpi.closingsTarget,
    period,
  };
}

// ── stats (overview KPI blocks + legacy v1 fields) ──────────────────────────

export function screenshotStats(period: DashboardPeriod) {
  const { pipeline, kpi, activityVolume } = STATS;

  const responseRatePct = Math.round(
    (kpi.linkedinResponses / kpi.linkedinMessages) * 100,
  );
  const acceptanceRatePct = Math.round(
    (kpi.linkedinAcceptances / kpi.linkedinInvitations) * 100,
  );

  return {
    // ── v1 (legacy /dashboard) ──────────────────────────────────────────────
    // Total = active (172) + won (7) + lost (121). Keep in sync with
    // SCREENSHOT_PROSPECT_COUNT in scripts/lib/screenshot-seed-data.ts.
    prospects: 300,
    campaignsThisMonth: 10,
    rdvEffectues: kpi.rdvBooked,
    conversionRate: 12.4,
    kpis: {
      messagesEnvoyes: kpi.linkedinMessages,
      prospectsQualifies: pipeline.qualified + pipeline.rdv + pipeline.proposal,
      dealsEnCours: pipeline.rdv + pipeline.proposal,
    },
    charts: {
      prospectsOverTime: [
        { date: "Jan 2026", count: 28 },
        { date: "Fév 2026", count: 36 },
        { date: "Mar 2026", count: 45 },
        { date: "Avr 2026", count: 58 },
        { date: "Mai 2026", count: 72 },
        { date: "Juin 2026", count: 41 },
      ],
      activityVolume: activityVolume.messages.map((messages, i) => ({
        week: `Sem. ${i + 1}`,
        calls: activityVolume.calls[i] ?? 0,
        messages,
        bookings: activityVolume.rdv[i] ?? 0,
      })),
    },

    // ── v2 (cockpit /dashboard) ─────────────────────────────────────────────
    period,
    pipeline: {
      active_total: pipeline.activeTotal,
      by_stage: {
        rdv: pipeline.rdv,
        proposal: pipeline.proposal,
        qualified: pipeline.qualified,
      },
      sparkline: ramp(pipeline.activeTotal),
      trend_pts: 6,
    },
    rdv: {
      booked_count: kpi.rdvBooked,
      target: kpi.rdvTarget,
      realisation_pct: Math.round((kpi.rdvBooked / kpi.rdvTarget) * 100),
      sparkline: ramp(kpi.rdvBooked),
      trend_pts: 8,
    },
    linkedin: {
      messages_sent: kpi.linkedinMessages,
      invitations_sent: kpi.linkedinInvitations,
      responses_received: kpi.linkedinResponses,
      acceptances_received: kpi.linkedinAcceptances,
      response_rate_pct: responseRatePct,
      acceptance_rate_pct: acceptanceRatePct,
      sparkline: ramp(responseRatePct),
      trend_pts: 4,
    },
    closings: {
      won_count: kpi.closings,
      target: kpi.closingsTarget,
      progress_pct: Math.round((kpi.closings / kpi.closingsTarget) * 100),
      sparkline: ramp(kpi.closings),
      trend_pts: 3,
    },
    week_labels: Array.from({ length: 12 }, (_, i) => `S${i + 1}`),
  };
}
