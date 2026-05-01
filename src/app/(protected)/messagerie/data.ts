// Types and helpers for the messagerie view layer.
// Shapes are derived from real backend payloads — see queries.ts for fetch logic.

export type Stage =
  | "contacted"
  | "replied"
  | "interested"
  | "meeting"
  | "proposal"
  | "closing"
  | "noshow";

export type Channel = "li" | "wa";

export const STAGES: Record<
  Stage,
  { label: string; bg: string; fg: string; dot: string }
> = {
  contacted: { label: "Contacté", bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8" },
  replied: { label: "Répondu", bg: "#EEF4FE", fg: "#1A53B8", dot: "#3B82F6" },
  interested: { label: "Intéressé", bg: "#FEF7E6", fg: "#92590E", dot: "#D97706" },
  meeting: { label: "RDV confirmé", bg: "#ECFDF5", fg: "#15803D", dot: "#10B981" },
  proposal: { label: "Proposition", bg: "#F5F3FF", fg: "#5B21B6", dot: "#8B5CF6" },
  closing: { label: "Closing", bg: "#EEF4FE", fg: "#1E3A8A", dot: "#0052D9" },
  noshow: { label: "No-show", bg: "#FEF2F2", fg: "#B91C1C", dot: "#EF4444" },
};

export const PIPELINE_ORDER: Stage[] = [
  "contacted",
  "replied",
  "meeting",
  "proposal",
  "closing",
];

// Production status enum (from src/lib/types/prospects.ts) → design stage.
// Decided here at the UI layer rather than migrating the DB enum.
const STATUS_TO_STAGE: Record<string, Stage> = {
  new: "contacted",
  contacted: "contacted",
  qualified: "replied",
  rdv: "meeting",
  proposal: "proposal",
  won: "closing",
  lost: "noshow",
};

export function statusToStage(status: string | null | undefined): Stage {
  if (!status) return "contacted";
  return STATUS_TO_STAGE[status] ?? "contacted";
}

// Map UnipileChat.account_type → design Channel. Anything we don't recognize
// falls back to LinkedIn so the row still renders.
export function accountTypeToChannel(type: string | null | undefined): Channel {
  const t = (type ?? "").toUpperCase();
  if (t.includes("WHATSAPP")) return "wa";
  return "li";
}

export const initials = (name: string) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const hue = (name: string) => {
  let h = 0;
  for (const c of name || "") h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

export type TimelineKind =
  | "invite"
  | "accept"
  | "reply"
  | "meeting-booked"
  | "proposal"
  | "noshow";

export type TimelineEvent = {
  kind: TimelineKind;
  label: string;
  date: string;
};

export type Conversation = {
  id: string;
  // Linkage to CRM; null when chat has no matched prospect.
  prospectId: string | null;
  name: string;
  role: string | null;
  company: string | null;
  linkedinUrl: string | null;
  channel: Channel;
  stage: Stage;
  lastTime: string;
  unread: number;
  silentDays: number;
  pictureUrl: string | null;
  // Loaded lazily by the cockpit when this chat is selected.
  timeline?: TimelineEvent[];
};

export type ThreadEntry =
  | { kind: "date"; label: string }
  | {
      kind: "msg";
      dir: "in" | "out";
      time: string;
      text?: string;
      hasAttachments?: boolean;
    }
  | { kind: "auto"; time: string; text: string };

export type QuickTemplate = {
  id: string;
  name: string;
  channel: "li" | "wa" | "both";
  content: string;
};

// Variable resolution for template insertion. Backend stores `{{firstName}}`
// style; we accept both the `{{x}}` canonical form and the older `{x}` French
// form to be forgiving while old templates exist.
export function resolveVars(
  text: string,
  conv: Pick<Conversation, "name" | "company" | "role">,
  bookingLink: string,
) {
  const first = (conv.name || "").split(" ")[0] || "";
  const last = (conv.name || "").split(" ").slice(1).join(" ") || "";
  const company = conv.company || "";
  const role = conv.role || "";
  const repl = (s: string) =>
    s
      .replace(/\{\{firstName\}\}|\{prénom\}/g, first)
      .replace(/\{\{lastName\}\}|\{nom\}/g, last)
      .replace(/\{\{company\}\}|\{entreprise\}/g, company)
      .replace(/\{\{jobTitle\}\}|\{poste\}/g, role)
      .replace(/\{\{bookingLink\}\}|\{lien_booking\}/g, bookingLink);
  return repl(text);
}

// Format a UnipileChat.timestamp (ISO) into the compact label used in the list.
export function formatChatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function silentDaysFrom(ts: string | null | undefined): number {
  if (!ts) return 0;
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24)));
}

// Group messages into a thread (with date separators) from the raw API list.
export function buildThreadEntries(
  messages: Array<{
    id: string;
    text: string | null;
    timestamp: string;
    is_sender: 0 | 1;
    attachments?: unknown[];
  }>,
): ThreadEntry[] {
  // Unipile returns most-recent-first. Reverse to render chronologically.
  const ordered = [...messages].reverse();
  const out: ThreadEntry[] = [];
  let lastDateKey = "";
  for (const m of ordered) {
    const d = new Date(m.timestamp);
    const dateKey = d.toDateString();
    if (dateKey !== lastDateKey) {
      out.push({
        kind: "date",
        label: d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
        }),
      });
      lastDateKey = dateKey;
    }
    out.push({
      kind: "msg",
      dir: m.is_sender === 1 ? "out" : "in",
      time: d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: m.text ?? undefined,
      hasAttachments: (m.attachments?.length ?? 0) > 0,
    });
  }
  return out;
}
