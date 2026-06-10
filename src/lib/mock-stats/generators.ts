import type { DashboardPeriod } from "@/lib/dashboard/period";
import { computeLinkedInBudget } from "@/lib/linkedin/pacing";
import { mockCalendarKpiBundle } from "./calendar-events";
import { funnelCounts, mockUuid, randInt, randPct, randSpark, randTrend } from "./random";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

export function mockDashboardStats(period: DashboardPeriod) {
  const pipelineTotal = randInt(142, 218);
  const rdvBooked = randInt(28, 52);
  const rdvTarget = randInt(40, 56);
  const won = randInt(8, 16);
  const wonTarget = randInt(12, 18);
  const invSent = randInt(120, 210);
  const msgSent = randInt(85, 165);
  const responses = randInt(38, 92);
  const acceptances = randInt(52, 118);

  return {
    prospects: randInt(186, 248),
    campaignsThisMonth: randInt(6, 14),
    rdvEffectues: randInt(22, 48),
    conversionRate: randPct(14, 32),
    kpis: {
      messagesEnvoyes: randInt(340, 620),
      prospectsQualifies: randInt(48, 86),
      dealsEnCours: randInt(32, 64),
    },
    charts: {
      prospectsOverTime: [
        { date: "Jan 2026", count: randInt(18, 42) },
        { date: "Fév 2026", count: randInt(24, 48) },
        { date: "Mar 2026", count: randInt(32, 58) },
        { date: "Avr 2026", count: randInt(38, 72) },
        { date: "Mai 2026", count: randInt(44, 88) },
        { date: "Jun 2026", count: randInt(12, 28) },
      ],
      activityVolume: Array.from({ length: 8 }, (_, i) => ({
        week: `Sem. ${i + 1}`,
        calls: randInt(8, 28),
        messages: randInt(42, 128),
        bookings: randInt(3, 14),
      })),
    },
    period,
    pipeline: {
      active_total: pipelineTotal,
      by_stage: {
        rdv: randInt(22, 38),
        proposal: randInt(18, 32),
        qualified: randInt(48, 72),
      },
      sparkline: randSpark(12, pipelineTotal, 18),
      trend_pts: randTrend(),
    },
    rdv: {
      booked_count: rdvBooked,
      target: rdvTarget,
      realisation_pct: Math.round((rdvBooked / rdvTarget) * 100),
      sparkline: randSpark(12, rdvBooked, 6),
      trend_pts: randTrend(),
    },
    linkedin: {
      messages_sent: msgSent,
      invitations_sent: invSent,
      responses_received: responses,
      acceptances_received: acceptances,
      response_rate_pct: Math.round((responses / msgSent) * 100),
      acceptance_rate_pct: Math.round((acceptances / invSent) * 100),
      sparkline: randSpark(12, randPct(22, 48), 8),
      trend_pts: randTrend(-8, 18),
    },
    closings: {
      won_count: won,
      target: wonTarget,
      progress_pct: Math.round((won / wonTarget) * 100),
      sparkline: randSpark(12, won, 3),
      trend_pts: randTrend(),
    },
    week_labels: Array.from({ length: 12 }, (_, i) => `S${i + 1}`),
  };
}

export function mockDashboardFunnel(period: DashboardPeriod) {
  const [inv, acc, conv, rdv, close] = funnelCounts(5, 165, 210);
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

  return {
    steps: [
      {
        key: "invitations" as const,
        label: "Invitations envoyées",
        count: inv,
        conversion_pct_from_prev: null,
        trend_pts: randTrend(),
      },
      {
        key: "accepted" as const,
        label: "Acceptées",
        count: acc,
        conversion_pct_from_prev: pct(acc, inv),
        trend_pts: randTrend(),
      },
      {
        key: "conversations" as const,
        label: "Conversations",
        count: conv,
        conversion_pct_from_prev: pct(conv, acc),
        trend_pts: randTrend(),
      },
      {
        key: "rdvs" as const,
        label: "RDV bookés",
        count: rdv,
        conversion_pct_from_prev: pct(rdv, conv),
        trend_pts: randTrend(),
      },
      {
        key: "closings" as const,
        label: "Closings",
        count: close,
        conversion_pct_from_prev: pct(close, rdv),
        trend_pts: randTrend(),
      },
    ],
    global_rate_pct: Math.round((close / inv) * 1000) / 10,
    avg_cycle_days: randInt(11, 24),
    pipeline_target_closings: randInt(12, 18),
    period,
  };
}

export function mockDashboardPriorities() {
  const rdv = randInt(3, 8);
  const stale = randInt(12, 28);
  const unread = randInt(8, 22);
  const proposals = randInt(6, 18);
  const activeCampaigns = randInt(3, 9);
  const workflows = randInt(4, 11);

  return {
    generated_at: new Date().toISOString(),
    items: [
      {
        key: "rdv_today" as const,
        count: rdv,
        label: "RDV aujourd'hui",
        sub:
          rdv > 0
            ? `Prochain à ${randInt(9, 16)}h${String(randInt(0, 45)).padStart(2, "0")}`
            : "Agenda libre aujourd'hui",
        href: "/calendar",
      },
      {
        key: "stale_conversations" as const,
        count: stale,
        label: "Conversations à relancer",
        sub: "Silence > 7 jours",
        href: "/messagerie?filter=stale",
      },
      {
        key: "unread_responses" as const,
        count: unread,
        label: "Réponses récentes",
        sub: "LinkedIn · 7 derniers jours",
        href: "/messagerie?filter=unread",
      },
      {
        key: "proposals_to_follow" as const,
        count: proposals,
        label: "Propositions à suivre",
        sub: "Sans relance depuis 2 jours",
        href: "/crm?status=proposal",
      },
      {
        key: "active_campaigns" as const,
        count: activeCampaigns,
        label: "Campagnes actives",
        sub: "Séquences d'envoi en cours",
        href: "/campaigns?status=running",
      },
      // #FF: workflows — hidden alongside the gated Workflows feature.
      ...(isFeatureEnabled("workflows")
        ? [
            {
              key: "pending_workflows" as const,
              count: workflows,
              label: "Workflow en attente",
              sub: `${workflows} parcours en pause`,
              href: "/workflows",
            },
          ]
        : []),
    ],
  };
}

const MOCK_DEALS = [
  { name: "Sophie Martin", company: "NovaTech", stage: "proposal" as const },
  { name: "Thomas Leroy", company: "DataFlow", stage: "rdv" as const },
  { name: "Camille Bernard", company: "ScaleUp", stage: "qualified" as const },
  { name: "Marc Dubois", company: "FinEdge", stage: "proposal" as const },
  { name: "Laura Moreau", company: "SaaSify", stage: "rdv" as const },
  { name: "Nicolas Blanc", company: "RevOps", stage: "qualified" as const },
];

const STAGE_LABELS: Record<string, string> = {
  proposal: "Proposition",
  rdv: "RDV planifié",
  qualified: "Qualifié",
  contacted: "Contacté",
  new: "Nouveau",
};

export function mockDashboardTopDeals(limit: number) {
  return MOCK_DEALS.slice(0, limit).map((d, i) => ({
    prospect_id: mockUuid(i + 1),
    name: d.name,
    company: d.company,
    stage: d.stage,
    stage_label: STAGE_LABELS[d.stage] ?? d.stage,
    last_activity_label:
      i === 0 ? "Réponse aujourd'hui" : i === 1 ? "Réponse hier" : `Activité il y a ${i + 1}j`,
    last_activity_at: new Date(Date.now() - i * 86400000).toISOString(),
    initials: d.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    avatar_url: null,
    href: `/prospect/${mockUuid(i + 1)}`,
  }));
}

export function mockDashboardAtRisk(limit: number) {
  return MOCK_DEALS.slice(0, limit).map((d, i) => ({
    prospect_id: mockUuid(100 + i),
    name: d.name,
    company: d.company,
    stage: d.stage,
    stage_label: STAGE_LABELS[d.stage] ?? d.stage,
    silence_days: randInt(7, 18) + i,
    severity: (i === 0 ? "high" : i < 3 ? "med" : "low") as "high" | "med" | "low",
    initials: d.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    avatar_url: null,
    href: `/prospect/${mockUuid(100 + i)}`,
  }));
}

export function mockDashboardActiveCampaigns() {
  const names = [
    "Invitations Q2 — ICP SaaS",
    "Relance décideurs",
    "Post-RDV WhatsApp",
    "Séquence inbound webinar",
  ];
  return names.map((name, i) => {
    const total = randInt(48, 186);
    const done = randInt(Math.floor(total * 0.35), Math.floor(total * 0.82));
    return {
      workflow_id: mockUuid(200 + i),
      name,
      channel: (["linkedin", "whatsapp", "linkedin+whatsapp", "linkedin"] as const)[i]!,
      state: (["running", "running", "paused", "running"] as const)[i]!,
      done,
      total,
      href: `/workflows/${mockUuid(200 + i)}`,
    };
  });
}

export function mockDashboardActivity() {
  const titles = [
    "Invitation LinkedIn envoyée",
    "Réponse reçue",
    "RDV planifié",
    "Statut mis à jour",
    "Campagne lancée",
    "Message WhatsApp envoyé",
  ];
  return titles.map((title, i) => ({
    id: `mock-act-${i}`,
    type: "linkedin_message_outbound" as const,
    title,
    description: `${randInt(2, 12)} prospects · ${MOCK_DEALS[i % MOCK_DEALS.length]?.company ?? "Acme"}`,
    timestamp: new Date(Date.now() - i * 3600000 * randInt(1, 4)).toISOString(),
    target_url: "/crm",
    actor_name: "Marie Dupont",
    actor_avatar: null,
  }));
}

export function mockLinkedInUsage() {
  const inv = randInt(18, 42);
  const wf = randInt(8, Math.max(9, inv - 4));
  const cmp = randInt(2, Math.max(3, inv - wf - 1));
  // A proven, healthy premium account so the demo card shows the fast-lane
  // ("Compte établi") state: strong acceptance over a meaningful volume.
  const budget = computeLinkedInBudget({
    tier: "premium",
    daysSinceConnected: 45,
    acceptanceRate: 0.42,
    acceptedCount: 40,
    healthy: true,
  });
  return {
    invitations_sent: inv,
    invitations_workflow: wf,
    invitations_campaign: cmp,
    invitations_direct: Math.max(0, inv - wf - cmp),
    messages_sent: randInt(24, 68),
    profile_views: randInt(8, 32),
    invitations_week: randInt(62, 118),
    invitations_today: randInt(6, budget.inviteDailyCap),
    budget,
  };
}

type CampaignPeriod = "7" | "30" | "90" | "all";

export function mockCampaignKpis(period: CampaignPeriod) {
  const buckets = period === "all" ? 12 : 7;
  const invitations = randInt(120, 280);
  const acceptance = randPct(32, 58);
  const messages = randInt(85, 195);
  const meetings = randInt(12, 38);
  const calls = randInt(18, 64);

  const entry = (value: number, unit?: "%") => ({
    value,
    ...(unit ? { unit } as const : {}),
    delta: randTrend(-15, 22),
    spark: randSpark(buckets, value, Math.max(4, Math.floor(value / buckets))),
  });

  return {
    invitations: entry(invitations),
    acceptanceRate: entry(acceptance, "%"),
    messages: entry(messages),
    meetings: entry(meetings),
    calls: entry(calls),
  };
}

export function mockProspectsFunnel() {
  // Mirrors the 10 default statuses seeded in
  // 20260521120000_prospect_statuses_new_defaults_and_org_trigger.sql.
  // Real installs read the per-org rows; this is dev-only fixture data.
  const stages = [
    { key: "new", name: "Nouveau", color: "#94a3b8" },
    { key: "contacted", name: "Contacté", color: "#60a5fa" },
    { key: "qualified", name: "Qualifié", color: "#2563eb" },
    { key: "rdv", name: "RDV", color: "#0ea5e9" },
    { key: "noshow", name: "No-show", color: "#f97316" },
    { key: "rdv_realise", name: "RDV réalisé", color: "#22c55e" },
    { key: "rdv_replanifier", name: "RDV à replanifier", color: "#0ea5e9" },
    { key: "proposal", name: "Proposition", color: "#a855f7" },
    { key: "won", name: "Signé", color: "#16a34a" },
    { key: "lost", name: "Perdu", color: "#ef4444" },
  ] as const;

  return {
    stages: stages.map((s) => ({
      status: s.key,
      name: s.name,
      color: s.color,
      count: randInt(s.key === "won" || s.key === "lost" ? 8 : 18, s.key === "new" ? 42 : 36),
      delta_7d: randInt(-6, 14),
      avg_cycle_days: s.key === "won" || s.key === "lost" ? randInt(18, 45) : randInt(4, 22),
    })),
  };
}

export function mockCalendarKpi() {
  return mockCalendarKpiBundle();
}

export function mockBddTotal(minItems: number): number {
  return randInt(Math.max(minItems, 18), Math.max(minItems, 24));
}

export function mockProspectsTotal(): number {
  return randInt(198, 248);
}

export function mockBddRowCounts(index: number) {
  const prospects = randInt(18, 86);
  return {
    prospects_count: prospects,
    phones_count: randInt(Math.floor(prospects * 0.6), prospects),
    contacted_count: randInt(Math.floor(prospects * 0.4), Math.floor(prospects * 0.85)),
    rdv_count: randInt(4, Math.floor(prospects * 0.35)),
    signed_count: randInt(2, Math.floor(prospects * 0.18)),
    delta_7d: randInt(-4, 12),
    avg_cycle_days: randInt(8, 28),
  };
}

export function mockCallSessionStats() {
  const total = randInt(24, 68);
  const processed = randInt(Math.floor(total * 0.55), total);
  return {
    total_count: total,
    processed,
    meetings: randInt(3, Math.floor(processed * 0.35)),
    qualifications: randInt(Math.floor(processed * 0.5), processed),
    pickup_rate: randPct(38, 72),
  };
}

export function mockCallSessionDetailStats() {
  const base = mockCallSessionStats();
  const skipped = randInt(2, Math.max(3, Math.floor(base.total_count * 0.12)));
  const called = base.processed;
  return {
    total: base.total_count,
    called,
    completed: base.qualifications,
    skipped,
    pending: Math.max(1, base.total_count - called - skipped),
    outcomes: {
      rdv: base.meetings,
      qualified: randInt(6, 18),
      noanswer: randInt(4, 14),
      callback: randInt(2, 8),
    },
    totalCallTime: randInt(1800, 5400),
    avgCallTime: randInt(95, 240),
    sessionDuration: randInt(2400, 7200),
    sessionStatus: "active",
  };
}

export function mockCampaignJobStats(processed: number, jobIndex: number) {
  const base = Math.max(processed, randInt(28, 96));
  const accepted = randInt(Math.floor(base * 0.35), Math.floor(base * 0.62));
  const replied = randInt(Math.floor(base * 0.18), Math.floor(base * 0.42));
  return {
    accepted: accepted + jobIndex * 2,
    replied: replied + jobIndex,
    meetings: randInt(3, 18),
  };
}
