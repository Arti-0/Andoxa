import { randInt } from "./random";

/** Shape returned by GET /api/events (subset used by calendar grid). */
export interface MockCalendarDbEvent {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  prospect_id: string | null;
  location: string | null;
  is_all_day: boolean;
  created_by: string;
  google_meet_url: string | null;
  event_type: string | null;
  status: string;
  meeting_kind: string;
  wa_workflow: boolean;
  pipeline_stage: string | null;
  attendee_user_ids: string[] | null;
  internal_notes: string | null;
  source: string;
  prospect: {
    id: string;
    full_name: string | null;
    company: string | null;
  } | null;
}

export interface MockCalendarKpi {
  todayTotal: number;
  todayDone: number;
  weekTotal: number;
  weekDone: number;
  thirtyDayDone: number;
  prevThirtyDayDone: number;
}

const MEETING_TYPES = [
  "Démo Andoxa",
  "Discovery",
  "Démo produit",
  "Closing",
  "Relance proposition",
  "RDV inbound",
  "Suivi décision",
  "Onboarding",
  "Point Q2",
  "Renouvellement",
  "Négociation finale",
  "Intro partenaire",
];

const COMPANIES = [
  "NovaTech",
  "DataFlow",
  "FinEdge",
  "ScaleUp",
  "CloudNine",
  "RevOps",
  "SaaSify",
  "GrowthLab",
  "Paystack FR",
  "MediCore",
  "LogiTrans",
  "GreenLedger",
  "TalentHub",
  "CyberShield",
];

const PROSPECTS = [
  "Sophie Martin",
  "Thomas Leroy",
  "Marc Dubois",
  "Camille Bernard",
  "Laura Moreau",
  "Nicolas Blanc",
  "Julie Petit",
  "Antoine Girard",
  "Émilie Rousseau",
  "Pierre Fontaine",
  "Sarah Cohen",
  "Malik Bensaïd",
  "Lucile Mercier",
  "Andréas Bodin",
];

const INTERNAL_TITLES = [
  "Sync équipe commerciale",
  "Weekly sales",
  "Point forecast Q2",
  "RevOps sync",
  "Préparation démo",
  "Handover SDR → AE",
  "Pipeline review",
  "Kick-off campagne",
  "Retour salon",
  "1:1 manager",
];

const DURATIONS_MIN = [25, 30, 45, 50, 60, 75, 90, 120];

/** morning = before 12:30, afternoon = from 13:00, full = both, flex = random bias */
type WorkPattern = "morning" | "afternoon" | "full" | "flex";

const WORK_PATTERNS: WorkPattern[] = ["morning", "afternoon", "full", "flex"];

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function mondayOf(d: Date): Date {
  const m = new Date(d);
  const dow = m.getDay();
  m.setDate(m.getDate() - (dow === 0 ? 6 : dow - 1));
  m.setHours(0, 0, 0, 0);
  return m;
}

function atDayTime(baseMonday: Date, dayOffset: number, hour: number, minute: number): Date {
  const d = new Date(baseMonday);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

function randomMeeting(): { title: string; company: string; prospect: string } {
  const company = pick(COMPANIES);
  const type = pick(MEETING_TYPES);
  const prospect = pick(PROSPECTS);
  const title =
    randInt(0, 3) === 0
      ? `${type} — ${company}`
      : randInt(0, 1) === 0
        ? `${type} · ${prospect}`
        : `${prospect} (${company})`;
  return { title, company, prospect };
}

interface OwnerSchedule {
  pattern: WorkPattern;
  worksWeekends: boolean;
  /** 0=Mon … 6=Sun */
  blockedDays: Set<number>;
}

function ownerSchedule(ownerIndex: number, ownerId: string): OwnerSchedule {
  const pattern = WORK_PATTERNS[ownerIndex % WORK_PATTERNS.length]!;
  const worksWeekends = ownerIndex % 3 !== 1;
  const blockedDays = new Set<number>();
  if (ownerIndex % 4 === 0) blockedDays.add(3);
  if (ownerIndex % 5 === 2) blockedDays.add(4);
  if (ownerId.length % 7 === 0) blockedDays.add(2);
  return { pattern, worksWeekends, blockedDays };
}

function timeWindow(pattern: WorkPattern): { startH: number; startM: number; endH: number; endM: number } {
  switch (pattern) {
    case "morning":
      return { startH: 8, startM: 0, endH: 12, endM: 0 };
    case "afternoon":
      return { startH: 13, startM: 30, endH: 18, endM: 30 };
    case "full":
      return { startH: 8, startM: 30, endH: 18, endM: 0 };
    case "flex":
      return randInt(0, 1) === 0
        ? { startH: 9, startM: 0, endH: 12, endM: 30 }
        : { startH: 14, startM: 0, endH: 18, endM: 0 };
  }
}

function randomStartInWindow(
  weekMonday: Date,
  day: number,
  window: ReturnType<typeof timeWindow>,
): Date {
  const startMin = window.startH * 60 + window.startM;
  const endMin = window.endH * 60 + window.endM - 30;
  const slot = randInt(startMin, Math.max(startMin, endMin));
  return atDayTime(weekMonday, day, Math.floor(slot / 60), slot % 60);
}

let mockEventSeq = 0;

function pushEvent(
  out: MockCalendarDbEvent[],
  opts: {
    orgId: string;
    owner: string;
    start: Date;
    durationMinutes?: number;
    status: string;
    title: string;
    internal?: boolean;
    prospect?: { company: string; prospect: string };
    attendees?: string[];
  },
): void {
  const duration = opts.durationMinutes ?? pick(DURATIONS_MIN);
  const end = new Date(opts.start);
  end.setMinutes(end.getMinutes() + duration);
  mockEventSeq += 1;
  out.push({
    id: `mock-cal-${String(mockEventSeq).padStart(4, "0")}`,
    organization_id: opts.orgId,
    title: opts.title,
    description: null,
    start_time: opts.start.toISOString(),
    end_time: end.toISOString(),
    prospect_id: opts.prospect ? `mock-prospect-${mockEventSeq}` : null,
    location: null,
    is_all_day: false,
    created_by: opts.owner,
    google_meet_url: opts.internal ? null : "https://meet.google.com/mock-andoxa",
    event_type: opts.internal ? "internal" : "meeting",
    status: opts.internal ? "internal" : opts.status,
    meeting_kind: opts.internal ? "other" : duration <= 35 ? "phone" : "meet",
    wa_workflow: !opts.internal && randInt(0, 4) === 0,
    pipeline_stage: opts.internal ? null : pick(["rdv", "proposal", "qualified", "new"]),
    attendee_user_ids: opts.attendees ?? [],
    internal_notes: null,
    source: "andoxa",
    prospect: opts.prospect
      ? {
          id: `mock-prospect-${mockEventSeq}`,
          full_name: opts.prospect.prospect,
          company: opts.prospect.company,
        }
      : null,
  });
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function generateOwnerWeekEvents(
  out: MockCalendarDbEvent[],
  opts: {
    orgId: string;
    owner: string;
    ownerIndex: number;
    weekMonday: Date;
    rangeStart: Date;
    rangeEnd: Date;
    userId: string;
    colleagueIds: string[];
  },
): void {
  const { orgId, owner, ownerIndex, weekMonday, rangeStart, rangeEnd, userId, colleagueIds } =
    opts;
  const schedule = ownerSchedule(ownerIndex, owner);
  const window = timeWindow(schedule.pattern);
  const booked: Array<{ start: Date; end: Date }> = [];

  const days: number[] = [];
  for (let d = 0; d <= 6; d++) {
    if (schedule.blockedDays.has(d)) continue;
    if (d >= 5 && !schedule.worksWeekends) continue;
    days.push(d);
  }

  const eventCount = randInt(
    schedule.worksWeekends ? 10 : 8,
    schedule.worksWeekends ? 16 : 13,
  );
  const internalRatio = randInt(15, 35) / 100;

  let attempts = 0;
  while (booked.length < eventCount && attempts < eventCount * 8) {
    attempts += 1;
    const day = pick(days);
    const isWeekend = day >= 5;
    const dayWindow = isWeekend
      ? { startH: 10, startM: 0, endH: 16, endM: 0 }
      : window;

    const start = randomStartInWindow(weekMonday, day, dayWindow);
    if (!inRange(start.toISOString(), rangeStart, rangeEnd)) continue;

    const duration = pick(DURATIONS_MIN);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    if (booked.some((b) => overlaps(start, end, b.start, b.end))) continue;

    booked.push({ start, end });

    const isInternal = Math.random() < internalRatio;
    const status =
      start < new Date() && randInt(0, 2) !== 2
        ? "done"
        : pick(["confirmed", "confirmed", "confirmed", "pending"]);

    if (isInternal) {
      pushEvent(out, {
        orgId,
        owner,
        start,
        durationMinutes: duration,
        internal: true,
        status: "internal",
        title: pick(INTERNAL_TITLES),
        attendees:
          owner === userId && colleagueIds.length > 0
            ? colleagueIds.slice(0, randInt(1, Math.min(2, colleagueIds.length)))
            : colleagueIds.length > 0 && randInt(0, 1) === 0
              ? [userId]
              : [],
      });
    } else {
      const m = randomMeeting();
      pushEvent(out, {
        orgId,
        owner,
        start,
        durationMinutes: duration,
        status,
        title: m.title,
        prospect: { company: m.company, prospect: m.prospect },
        attendees:
          colleagueIds.length > 0 && randInt(0, 3) === 0
            ? [pick(colleagueIds)]
            : [],
      });
    }
  }
}

/**
 * Generates Andoxa calendar rows for the requested range. Each org member
 * (current user + colleagues) gets their own events on the visible week.
 */
export function generateMockCalendarEvents(params: {
  rangeStart: Date;
  rangeEnd: Date;
  orgId: string;
  userId: string;
  colleagueIds: string[];
}): MockCalendarDbEvent[] {
  mockEventSeq = 0;
  const { rangeStart, rangeEnd, orgId, userId, colleagueIds } = params;
  const weekMonday = mondayOf(rangeStart);
  const owners = [userId, ...colleagueIds];
  const out: MockCalendarDbEvent[] = [];

  for (let oi = 0; oi < owners.length; oi++) {
    generateOwnerWeekEvents(out, {
      orgId,
      owner: owners[oi]!,
      ownerIndex: oi,
      weekMonday,
      rangeStart,
      rangeEnd,
      userId,
      colleagueIds,
    });
  }

  const now = new Date();
  for (let i = 0; i < randInt(42, 68); i++) {
    const daysAgo = 3 + (i % 58);
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(randInt(8, 17), pick([0, 15, 30, 45]), 0, 0);
    if (!inRange(start.toISOString(), rangeStart, rangeEnd)) continue;
    const m = randomMeeting();
    pushEvent(out, {
      orgId,
      owner: owners[i % owners.length]!,
      start,
      durationMinutes: pick(DURATIONS_MIN),
      status: "done",
      title: m.title,
      prospect: { company: m.company, prospect: m.prospect },
    });
  }

  return out.sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
}

export function kpiFromMockCalendarEvents(
  items: MockCalendarDbEvent[],
  now = new Date(),
): MockCalendarKpi {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = mondayOf(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(now.getDate() - 30);
  const sixtyAgo = new Date(now);
  sixtyAgo.setDate(now.getDate() - 60);

  const rdvLike = items.filter(
    (e) => e.status !== "internal" && !e.is_all_day,
  );

  const todayEvents = rdvLike.filter((e) =>
    inRange(e.start_time, todayStart, new Date(todayEnd.getTime() + 1)),
  );
  const weekEvents = rdvLike.filter((e) =>
    inRange(e.start_time, weekStart, weekEnd),
  );
  const thirtyDone = rdvLike.filter(
    (e) =>
      e.status === "done" &&
      new Date(e.start_time) >= thirtyAgo &&
      new Date(e.start_time) <= now,
  );
  const prevThirtyDone = rdvLike.filter(
    (e) =>
      e.status === "done" &&
      new Date(e.start_time) >= sixtyAgo &&
      new Date(e.start_time) < thirtyAgo,
  );

  const todayTotal = todayEvents.length || randInt(4, 7);
  const todayDone =
    todayEvents.filter((e) => e.status === "done").length ||
    randInt(1, Math.max(2, todayTotal - 2));
  const weekTotal = weekEvents.length || randInt(18, 28);
  const weekDone =
    weekEvents.filter((e) => e.status === "done").length ||
    randInt(8, Math.max(10, weekTotal - 6));

  return {
    todayTotal,
    todayDone: Math.min(todayDone, todayTotal),
    weekTotal,
    weekDone: Math.min(weekDone, weekTotal),
    thirtyDayDone: thirtyDone.length || randInt(38, 72),
    prevThirtyDayDone: prevThirtyDone.length || randInt(28, 58),
  };
}

export function mockCalendarKpiBundle(now = new Date()): MockCalendarKpi {
  const weekStart = mondayOf(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const items = generateMockCalendarEvents({
    rangeStart: weekStart,
    rangeEnd: weekEnd,
    orgId: "mock-org",
    userId: "mock-user",
    colleagueIds: ["mock-col-1", "mock-col-2", "mock-col-3"],
  });
  return kpiFromMockCalendarEvents(items, now);
}
