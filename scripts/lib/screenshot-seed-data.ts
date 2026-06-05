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

// WhatsApp is gated off, so seeded prospects never use it as a source.
const SOURCES = [
  "manual", "csv", "linkedin_extension", "booking", "inbound", "website",
] as const;

/** Weighted status distribution ≈ 220 active pipeline prospects for a 10-person team. */
const STATUS_POOL: string[] = [
  ...Array(28).fill("new"),
  ...Array(24).fill("contacted"),
  ...Array(42).fill("qualified"),
  ...Array(32).fill("rdv"),
  ...Array(26).fill("proposal"),
  ...Array(22).fill("won"),
  ...Array(16).fill("lost"),
];

export function buildProspectSeeds(count = 220): ProspectSeed[] {
  const seeds: ProspectSeed[] = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 3 + 7) % LAST.length]!;
    const name = `${first} ${last}`;
    const company = COMPANIES[i % COMPANIES.length]!;
    const status = STATUS_POOL[i % STATUS_POOL.length]!;
    const source = SOURCES[i % SOURCES.length]!;
    const createdDaysAgo = 2 + (i % 150);
    const lastContactDaysAgo =
      status === "proposal" && i % 2 === 0
        ? 3 + (i % 8)
        : status === "won" || status === "lost"
          ? 15 + (i % 60)
          : i % 14;

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
 * Funnel card tiers (current month) — each step is a subset of the previous.
 * Counts target realistic conversion for a 10-person sales team.
 */
export const FUNNEL_TIER_COUNTS = {
  invitations: 186,
  accepted: 98,
  conversations: 72,
  rdvs: 38,
  closings: 11,
} as const;

/** workflow_step_completed / linkedin_invite — one row per invited prospect. */
export function buildFunnelInviteRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
): Array<Record<string, unknown>> {
  const n = Math.min(FUNNEL_TIER_COUNTS.invitations, prospectIds.length);
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < n; i++) {
    const inviteDay = 4 + (i % 24);
    rows.push({
      organization_id: orgId,
      prospect_id: prospectIds[i]!,
      actor_id: userId,
      action: "workflow_step_completed",
      details: { step_type: "linkedin_invite" },
      created_at: daysAgo(inviteDay, 9 + (i % 7)),
    });
  }
  return rows;
}

/**
 * Unipile chats aligned with funnel tiers:
 *   • 0..97  — chat opened this month (acceptances) after their invite
 *   • 0..71  — also replied this month (conversations)
 *   • 98+    — stale / out-of-funnel chats for other dashboard widgets
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
  const rows: Array<{
    organization_id: string;
    prospect_id: string;
    unipile_chat_id: string;
    created_at: string;
    last_inbound_at: string | null;
  }> = [];

  for (let i = 0; i < FUNNEL_TIER_COUNTS.accepted; i++) {
    const pid = prospectIds[i];
    if (!pid) break;
    const inviteDay = 4 + (i % 24);
    const chatDay = Math.max(1, inviteDay - 2);
    const hasReply = i < FUNNEL_TIER_COUNTS.conversations;
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      unipile_chat_id: `funnel-chat-${String(i + 1).padStart(3, "0")}`,
      created_at: daysAgo(chatDay, 11 + (i % 5)),
      last_inbound_at: hasReply
        ? daysAgo(Math.max(0, chatDay - 3), 15 + (i % 4))
        : null,
    });
  }

  // Non-funnel chats (priorities / messagerie) — replies outside the current month
  prospectIds.slice(FUNNEL_TIER_COUNTS.invitations).forEach((pid, j) => {
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

/** Events whose end_time falls in the current month — funnel RDV step. */
export function buildFunnelRdvRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < FUNNEL_TIER_COUNTS.rdvs; i++) {
    const pid = prospectIds[i];
    if (!pid) break;
    const day = 2 + (i % 20);
    const start = daysAgo(day, 10 + (i % 6));
    const end = daysAgo(day, 11 + (i % 6));
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
    });
  }
  return rows;
}

/** Prospect IDs that should count as funnel closings (won + updated_at this month). */
export function funnelClosingProspectIds(prospectIds: string[]): string[] {
  return prospectIds.slice(0, FUNNEL_TIER_COUNTS.closings);
}

/** Outcomes used by /api/call-sessions list stats and the session UI. */
export type CallSessionOutcome = "rdv" | "callback" | "noanswer" | "wrong" | "refused";

export type CallSessionProspectSeed = {
  status: "pending" | "calling" | "completed" | "skipped";
  outcome: CallSessionOutcome | null;
  call_duration_s: number;
  called_at: string | null;
};

/**
 * Builds call_session_prospects rows with counts that match the campaigns
 * session card (processed / meetings / qualifications / pickup rate).
 */
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
    /** Prospect currently on the line (no outcome yet). */
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

/** Activity rows for dashboard + campaign KPIs — concentrated in the last 30 days. */
export function buildBulkActivityRows(
  orgId: string,
  userId: string,
  prospectIds: string[],
  jobIds: string[],
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  // LinkedIn invites + messages (current month heavy)
  for (let i = 0; i < 160; i++) {
    const pid = prospectIds[i % prospectIds.length]!;
    const jobId = jobIds[i % jobIds.length]!;
    const day = i % 28;
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      actor_id: userId,
      action: "linkedin_invite_sent",
      campaign_job_id: jobId,
      created_at: daysAgo(day, 9 + (i % 8)),
    });
    if (i % 2 === 0) {
      rows.push({
        organization_id: orgId,
        prospect_id: pid,
        actor_id: userId,
        action: "linkedin_invite_accepted",
        campaign_job_id: jobId,
        created_at: daysAgo(Math.max(0, day - 1), 11 + (i % 6)),
      });
    }
    if (i % 3 !== 2) {
      rows.push({
        organization_id: orgId,
        prospect_id: pid,
        actor_id: userId,
        action: "linkedin_message_outbound",
        campaign_job_id: jobId,
        created_at: daysAgo(Math.max(0, day - 2), 14 + (i % 5)),
      });
    }
    if (i % 4 === 0) {
      rows.push({
        organization_id: orgId,
        prospect_id: pid,
        actor_id: userId,
        action: "linkedin_message_inbound",
        campaign_job_id: jobId,
        created_at: daysAgo(Math.max(0, day - 3), 16 + (i % 4)),
      });
    }
  }

  // Workflow messages for LinkedIn dashboard block (not funnel invites)
  for (let i = 0; i < 80; i++) {
    const pid = prospectIds[(i + 40) % prospectIds.length]!;
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      actor_id: userId,
      action: "workflow_step_completed",
      details: { step_type: "linkedin_message" },
      created_at: daysAgo(i % 22, 15 + (i % 5)),
    });
  }

  // WhatsApp
  for (let i = 0; i < 80; i++) {
    const pid = prospectIds[(i + 40) % prospectIds.length]!;
    rows.push({
      organization_id: orgId,
      prospect_id: pid,
      actor_id: userId,
      action: i % 3 === 0 ? "whatsapp_message_inbound" : "whatsapp_message_outbound",
      created_at: daysAgo(i % 20, 11 + (i % 8)),
    });
  }

  // RDV scheduled (activity feed — separate from funnel events)
  for (let i = 0; i < 48; i++) {
    rows.push({
      organization_id: orgId,
      prospect_id: prospectIds[(i + 10) % prospectIds.length]!,
      actor_id: userId,
      action: "rdv_scheduled",
      created_at: daysAgo(i % 26, 13 + (i % 4)),
    });
  }

  // Closings (activity timeline — funnel closings use prospect.updated_at)
  for (let i = 0; i < 18; i++) {
    rows.push({
      organization_id: orgId,
      prospect_id: prospectIds[(i + 80) % prospectIds.length]!,
      actor_id: userId,
      action: "status_change",
      details: { from: "proposal", to: "won" },
      created_at: daysAgo(5 + i * 2, 17),
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

  // Today — 5 RDVs
  const todayMeetings = [
    "Démo Andoxa — NovaTech",
    "Discovery — DataFlow",
    "Closing FinEdge",
    "Point ScaleUp",
    "Relance CloudNine",
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

  // This week — internal only (prospect RDVs live in buildFunnelRdvRows)
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

  // Internal syncs
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

  // Past month (done / noshow) — end_time before current month for funnel separation
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
