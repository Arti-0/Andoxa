"use client";

import { useRouter } from "next/navigation";
import { Eye, Play, Phone } from "lucide-react";
import { type CallSession, formatLongDate } from "./data";
import { ProgressBar } from "./primitives";

/** Tone palette for the presence-derived status tag. */
const LIVE_TAG: Record<
  CallSession["liveStatus"],
  { label: string; bg: string; fg: string; dot: string; pulse: boolean }
> = {
  not_started: { label: "Prête", bg: "#E8F0FD", fg: "#003EA3", dot: "#0052D9", pulse: false },
  in_progress: { label: "En cours", bg: "#E8F4EC", fg: "#0E7A3A", dot: "#16A34A", pulse: true },
  paused: { label: "En pause", bg: "#FFF6E5", fg: "#9A6700", dot: "#D89B0A", pulse: false },
  ended: { label: "Terminée", bg: "#EDEEF0", fg: "#3F4350", dot: "#6B7280", pulse: false },
};

function LiveTag({ status }: { status: CallSession["liveStatus"] }) {
  const m = LIVE_TAG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ background: m.bg, color: m.fg }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          background: m.dot,
          boxShadow: m.pulse ? `0 0 0 3px ${m.dot}33` : "none",
          animation: m.pulse ? "pulse 1.6s ease-in-out infinite" : "none",
        }}
      />
      {m.label}
    </span>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-card px-3.5 py-3">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span
        className="text-lg font-semibold tabular-nums tracking-tight"
        style={{ color: accent ?? "var(--foreground)" }}
      >
        {value}
        {sub ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">{sub}</span> : null}
      </span>
    </div>
  );
}

export type SessionAction = "start" | "resume" | "view" | "duplicate" | "delete";

export function SessionCard({
  session,
  onAction,
}: {
  session: CallSession;
  onAction: (a: SessionAction, s: CallSession) => void;
}) {
  const router = useRouter();
  const live = session.liveStatus;
  const isInProgress = live === "in_progress";
  const pct = session.total ? (session.processed / session.total) * 100 : 0;

  // Bottom-right action varies with the live state. "Reprendre" only for a
  // paused session; in-progress shows "Rejoindre"; not-started "Démarrer";
  // ended is view-only.
  const action =
    live === "not_started"
      ? { label: "Démarrer", icon: Play, kind: "start" as const }
      : live === "paused"
        ? { label: "Reprendre", icon: Play, kind: "resume" as const }
        : live === "in_progress"
          ? { label: "Rejoindre", icon: Phone, kind: "resume" as const }
          : { label: "Voir les détails", icon: Eye, kind: "view" as const };
  const ActionIcon = action.icon;

  const open = () => {
    router.push(`/campaigns/sessions/${session.id}`);
    onAction(action.kind, session);
  };

  return (
    <div
      className="relative flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-px hover:shadow-md"
      style={{
        borderColor: isInProgress ? "#16A34A" : "var(--border)",
        boxShadow: isInProgress ? "0 0 0 1px #16A34A" : undefined,
      }}
    >
      {/* Header — status tag sits top-right (replaces the old blue dot). */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Session d&apos;appels
          </div>
          <div className="mt-1 truncate text-lg font-semibold tracking-tight" title={session.name}>
            {session.name}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {formatLongDate(session.date)}
          </div>
          {/* Who's live now — only meaningful when in progress. */}
          {isInProgress && session.activeUserName && (
            <div className="mt-1 text-[11.5px] font-medium text-emerald-700 dark:text-emerald-400">
              {session.activeUserName} est en ligne
            </div>
          )}
        </div>
        <LiveTag status={live} />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border" style={{ background: "var(--border)" }}>
        <Metric label="Prospects" value={`${session.processed}/${session.total}`} sub="traités" />
        <Metric
          label="RDV pris"
          value={session.meetings}
          accent={session.meetings > 0 ? "#FF6700" : undefined}
        />
        <Metric label="Qualifications" value={session.qualifications} />
        <Metric
          label="Taux de décrochage"
          value={session.pickupRate !== null ? `${session.pickupRate}%` : "—"}
          accent={session.pickupRate !== null && session.pickupRate >= 60 ? "#0E7A3A" : undefined}
        />
      </div>

      {session.processed > 0 && session.processed < session.total && (
        <div className="flex flex-col gap-1.5">
          <ProgressBar value={session.processed} max={session.total} color="#0052D9" />
          <span className="text-[11.5px] text-muted-foreground tabular-nums">
            {Math.round(pct)}% complété
          </span>
        </div>
      )}

      {/* Action — compact, bottom-right (not a full-width button). */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={open}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            action.kind === "view"
              ? "border bg-background text-foreground hover:bg-accent"
              : "bg-[#0052D9] text-white hover:bg-[#0040A8]"
          }`}
        >
          <ActionIcon className="size-3.5" />
          {action.label}
        </button>
      </div>
    </div>
  );
}

export function SessionsGrid({
  sessions,
  onAction,
}: {
  sessions: CallSession[];
  onAction: (a: SessionAction, s: CallSession) => void;
}) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} onAction={onAction} />
      ))}
    </div>
  );
}
