/** Shared fixtures for `seed-screenshot-fixtures.ts`. */

export const COLLEAGUE_USERS = [
  { id: "e1111111-1111-4111-8111-111111111111", email: "lucas.bernard@andoxa.dev", name: "Lucas Bernard" },
  { id: "e2222222-2222-4222-8222-222222222222", email: "emma.renard@andoxa.dev", name: "Emma Renard" },
  { id: "e3333333-3333-4333-8333-333333333333", email: "thomas.leroy@andoxa.dev", name: "Thomas Leroy" },
  { id: "e4444444-4444-4444-8444-444444444444", email: "camille.dupont@andoxa.dev", name: "Camille Dupont" },
  { id: "e5555555-5555-4555-8555-555555555555", email: "julien.petit@andoxa.dev", name: "Julien Petit" },
  { id: "e6666666-6666-4666-8666-666666666666", email: "sarah.cohen@andoxa.dev", name: "Sarah Cohen" },
  { id: "e7777777-7777-4777-8777-777777777777", email: "hugo.lambert@andoxa.dev", name: "Hugo Lambert" },
  { id: "e8888888-8888-4888-8888-888888888888", email: "lea.bonnet@andoxa.dev", name: "Léa Bonnet" },
  { id: "e9999999-9999-4999-8999-999999999999", email: "romain.faure@andoxa.dev", name: "Romain Faure" },
] as const;

export const WORKFLOW_RELANCES_ID = "c2222222-2222-4222-8222-222222222222";
export const WORKFLOW_LINKEDIN_ID = "c3333333-3333-4333-8333-333333333333";

/**
 * Target dashboard figures for screenshot fixtures.
 * Period: use « 30 jours » on /dashboard so KPI + funnel align with these counts.
 */
export const SCREENSHOT_DASHBOARD_STATS = {
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
    messages: [120, 130, 135, 140, 150, 165, 175, 165] as const,
    calls: [3, 4, 5, 5, 6, 6, 7, 5] as const,
    rdv: [4, 5, 6, 6, 7, 7, 8, 7] as const,
  },
} as const;

/** Enough prospects for 560 distinct LinkedIn invites + pipeline stages. */
export const SCREENSHOT_PROSPECT_COUNT = 600;

const BDD_NAMES = [
  "ICP SaaS Q2",
  "Décideurs Enterprise",
  "Inbound Webinar Avril",
  "Salon VivaTech",
  "Outbound Nord",
  "Booking · Mai",
  "LinkedIn — CMO SaaS",
  "Relance Q1",
  "Inbound Mars",
  "Partenaires intégrateurs",
  "Churn save",
  "Upsell clients actifs",
  "Salon BigData Paris",
  "Cold email — PME",
  "WhatsApp chauds",
  "Formulaire site",
  "Referrals clients",
  "Expansion Benelux",
  "Account-based — FinTech",
  "No-show recovery",
];

export function buildBddLists(): Array<{ id: string; name: string }> {
  return BDD_NAMES.map((name, i) => ({
    id: `b${String(i + 1).padStart(7, "0")}-1111-4111-8111-111111111111`,
    name,
  }));
}

export type ProspectSeed = {
  name: string;
  company: string;
  jobTitle: string;
  status: string;
  source: string;
  bddIndex?: number;
  createdDaysAgo: number;
  lastContactDaysAgo: number;
  hasLinkedin?: boolean;
  hasWhatsapp?: boolean;
  hasBooking?: boolean;
  inWorkflow?: "running" | "paused";
  workflowStep?: number;
};

const FIRST = [
  "Sophie", "Thomas", "Camille", "Julien", "Émilie", "Marc", "Laura", "Nicolas",
  "Chloé", "Antoine", "Julie", "Pierre", "Isabelle", "Alexandre", "Marine", "Hugo",
  "Claire", "Romain", "Sarah", "Maxime", "Léa", "Benjamin", "Manon", "Florian",
  "Audrey", "Guillaume", "Pauline", "Olivier", "Valérie", "Damien", "Céline",
  "Vincent", "Nathalie", "Jérôme", "Caroline", "Fabien", "Élodie", "Sébastien",
  "Amélie", "Théo", "Inès", "Arthur", "Zoé", "Noah", "Lola", "Ethan", "Jade",
  "Louis", "Alice", "Gabriel", "Rose", "Adam", "Lina", "Tom", "Eva", "Nolan",
  "Mia", "Axel", "Anna", "Léo", "Nina", "Yann", "Océane", "Kévin", "Margot",
  "Baptiste", "Charlotte", "Quentin", "Elise", "Mathieu", "Anaïs", "Rémi",
  "Justine", "Adrien", "Coralie", "Grégory", "Maëlle", "Simon", "Aurore",
];

const LAST = [
  "Martin", "Leroy", "Bernard", "Petit", "Rousseau", "Dubois", "Moreau", "Blanc",
  "Girard", "Lefevre", "Fontaine", "Garnier", "Mercier", "Roy", "Dupont", "Lambert",
  "Vincent", "Faure", "Cohen", "Perrin", "Bonnet", "Roux", "Lefèvre", "Meyer",
  "Simon", "André", "Michel", "Caron", "Gauthier", "Lemoine", "Marchand", "Robin",
  "Berger", "Henry", "Masson", "Noel", "Renard", "Morin", "Chevalier", "Barre",
  "Leclerc", "Gallet", "Durand", "Martinez", "Fournier", "Giraud", "Roussel",
  "Mercier", "Faure", "Cohen", "Bonnet", "Roux", "Meyer", "Simon", "André",
  "Michel", "Caron", "Gauthier", "Lemoine", "Marchand", "Robin", "Berger", "Henry",
  "Masson", "Noel", "Renard", "Morin", "Chevalier", "Barre", "Leclerc", "Gallet",
];

const COMPANIES = [
  "NovaTech", "DataFlow", "ScaleUp", "CloudNine", "GrowthLab", "FinEdge", "SaaSify",
  "RevOps", "Inbound", "Pipeline", "Outbound", "B2B Pro", "TechVenture", "MetricHub",
  "LeadGen", "SalesForce Pro", "DataSync", "CloudStack", "FinTech Plus", "AgileCRM",
  "SmartLead", "ProScale", "VentureLab", "OpsFlow", "MarketPulse", "NextGen SaaS",
  "RevBoost", "DataBridge", "SalesPilot", "GrowthForge", "LeadWave", "CloudMetrics",
  "ScaleForce", "PipelinePro", "InboundLab", "RevStream", "TechPulse", "DataPeak",
  "GrowthStack", "SaaSBridge", "OutboundPro", "MetricFlow", "SalesCraft", "CloudVenture",
  "LeadForge", "RevEngine", "DataNest", "GrowthNest", "ScaleNest", "PipelineNest",
];

const JOB_TITLES = [
  "CEO", "CMO", "VP Sales", "Head of Growth", "Directeur Commercial", "Sales Manager",
  "Account Executive", "SDR", "Business Developer", "RevOps Lead", "Founder",
  "Marketing Director", "Customer Success Lead", "Enterprise AE", "Regional Director",
  "Head of Marketing", "VP Business", "SDR Manager", "Sales Ops", "Head of Partnerships",
];

const SOURCES = [
  "manual", "csv", "linkedin_extension", "booking", "inbound", "website",
] as const;

const { pipeline, priorities } = SCREENSHOT_DASHBOARD_STATS;

/** Ordered status pool — pipeline stages first, then closings / lost / invite overflow. */
function buildStatusPool(): string[] {
  const { contacted, qualified, rdv, proposal } = pipeline;
  const closings = SCREENSHOT_DASHBOARD_STATS.kpi.closings;
  const overflow = SCREENSHOT_PROSPECT_COUNT - pipeline.activeTotal - closings - 16;
  return [
    ...Array(contacted).fill("contacted"),
    ...Array(qualified).fill("qualified"),
    ...Array(rdv).fill("rdv"),
    ...Array(proposal).fill("proposal"),
    ...Array(closings).fill("won"),
    ...Array(16).fill("lost"),
    ...Array(Math.max(0, overflow)).fill("new"),
  ];
}

const STATUS_POOL = buildStatusPool();

const PROPOSAL_START = pipeline.contacted + pipeline.qualified + pipeline.rdv;
const PROPOSAL_END = PROPOSAL_START + pipeline.proposal;
const WON_START = PROPOSAL_END;
const WON_END = WON_START + SCREENSHOT_DASHBOARD_STATS.kpi.closings;

export function buildProspectSeeds(count = SCREENSHOT_PROSPECT_COUNT): ProspectSeed[] {
  const seeds: ProspectSeed[] = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 3 + 7) % LAST.length]!;
    const name = `${first} ${last}`;
    const company = COMPANIES[i % COMPANIES.length]!;
    const status = STATUS_POOL[i] ?? "new";
    const source = SOURCES[i % SOURCES.length]!;
    const createdDaysAgo = 2 + (i % 150);

    let lastContactDaysAgo: number;
    if (status === "proposal") {
      const proposalIndex = i - PROPOSAL_START;
      lastContactDaysAgo =
        proposalIndex < priorities.proposalsToFollow
          ? 3 + (proposalIndex % 6)
          : 0;
    } else if (status === "won" || status === "lost") {
      lastContactDaysAgo = 2 + ((i - WON_START) % 20);
    } else {
      lastContactDaysAgo = i % 14;
    }

    seeds.push({
      name,
      company,
      jobTitle: JOB_TITLES[i % JOB_TITLES.length]!,
      status,
      source,
      bddIndex: i % 6 === 0 ? undefined : i % BDD_NAMES.length,
      createdDaysAgo,
      lastContactDaysAgo,
      hasLinkedin: i % 4 !== 3,
      hasWhatsapp: i % 3 !== 2,
      hasBooking: status === "rdv" || status === "proposal" || i % 5 === 0,
      inWorkflow: i % 6 === 0 ? "running" : i % 9 === 0 ? "paused" : undefined,
      workflowStep: (i % 4) + 1,
    });
  }
  return seeds;
}

export function avatarUrl(seed: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

export function daysAgo(days: number, hour = 12, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function endOfTodayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function daysAgoInMonth(daysAgoVal: number, hour = 10): string {
  return daysAgo(daysAgoVal, hour);
}

/**
 * Week index for activity-volume buckets (dashboard stats route):
 *   0 = oldest week (~7 weeks ago), 7 = current week.
 */
export function daysAgoForActivityWeek(weekIndex: number, hour = 11): string {
  const weeksAgo = 7 - weekIndex;
  return daysAgo(weeksAgo * 7 + 3, hour);
}

export const FUNNEL_TIER_COUNTS = {
  invitations: SCREENSHOT_DASHBOARD_STATS.funnel.invitations,
  accepted: SCREENSHOT_DASHBOARD_STATS.funnel.accepted,
  conversations: SCREENSHOT_DASHBOARD_STATS.funnel.conversations,
  rdvs: SCREENSHOT_DASHBOARD_STATS.funnel.rdvs,
  closings: SCREENSHOT_DASHBOARD_STATS.funnel.closings,
} as const;

/**
 * LinkedIn invites — both activity flavours the dashboard reads:
 *   • workflow_step_completed / linkedin_invite  → KPI invitations
 *   • linkedin_invite_sent                       → funnel invitations
 */
export function buildFunnelInviteRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
  jobIds: string[] = [],
): Array<Record<string, unknown>> {
  const n = Math.min(FUNNEL_TIER_COUNTS.invitations, prospectIds.length);
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < n; i++) {
    const inviteDay = 2 + (i % 26);
    const createdAt = daysAgo(inviteDay, 9 + (i % 7));
    const pid = prospectIds[i]!;
    const jobId = jobIds[i % Math.max(1, jobIds.length)];

    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      actor_id: userId,
      action: "workflow_step_completed",
      details: { step_type: "linkedin_invite" },
      created_at: createdAt,
    });
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      actor_id: userId,
      action: "linkedin_invite_sent",
      campaign_job_id: jobId ?? null,
      created_at: createdAt,
    });
  }
  return rows;
}

/** Outbound LinkedIn messages — denominator for response-rate KPI. */
export function buildLinkedInMessageRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
): Array<Record<string, unknown>> {
  const n = Math.min(
    SCREENSHOT_DASHBOARD_STATS.kpi.linkedinMessages,
    prospectIds.length,
  );
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < n; i++) {
    const day = 2 + (i % 26);
    rows.push({
      organization_id: orgId,
      prospect_id: prospectIds[i]!,
      actor_id: userId,
      action: "workflow_step_completed",
      details: { step_type: "linkedin_message" },
      created_at: daysAgo(day, 14 + (i % 5)),
    });
  }
  return rows;
}

/** Distinct invite acceptances for acceptance-rate KPI. */
export function buildLinkedInAcceptanceRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
  jobIds: string[] = [],
): Array<Record<string, unknown>> {
  const n = Math.min(
    SCREENSHOT_DASHBOARD_STATS.kpi.linkedinAcceptances,
    prospectIds.length,
  );
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < n; i++) {
    const day = 3 + (i % 24);
    rows.push({
      organization_id: orgId,
      prospect_id: prospectIds[i]!,
      actor_id: userId,
      action: "linkedin_invite_accepted",
      campaign_job_id: jobIds[i % Math.max(1, jobIds.length)] ?? null,
      created_at: daysAgo(day, 11 + (i % 6)),
    });
  }
  return rows;
}

/**
 * Unipile chats aligned with funnel + cockpit priorities:
 *   • 0..206  — accepted (chat opened in last 30d)
 *   • 0..77   — replied in last 30d (funnel conversations)
 *   • 0..17   — replied in last 7d (priorities « réponses récentes »)
 *   • 18..40  — replied 10–45d ago (priorities « silence > 7j »)
 */
export function buildFunnelChatRows(
  orgId: string,
  prospectIds: string[],
): Array<{
  organization_id: string;
  prospect_id: string;
  unipile_chat_id: string;
  created_at: string;
  last_inbound_at: string | null;
}> {
  const { accepted, conversations } = FUNNEL_TIER_COUNTS;
  const { recentResponses, staleConversations } = priorities;

  const rows: Array<{
    organization_id: string;
    prospect_id: string;
    unipile_chat_id: string;
    created_at: string;
    last_inbound_at: string | null;
  }> = [];

  for (let i = 0; i < accepted; i++) {
    const pid = prospectIds[i];
    if (!pid) break;
    const inviteDay = 4 + (i % 24);
    const chatDay = Math.max(1, inviteDay - 2);
    const hasReply = i < conversations;
    let lastInbound: string | null = null;
    if (hasReply) {
      if (i < recentResponses) {
        lastInbound = daysAgo(i % 6, 15 + (i % 4));
      } else if (i < recentResponses + staleConversations) {
        lastInbound = daysAgo(10 + ((i - recentResponses) % 35), 15 + (i % 4));
      } else {
        lastInbound = daysAgo(8 + ((i - recentResponses) % 22), 15 + (i % 4));
      }
    }
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      unipile_chat_id: `funnel-chat-${String(i + 1).padStart(3, "0")}`,
      created_at: daysAgo(chatDay, 11 + (i % 5)),
      last_inbound_at: lastInbound,
    });
  }

  prospectIds.slice(accepted).forEach((pid, j) => {
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      unipile_chat_id: `extra-chat-${String(j + 1).padStart(3, "0")}`,
      created_at: daysAgo(50 + (j % 20)),
      last_inbound_at: j % 5 === 0 ? daysAgo(40 + (j % 10)) : null,
    });
  });

  return rows;
}

/** RDV events for funnel (created_at in window) — excludes today's cockpit RDVs. */
export function buildFunnelRdvRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const nonTodayCount = FUNNEL_TIER_COUNTS.rdvs - priorities.rdvToday;
  const offset = priorities.rdvToday;

  const cycleDays = SCREENSHOT_DASHBOARD_STATS.funnel.avgCycleDays;

  for (let i = 0; i < nonTodayCount; i++) {
    const prospectIndex = offset + i;
    const pid = prospectIds[prospectIndex];
    if (!pid) break;
    const inviteDay = 2 + (prospectIndex % 26);
    const rdvDay = Math.max(2, inviteDay - cycleDays);
    const start = daysAgo(rdvDay, 10 + (i % 6));
    const end = daysAgo(rdvDay, 11 + (i % 6));
    rows.push({
      organization_id: orgId,
      title: `RDV funnel — ${i + 1}`,
      start_time: start,
      end_time: end,
      prospect_id: pid,
      status: "confirmed",
      meeting_kind: "meet",
      event_type: "meeting",
      is_all_day: false,
      source: "andoxa",
      created_by: userId,
      created_at: daysAgo(rdvDay + 1, 9),
    });
  }
  return rows;
}

/** Won prospects that count as funnel closings (indices in the status pool). */
export function funnelClosingProspectIds(prospectIds: string[]): string[] {
  return prospectIds.slice(WON_START, WON_END);
}

/** Outcomes used by /api/call-sessions list stats and the session UI. */
export type CallSessionOutcome = "rdv" | "callback" | "noanswer" | "wrong" | "refused";

export type CallSessionProspectSeed = {
  status: "pending" | "calling" | "completed" | "skipped";
  outcome: CallSessionOutcome | null;
  call_duration_s: number;
  called_at: string | null;
};

export function buildCallSessionProspectRows(
  sessionId: string,
  prospectIds: string[],
  plan: {
    total: number;
    processed: number;
    rdv: number;
    noanswer: number;
    callback: number;
    refused: number;
    wrong: number;
    calling?: number;
  },
): Array<Record<string, unknown>> {
  const ids = prospectIds.slice(0, plan.total);
  const rows: CallSessionProspectSeed[] = [];

  const push = (seed: CallSessionProspectSeed) => rows.push(seed);

  const calling = plan.calling ?? 1;
  for (let i = 0; i < calling; i++) {
    push({ status: "calling", outcome: null, call_duration_s: 0, called_at: null });
  }

  const pending = plan.total - plan.processed - calling;
  for (let i = 0; i < pending; i++) {
    push({ status: "pending", outcome: null, call_duration_s: 0, called_at: null });
  }

  const outcomes: CallSessionOutcome[] = [
    ...Array(plan.rdv).fill("rdv" as const),
    ...Array(plan.noanswer).fill("noanswer" as const),
    ...Array(plan.callback).fill("callback" as const),
    ...Array(plan.refused).fill("refused" as const),
    ...Array(plan.wrong).fill("wrong" as const),
  ];
  if (outcomes.length !== plan.processed) {
    throw new Error(
      `call session plan: outcomes (${outcomes.length}) must equal processed (${plan.processed})`,
    );
  }

  outcomes.forEach((outcome, i) => {
    const duration = outcome === "noanswer" ? 0 : 75 + (i % 6) * 22;
    push({
      status: "completed",
      outcome,
      call_duration_s: duration,
      called_at: daysAgo(1 + (i % 4), 9 + (i % 7)),
    });
  });

  return ids.map((prospect_id, i) => {
    const row = rows[i]!;
    return {
      call_session_id: sessionId,
      prospect_id,
      status: row.status,
      call_duration_s: row.call_duration_s,
      called_at: row.called_at,
      outcome: row.outcome,
    };
  });
}

export const CAMPAIGN_JOB_DEFS = [
  { type: "invite_with_note" as const, status: "running" as const, name: "Invitations Q2 — ICP SaaS", total: 420, processed: 312, success: 268, errors: 6, createdDaysAgo: 42, startedDaysAgo: 41 },
  { type: "invite" as const, status: "running" as const, name: "Connect — Dirigeants PME", total: 280, processed: 198, success: 142, errors: 5, createdDaysAgo: 28, startedDaysAgo: 27 },
  { type: "contact" as const, status: "paused" as const, name: "Relance décideurs", total: 156, processed: 112, success: 68, errors: 3, createdDaysAgo: 21, startedDaysAgo: 20 },
  { type: "contact" as const, status: "completed" as const, name: "Messages post-acceptation", total: 124, processed: 124, success: 82, errors: 2, createdDaysAgo: 55, startedDaysAgo: 54 },
  { type: "invite_with_note" as const, status: "completed" as const, name: "Salon VivaTech — follow-up", total: 186, processed: 186, success: 128, errors: 6, createdDaysAgo: 68, startedDaysAgo: 67 },
  { type: "contact" as const, status: "running" as const, name: "Séquence inbound webinar", total: 142, processed: 86, success: 54, errors: 2, createdDaysAgo: 12, startedDaysAgo: 11 },
  { type: "invite" as const, status: "paused" as const, name: "Expansion Nord", total: 240, processed: 118, success: 76, errors: 7, createdDaysAgo: 18, startedDaysAgo: 17 },
  { type: "invite_with_note" as const, status: "completed" as const, name: "CMO SaaS — Paris", total: 168, processed: 168, success: 112, errors: 4, createdDaysAgo: 45, startedDaysAgo: 44 },
  { type: "contact" as const, status: "running" as const, name: "Relance proposition Q2", total: 88, processed: 52, success: 31, errors: 1, createdDaysAgo: 8, startedDaysAgo: 7 },
  { type: "invite" as const, status: "completed" as const, name: "LinkedIn ABM FinTech", total: 132, processed: 132, success: 89, errors: 3, createdDaysAgo: 72, startedDaysAgo: 71 },
];

/**
 * Activity rows for the 8-week volume chart.
 * Workflow linkedin_message rows (KPI denominator) also land in this window,
 * so outbound-only rows are scaled to keep the chart total at 1180.
 */
export function buildActivityVolumeMessageRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const weeklyTarget = SCREENSHOT_DASHBOARD_STATS.activityVolume.messages;
  const kpiMessages = SCREENSHOT_DASHBOARD_STATS.kpi.linkedinMessages;
  const chartTotal = weeklyTarget.reduce((s, n) => s + n, 0);
  const outboundTotal = chartTotal - kpiMessages;
  const scale = outboundTotal / chartTotal;

  let prospectCursor = 0;
  let allocated = 0;

  weeklyTarget.forEach((count, weekIndex) => {
    const weekOutbound =
      weekIndex === weeklyTarget.length - 1
        ? outboundTotal - allocated
        : Math.round(count * scale);
    allocated += weekOutbound;

    for (let i = 0; i < weekOutbound; i++) {
      const pid = prospectIds[prospectCursor % prospectIds.length]!;
      prospectCursor++;
      rows.push({
        organization_id: orgId,
        prospect_id: pid,
        actor_id: userId,
        action: "linkedin_message_outbound",
        created_at: daysAgoForActivityWeek(weekIndex, 10 + (i % 8)),
      });
    }
  });

  return rows;
}

/**
 * One call_session row = one « appel » on the volume chart.
 * Returns lightweight session stubs (no prospect rows required).
 */
export function buildActivityVolumeCallSessions(): Array<{
  title: string;
  createdAt: string;
}> {
  const weekly = SCREENSHOT_DASHBOARD_STATS.activityVolume.calls;
  const sessions: Array<{ title: string; createdAt: string }> = [];

  weekly.forEach((callCount, weekIndex) => {
    for (let i = 0; i < callCount; i++) {
      sessions.push({
        title: `Appel vol. S${weekIndex + 1} #${i + 1}`,
        createdAt: daysAgoForActivityWeek(weekIndex, 9 + (i % 6)),
      });
    }
  });

  return sessions;
}

export function buildActivityVolumeBookingRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const weekly = SCREENSHOT_DASHBOARD_STATS.activityVolume.rdv;
  let prospectCursor = 200;

  weekly.forEach((count, weekIndex) => {
    for (let i = 0; i < count; i++) {
      const pid = prospectIds[prospectCursor % prospectIds.length]!;
      prospectCursor++;
      const createdAt = daysAgoForActivityWeek(weekIndex, 12 + (i % 4));
      rows.push({
        organization_id: orgId,
        prospect_id: pid,
        booked_by: userId,
        booked_at: createdAt,
        scheduled_for: endOfTodayAt(14 + (i % 4)),
        created_at: createdAt,
      });
    }
  });

  return rows;
}

/** Status-change rows for closings KPI + funnel closings step. */
export function buildClosingActivityRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
): Array<Record<string, unknown>> {
  const ids = funnelClosingProspectIds(prospectIds);
  return ids.map((prospect_id, i) => ({
    organization_id: orgId,
    prospect_id,
    actor_id: userId,
    action: "status_change",
    details: { from: "proposal", to: "won" },
    created_at: daysAgo(4 + (i % 18), 16),
  }));
}

/** Residual timeline noise (not counted in dashboard aggregates). */
export function buildBulkActivityRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
  _jobIds: string[],
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (let i = 0; i < 24; i++) {
    const pid = prospectIds[(i + 80) % prospectIds.length]!;
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      actor_id: userId,
      action: "rdv_scheduled",
      created_at: daysAgo(40 + (i % 30), 13 + (i % 4)),
    });
  }

  return rows;
}

export function buildEventSlots(
  userId: string,
  colleagueIds: string[],
): Array<{
  title: string;
  hour: number;
  dayOffset: number;
  owner: string;
  attendees: string[];
  status: string;
  internal?: boolean;
}> {
  const team = colleagueIds;
  const slots: Array<{
    title: string;
    hour: number;
    dayOffset: number;
    owner: string;
    attendees: string[];
    status: string;
    internal?: boolean;
  }> = [];

  const todayMeetings = [
    "Démo Andoxa — NovaTech",
    "Discovery — DataFlow",
    "Closing FinEdge",
    "Point ScaleUp",
    "Relance CloudNine",
    "Suivi GrowthLab",
  ];
  todayMeetings.forEach((title, i) => {
    slots.push({
      title,
      hour: 9 + i * 2,
      dayOffset: 0,
      owner: i % 3 === 0 ? team[i % team.length]! : userId,
      attendees: i % 2 === 0 ? [team[(i + 1) % team.length]!] : [],
      status: "confirmed",
    });
  });

  for (let d = 1; d <= 3; d++) {
    slots.push({
      title: `Sync équipe — J${d}`,
      hour: 9 + d,
      dayOffset: d,
      owner: team[d % team.length]!,
      attendees: [userId],
      status: "internal",
      internal: true,
    });
  }

  ["Point pipeline", "Weekly sales", "RevOps sync", "Forecast Q2"].forEach(
    (title, i) => {
      slots.push({
        title,
        hour: 9 + i,
        dayOffset: i + 1,
        owner: team[i % team.length]!,
        attendees: [userId, team[(i + 2) % team.length]!],
        status: "internal",
        internal: true,
      });
    },
  );

  for (let i = 0; i < 35; i++) {
    slots.push({
      title: `RDV passé #${i + 1}`,
      hour: 10 + (i % 6),
      dayOffset: -(32 + (i % 25)),
      owner: i % 2 === 0 ? userId : team[i % team.length]!,
      attendees: [],
      status: i % 7 === 0 ? "noshow" : "done",
    });
  }

  return slots;
}
