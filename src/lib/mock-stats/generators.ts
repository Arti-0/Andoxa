import type { DashboardPeriod } from "@/lib/dashboard/period";
import { mockCalendarKpiBundle } from "./calendar-events";
import { mockUuid, randInt, randPct, randSpark, randTrend } from "./random";

export function mockDashboardStats(period: DashboardPeriod) {
  // Demo-screenshot values — deterministic so the captured dashboard is stable.
  return {
    prospects: 47,
    campaignsThisMonth: 9,
    rdvEffectues: 12,
    conversionRate: 34,
    kpis: {
      messagesEnvoyes: 124,
      prospectsQualifies: 21,
      dealsEnCours: 8,
    },
    charts: {
      prospectsOverTime: [
        { date: "Jan 2026", count: 22 },
        { date: "Fév 2026", count: 28 },
        { date: "Mar 2026", count: 33 },
        { date: "Avr 2026", count: 39 },
        { date: "Mai 2026", count: 44 },
        { date: "Jun 2026", count: 47 },
      ],
      activityVolume: [
        { week: "Sem. 1", calls: 12, messages: 64, bookings: 5 },
        { week: "Sem. 2", calls: 15, messages: 72, bookings: 7 },
        { week: "Sem. 3", calls: 18, messages: 81, bookings: 8 },
        { week: "Sem. 4", calls: 21, messages: 96, bookings: 12 },
      ],
    },
    period,
    pipeline: {
      active_total: 47,
      by_stage: { rdv: 6, proposal: 8, qualified: 21 },
      sparkline: [30, 33, 35, 38, 40, 42, 44, 47],
      trend_pts: 14,
    },
    rdv: {
      booked_count: 12,
      target: 14,
      realisation_pct: 86,
      sparkline: [6, 7, 8, 9, 10, 11, 12, 12],
      trend_pts: 9,
    },
    linkedin: {
      messages_sent: 124,
      invitations_sent: 124,
      responses_received: 42,
      acceptances_received: 72,
      response_rate_pct: 34,
      acceptance_rate_pct: 58,
      sparkline: [26, 28, 30, 31, 32, 33, 34, 34],
      trend_pts: 6,
    },
    closings: {
      won_count: 5,
      target: 6,
      progress_pct: 83,
      sparkline: [2, 3, 3, 4, 4, 5, 5, 5],
      trend_pts: 2,
    },
    week_labels: Array.from({ length: 12 }, (_, i) => `S${i + 1}`),
  };
}

export function mockDashboardFunnel(period: DashboardPeriod) {
  // Demo-screenshot values — deterministic.
  const inv = 124;
  const acc = 72;
  const conv = 38;
  const rdv = 12;
  const close = 5;
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

  return {
    steps: [
      {
        key: "invitations" as const,
        label: "Invitations envoyées",
        count: inv,
        conversion_pct_from_prev: null,
        trend_pts: 6,
      },
      {
        key: "accepted" as const,
        label: "Acceptées",
        count: acc,
        conversion_pct_from_prev: pct(acc, inv),
        trend_pts: 6,
      },
      {
        key: "conversations" as const,
        label: "Conversations",
        count: conv,
        conversion_pct_from_prev: pct(conv, acc),
        trend_pts: 5,
      },
      {
        key: "rdvs" as const,
        label: "RDV bookés",
        count: rdv,
        conversion_pct_from_prev: pct(rdv, conv),
        trend_pts: 9,
      },
      {
        key: "closings" as const,
        label: "Closings",
        count: close,
        conversion_pct_from_prev: pct(close, rdv),
        trend_pts: 2,
      },
    ],
    global_rate_pct: Math.round((close / inv) * 1000) / 10,
    avg_cycle_days: 14,
    pipeline_target_closings: 6,
    period,
  };
}

export function mockDashboardPriorities() {
  // Demo-screenshot values — deterministic.
  const rdv = 3;
  const stale = 7;
  const unread = 5;
  const proposals = 4;

  return {
    generated_at: new Date().toISOString(),
    items: [
      {
        key: "rdv_today" as const,
        count: rdv,
        label: "RDV aujourd'hui",
        sub: rdv > 0 ? "Prochain à 14h30" : "Aucun RDV prévu",
        href: "/calendar",
      },
      {
        key: "stale_conversations" as const,
        count: stale,
        label: "Conversations à relancer",
        sub: `${stale} sans réponse depuis 7j+`,
        href: "/messagerie?filter=stale",
      },
      {
        key: "unread_responses" as const,
        count: unread,
        label: "Réponses récentes",
        sub: `${unread} à traiter cette semaine`,
        href: "/messagerie?filter=unread",
      },
      {
        key: "proposals_to_follow" as const,
        count: proposals,
        label: "Propositions à suivre",
        sub: "Dernière activité > 2j",
        href: "/crm?status=proposal",
      },
    ],
  };
}

const MOCK_DEALS = [
  { name: "Sophie Martin", company: "Welkin", stage: "proposal" as const },
  { name: "Thomas Leroy", company: "Fintexa", stage: "rdv" as const },
  { name: "Camille Bernard", company: "Scalio", stage: "qualified" as const },
  { name: "Marc Dubois", company: "Datora", stage: "proposal" as const },
  { name: "Laura Moreau", company: "Venturis", stage: "rdv" as const },
  { name: "Nicolas Blanc", company: "Cloudis", stage: "qualified" as const },
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
    href: `/prospect/${mockUuid(100 + i)}`,
  }));
}

export function mockDashboardActiveCampaigns() {
  const names = [
    "Invitations Q2 : ICP SaaS",
    "Relance décideurs",
    "Connect : Dirigeants PME",
    "Séquence inbound webinar",
  ];
  return names.map((name, i) => {
    const total = randInt(48, 186);
    const done = randInt(Math.floor(total * 0.35), Math.floor(total * 0.82));
    return {
      workflow_id: mockUuid(200 + i),
      name,
      channel: (["linkedin", "linkedin", "linkedin", "linkedin"] as const)[i]!,
      state: (["running", "running", "paused", "running"] as const)[i]!,
      done,
      total,
      href: "/campaigns",
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
    "Appel de prospection passé",
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
  return {
    invitations_sent: inv,
    invitations_workflow: wf,
    invitations_campaign: cmp,
    invitations_direct: Math.max(0, inv - wf - cmp),
    messages_sent: randInt(24, 68),
    profile_views: randInt(8, 32),
    invitations_week: randInt(62, 118),
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
