// Mock data for the Campagnes & Appels design preview.
// Will be progressively replaced by `queries.ts` (live API).

export type CampaignStatus =
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "draft"
  | "ready";

export type Channel = "linkedin" | "whatsapp" | "phone";

export type CampaignType =
  | "invitation"
  | "message"
  | "invitation_message"
  | "whatsapp_message";

export interface Campaign {
  id: string;
  kind: "campaign";
  name: string;
  channel: Channel;
  type: CampaignType;
  status: CampaignStatus;
  total: number;
  processed: number;
  accepted: number;
  replied: number;
  meetings: number;
  launchedAt: string | null;
  creator: string;
  creatorName: string;
}

export interface CallSession {
  id: string;
  kind: "session";
  name: string;
  channel: "phone";
  status: CampaignStatus;
  date: string;
  total: number;
  processed: number;
  meetings: number;
  qualifications: number;
  pickupRate: number | null;
  creator: string;
  creatorName: string;
}

export type Item = Campaign | CallSession;

export interface Creator {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export const CREATORS: Creator[] = [
  { id: "sb", name: "Sebastian Bodin", initials: "SB", color: "#0052D9" },
  { id: "an", name: "Andréas Bodin", initials: "AB", color: "#FF6700" },
  { id: "ml", name: "Marie Lambert", initials: "ML", color: "#5B2EBF" },
  { id: "tr", name: "Thomas Roux", initials: "TR", color: "#0E7A3A" },
];

export const CREATOR_KPI_SHARE: Record<string, number> = {
  sb: 0.42,
  an: 0.28,
  ml: 0.18,
  tr: 0.12,
};

const daysAgo = (n: number): string => {
  const d = new Date("2026-05-06T10:00:00");
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: "c1", kind: "campaign", name: "Prospection CTO SaaS Q2", channel: "linkedin", type: "invitation", status: "running", total: 240, processed: 187, accepted: 86, replied: 0, meetings: 12, launchedAt: daysAgo(2), creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "c2", kind: "campaign", name: "Invitations Head of Sales — Fintech", channel: "linkedin", type: "invitation", status: "completed", total: 150, processed: 150, accepted: 47, replied: 0, meetings: 6, launchedAt: daysAgo(11), creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "c3", kind: "campaign", name: "Invitations VP Marketing — DACH", channel: "linkedin", type: "invitation", status: "failed", total: 80, processed: 23, accepted: 1, replied: 0, meetings: 0, launchedAt: daysAgo(18), creator: "an", creatorName: "Andréas Bodin" },
  { id: "c4", kind: "campaign", name: "Relance leads MQL février", channel: "linkedin", type: "message", status: "running", total: 92, processed: 64, accepted: 0, replied: 28, meetings: 9, launchedAt: daysAgo(4), creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "c5", kind: "campaign", name: "Réactivation comptes dormants", channel: "linkedin", type: "message", status: "paused", total: 60, processed: 22, accepted: 0, replied: 7, meetings: 2, launchedAt: daysAgo(7), creator: "an", creatorName: "Andréas Bodin" },
  { id: "c6", kind: "campaign", name: "Annonce v2 produit — early users", channel: "linkedin", type: "message", status: "draft", total: 45, processed: 0, accepted: 0, replied: 0, meetings: 0, launchedAt: null, creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "c7", kind: "campaign", name: "Outbound CFO scale-ups B2B", channel: "linkedin", type: "invitation_message", status: "running", total: 320, processed: 198, accepted: 91, replied: 34, meetings: 14, launchedAt: daysAgo(6), creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "c8", kind: "campaign", name: "Séquence VP Engineering Series B", channel: "linkedin", type: "invitation_message", status: "completed", total: 180, processed: 180, accepted: 78, replied: 41, meetings: 22, launchedAt: daysAgo(22), creator: "an", creatorName: "Andréas Bodin" },
  { id: "c9", kind: "campaign", name: "Activation freemium WhatsApp", channel: "whatsapp", type: "whatsapp_message", status: "running", total: 140, processed: 88, accepted: 0, replied: 39, meetings: 7, launchedAt: daysAgo(3), creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "c10", kind: "campaign", name: "Suivi démos no-show", channel: "whatsapp", type: "whatsapp_message", status: "paused", total: 35, processed: 18, accepted: 0, replied: 4, meetings: 1, launchedAt: daysAgo(9), creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "c11", kind: "campaign", name: "Relance proposals expirées", channel: "whatsapp", type: "whatsapp_message", status: "completed", total: 28, processed: 28, accepted: 0, replied: 11, meetings: 4, launchedAt: daysAgo(15), creator: "an", creatorName: "Andréas Bodin" },
  { id: "c12", kind: "campaign", name: "Confirmation RDV salon Tech&Co", channel: "whatsapp", type: "whatsapp_message", status: "draft", total: 56, processed: 0, accepted: 0, replied: 0, meetings: 0, launchedAt: null, creator: "sb", creatorName: "Sebastian Bodin" },
];

export const INITIAL_SESSIONS: CallSession[] = [
  { id: "s1", kind: "session", name: "Session 6 mai · Leads chauds", channel: "phone", status: "ready", date: daysAgo(0), total: 12, processed: 0, meetings: 0, qualifications: 0, pickupRate: null, creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "s2", kind: "session", name: "Session 5 mai · Trial expiring", channel: "phone", status: "running", date: daysAgo(1), total: 18, processed: 7, meetings: 2, qualifications: 4, pickupRate: 71, creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "s3", kind: "session", name: "Session 30 avr. · MQL T1", channel: "phone", status: "completed", date: daysAgo(6), total: 14, processed: 14, meetings: 4, qualifications: 9, pickupRate: 79, creator: "an", creatorName: "Andréas Bodin" },
  { id: "s4", kind: "session", name: "Session 24 avr. · Inbound demos", channel: "phone", status: "completed", date: daysAgo(12), total: 10, processed: 10, meetings: 5, qualifications: 8, pickupRate: 90, creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "s5", kind: "session", name: "Session 18 avr. · Renewals Q2", channel: "phone", status: "completed", date: daysAgo(18), total: 22, processed: 22, meetings: 3, qualifications: 11, pickupRate: 55, creator: "sb", creatorName: "Sebastian Bodin" },
  { id: "s6", kind: "session", name: "Session 11 avr. · Cold call CTO", channel: "phone", status: "completed", date: daysAgo(25), total: 30, processed: 30, meetings: 2, qualifications: 7, pickupRate: 43, creator: "an", creatorName: "Andréas Bodin" },
];

export type Period = "7" | "30" | "90" | "all";

export interface KpiEntry {
  value: number | null;
  unit?: string;
  delta: number | null;
  spark: number[];
}

export interface KpiSet {
  invitations: KpiEntry;
  acceptanceRate: KpiEntry;
  messages: KpiEntry;
  meetings: KpiEntry;
  calls: KpiEntry;
}

export const KPI_DATASETS: Record<Period, KpiSet> = {
  "7": {
    invitations: { value: 412, delta: 18.4, spark: [42, 51, 48, 64, 58, 71, 78] },
    acceptanceRate: { value: 34, unit: "%", delta: 2.1, spark: [29, 31, 30, 33, 32, 34, 36] },
    messages: { value: 287, delta: -4.2, spark: [48, 52, 41, 38, 44, 35, 29] },
    meetings: { value: 31, delta: 24.0, spark: [3, 4, 3, 5, 4, 6, 6] },
    calls: { value: 67, delta: 8.1, spark: [8, 11, 9, 12, 10, 8, 9] },
  },
  "30": {
    invitations: { value: 1684, delta: 12.7, spark: [180, 210, 195, 240, 260, 285, 314] },
    acceptanceRate: { value: 32, unit: "%", delta: 1.4, spark: [28, 29, 31, 30, 32, 31, 33] },
    messages: { value: 1129, delta: -2.1, spark: [195, 220, 168, 175, 160, 145, 166] },
    meetings: { value: 124, delta: 19.3, spark: [12, 16, 18, 20, 19, 22, 17] },
    calls: { value: 248, delta: 5.6, spark: [32, 38, 35, 42, 36, 33, 32] },
  },
  "90": {
    invitations: { value: 4928, delta: 9.8, spark: [520, 580, 610, 545, 620, 680, 730, 712, 805, 856] },
    acceptanceRate: { value: 31, unit: "%", delta: 0.8, spark: [29, 28, 30, 31, 30, 32, 31, 30, 32, 31] },
    messages: { value: 3287, delta: -1.4, spark: [380, 410, 350, 320, 305, 290, 310, 295, 322, 305] },
    meetings: { value: 358, delta: 16.2, spark: [28, 32, 35, 41, 38, 42, 39, 44, 36, 23] },
    calls: { value: 712, delta: 4.3, spark: [68, 72, 75, 80, 71, 68, 75, 70, 68, 65] },
  },
  all: {
    invitations: { value: 8412, delta: null, spark: [320, 410, 480, 520, 580, 610, 545, 620, 680, 730, 712, 805] },
    acceptanceRate: { value: 30, unit: "%", delta: null, spark: [27, 28, 28, 29, 30, 31, 30, 32, 31, 30, 32, 31] },
    messages: { value: 5821, delta: null, spark: [410, 380, 410, 380, 350, 320, 305, 290, 310, 295, 322, 305] },
    meetings: { value: 612, delta: null, spark: [25, 28, 32, 35, 41, 38, 42, 39, 44, 36, 50, 48] },
    calls: { value: 1284, delta: null, spark: [55, 62, 68, 72, 75, 80, 71, 68, 75, 70, 68, 65] },
  },
};

export const STATUS_META: Record<CampaignStatus, { label: string; bg: string; fg: string; dot: string }> = {
  running: { label: "En cours", bg: "#E8F4EC", fg: "#0E7A3A", dot: "#16A34A" },
  paused: { label: "En pause", bg: "#FFF6E5", fg: "#9A6700", dot: "#D89B0A" },
  completed: { label: "Terminée", bg: "#EDEEF0", fg: "#3F4350", dot: "#6B7280" },
  failed: { label: "Échouée", bg: "#FDECEC", fg: "#A8221C", dot: "#DC2626" },
  draft: { label: "Brouillon", bg: "#F1F2F4", fg: "#5B6072", dot: "#94A0AE" },
  ready: { label: "Prête", bg: "#E8F0FD", fg: "#003EA3", dot: "#0052D9" },
};

export const CHANNEL_META: Record<Channel, { label: string; color: string }> = {
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  phone: { label: "Téléphone", color: "#0052D9" },
};

export const TYPE_META: Record<CampaignType, { label: string; bg: string; fg: string }> = {
  invitation: { label: "Invitation", bg: "#E8F0FD", fg: "#003EA3" },
  message: { label: "Message", bg: "#EDF6FF", fg: "#0A66C2" },
  invitation_message: { label: "Invitation + Message", bg: "#F0EAFE", fg: "#5B2EBF" },
  whatsapp_message: { label: "Message WhatsApp", bg: "#E6F8EE", fg: "#0E7A3A" },
};

export interface FilterState {
  channels: Channel[];
  statuses: CampaignStatus[];
  period: Period;
  creators: string[];
  search: string;
}

export const DEFAULT_FILTERS: FilterState = {
  channels: [],
  statuses: [],
  period: "all",
  creators: [],
  search: "",
};

// Performance per campaign type — { rate%, label, tier }
export function computePerf(c: Campaign): { rate: number; label: string; tier: "high" | "mid" | "low" } | null {
  if (c.processed === 0) return null;
  let rate = 0;
  let label = "";
  if (c.type === "invitation") {
    rate = (c.accepted / c.processed) * 100;
    label = "acceptation";
  } else {
    rate = (c.replied / c.processed) * 100;
    label = "réponse";
  }
  const tier = rate > 30 ? "high" : rate >= 15 ? "mid" : "low";
  return { rate, label, tier };
}

export const PERF_COLORS: Record<"high" | "mid" | "low", { fg: string; bg: string }> = {
  high: { fg: "#0E7A3A", bg: "#E8F4EC" },
  mid: { fg: "#5B6072", bg: "#F1F2F4" },
  low: { fg: "#A8221C", bg: "#FDECEC" },
};

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date("2026-05-06T12:00:00");
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${Math.floor(diffH)}h`;
  if (diffD === 1) return "hier";
  if (diffD < 7) return `il y a ${diffD}j`;
  const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
  const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
}
