// Andoxa Calendrier — types, helpers and static reference data.
// Dynamic week/event data comes from queries.ts.

export type WeekDay = {
  short: string;
  long: string;
  num: number;
  monthShort: string;   // "avr.", "mai", etc.
  monthFull: string;    // "avril", "mai", etc.
  date: string;         // "2026-04-27" ISO date
  isToday?: boolean;
  weekend?: boolean;
};

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  color: string;
  accent: string;
  isMe?: boolean;
};

export const TEAM: TeamMember[] = [
  { id: "me",      name: "Vous",           initials: "VO", color: "#0052D9", accent: "#E8F0FD", isMe: true },
  { id: "andreas", name: "Andréas BODIN",  initials: "AB", color: "#7C3AED", accent: "#EDE9FE" },
  { id: "lucile",  name: "Lucile MERCIER", initials: "LM", color: "#DB2777", accent: "#FCE7F3" },
  { id: "malik",   name: "Malik BENSAÏD",  initials: "MB", color: "#0891B2", accent: "#CFFAFE" },
  { id: "sarah",   name: "Sarah COHEN",    initials: "SC", color: "#EA580C", accent: "#FFE4D5" },
];

export const TEAM_BY_ID: Record<string, TeamMember> = Object.fromEntries(TEAM.map((m) => [m.id, m]));

export type EventType = "Discovery" | "Démo" | "Closing" | "Interne";
export type EventStatus = "confirmed" | "done" | "pending" | "noshow" | "internal";
export type MeetingKind = "meet" | "zoom" | "inperson" | "phone" | "other";

export type CalEvent = {
  id: string;
  day: number;
  owner: string;
  start: number;
  end: number;
  dateISO: string;          // "2026-04-27" — used for month-view filtering
  title: string;
  prospect: string | null;
  prospectId: string | null;
  prospectRole?: string;
  calendarId: string;   // "me" | "custom_xxx" — determines event color
  type: EventType | null; // kept for data compat; not exposed in UI
  company: string;
  channel: string;
  status: EventStatus;
  meeting: MeetingKind;
  wa: boolean;
  pipelineStage: string | null;
  lastAction: string;
  googleMeetUrl: string | null;
  gcalAttendees?: GcalAttendee[];
};

export type GcalAttendee = {
  email: string | null;
  name: string | null;
  responseStatus: string | null;
};

// ─── Calendar color map ───────────────────────────────────────────────────────

export type CalendarColorEntry = { color: string; tint: string; name: string };
export type CalendarColorMap = Record<string, CalendarColorEntry>;

export function buildCalendarColors(
  customCals: Array<{ id: string; name: string; color: string; accent: string }>,
  orgMembers: Array<{ id: string; name: string; color: string; accent: string }> = [],
): CalendarColorMap {
  const map: CalendarColorMap = {
    me: { color: "#0052D9", tint: "#E8F0FD", name: "Vous" },
    gcal: { color: "#4285F4", tint: "#E8F0FE", name: "Google Calendar" },
  };
  for (const cal of customCals) {
    map[cal.id] = { color: cal.color, tint: cal.accent, name: cal.name };
  }
  for (const m of orgMembers) {
    map[m.id] = { color: m.color, tint: m.accent, name: m.name };
  }
  return map;
}

export type TypeToken = { color: string; tint: string; text: string };

export const TYPES: Record<EventType, TypeToken> = {
  Discovery: { color: "#10B981", tint: "#ECFDF5", text: "#065F46" },
  Démo:      { color: "#7C3AED", tint: "#F5F3FF", text: "#5B21B6" },
  Closing:   { color: "#0052D9", tint: "#E8F0FD", text: "#1E3A8A" },
  Interne:   { color: "#64748B", tint: "#F1F5F9", text: "#334155" },
};

export type StatusToken = { label: string; pillBg: string; pillText: string };

export const STATUS_TOKENS: Record<EventStatus, StatusToken> = {
  confirmed: { label: "Confirmé",   pillBg: "#E8F0FD", pillText: "#0052D9" },
  done:      { label: "Réalisé",    pillBg: "#D1FAE5", pillText: "#047857" },
  pending:   { label: "En attente", pillBg: "#FEF3C7", pillText: "#92400E" },
  noshow:    { label: "No-show",    pillBg: "#FEE2E2", pillText: "#B91C1C" },
  internal:  { label: "Interne",    pillBg: "#F1F5F9", pillText: "#334155" },
};

export const PROSPECT_ACTIVITY = {
  default: [
    { label: "Premier échange",    date: "4 nov. 2025" },
    { label: "Booking lien public",date: "20 avr. 2026" },
    { label: "Rappel J-1 WhatsApp",date: "Hier 18:02" },
  ],
};

const PASTEL_AVATARS = ["#E0E7FF","#FCE7F3","#FEF3C7","#D1FAE5","#E0F2FE","#FFE4E6","#EDE9FE","#FFEDD5"];

export function initials(name: string): string {
  if (!name) return "··";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function avatarColor(name: string): string {
  if (!name) return "#E2E8F0";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31 + name.charCodeAt(i)) >>> 0);
  return PASTEL_AVATARS[h % PASTEL_AVATARS.length];
}

export function fmtTime(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export type VisibilityMap = Record<string, boolean>;

// Static IDs only — member UUIDs default to visible (undefined !== false)
export const DEFAULT_VISIBILITY: VisibilityMap = {
  me: true,
  gcal: true,
  holidays: true,
  vacances: false,
};

// ─── Dynamic week helpers ─────────────────────────────────────────────────────

const MONTH_SHORTS  = ["jan.","fév.","mar.","avr.","mai","juin","juil.","août","sep.","oct.","nov.","déc."];
const MONTH_FULLS   = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const DAY_SHORTS    = ["LUN.","MAR.","MER.","JEU.","VEN.","SAM.","DIM."];
const DAY_LONGS     = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

export function getWeekStart(offsetWeeks: number = 0): Date {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const daysToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekDays(weekStart: Date): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const m = d.getMonth();
    const dCopy = new Date(d); dCopy.setHours(0, 0, 0, 0);
    return {
      short: DAY_SHORTS[i],
      long: DAY_LONGS[i],
      num: d.getDate(),
      monthShort: MONTH_SHORTS[m],
      monthFull: MONTH_FULLS[m],
      date: d.toISOString().split("T")[0],
      isToday: dCopy.getTime() === today.getTime(),
      weekend: i >= 5,
    };
  });
}

export function getNow(): { dayIdx: number; hour: number; minute: number } {
  const now = new Date();
  const dow = now.getDay();
  return {
    dayIdx: dow === 0 ? 6 : dow - 1,
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

export function fmtWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const sm = MONTH_FULLS[weekStart.getMonth()];
  const em = MONTH_FULLS[weekEnd.getMonth()];
  const sy = weekStart.getFullYear();
  const ey = weekEnd.getFullYear();
  if (sm === em) {
    return `${weekStart.getDate()} – ${weekEnd.getDate()} ${em} ${ey}`;
  }
  const yearSuffix = sy !== ey ? ` ${sy}` : "";
  return `${weekStart.getDate()} ${sm}${yearSuffix} – ${weekEnd.getDate()} ${em} ${ey}`;
}
