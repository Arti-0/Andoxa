"use client";

import { useRouter } from "next/navigation";
import { Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type CallSession, formatLongDate } from "./data";
import { ProgressBar, StatusBadge } from "./primitives";

function Metric({
  label,
  value,
  sub,
  accent,
  tinted,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  tinted?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 px-3.5 py-3 ${tinted ? "bg-blue-50/60" : "bg-card"}`}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums tracking-tight" style={{ color: accent ?? "var(--foreground)" }}>
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
  const isRunning = session.status === "running";
  const isReady = session.status === "ready";
  const pct = session.total ? (session.processed / session.total) * 100 : 0;

  const primary = isReady
    ? { label: "Démarrer la session", icon: Play, action: "start" as const }
    : isRunning
      ? { label: "Reprendre", icon: Play, action: "resume" as const }
      : { label: "Voir les détails", icon: Eye, action: "view" as const };
  const PrimaryIcon = primary.icon;

  return (
    <div
      className="relative flex flex-col gap-4 rounded-2xl p-5 transition-all hover:-translate-y-px hover:shadow-md"
      style={{
        background: isRunning ? "#F5F8FF" : "var(--card)",
        border: `${isRunning ? "1.5px" : "1px"} solid ${isRunning ? "#0052D9" : "var(--border)"}`,
        borderLeft: isRunning ? "5px solid #0052D9" : undefined,
      }}
    >
      {isRunning ? (
        <span
          className="absolute right-4 top-4 size-2 rounded-full"
          style={{ background: "#0052D9", boxShadow: "0 0 0 4px rgba(0,82,217,0.18)", animation: "pulse 1.6s ease-in-out infinite" }}
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">Session d&apos;appels</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">{formatLongDate(session.date)}</div>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={session.status} />
            <span className="text-[11.5px] text-muted-foreground">· {session.creatorName}</span>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border"
        style={{
          background: isRunning ? "rgba(0,82,217,0.10)" : "var(--border)",
          borderColor: isRunning ? "rgba(0,82,217,0.18)" : "var(--border)",
        }}
      >
        <Metric label="Prospects" value={`${session.processed}/${session.total}`} sub="traités" tinted={isRunning} />
        <Metric label="RDV pris" value={session.meetings} accent={session.meetings > 0 ? "#FF6700" : undefined} tinted={isRunning} />
        <Metric label="Qualifications" value={session.qualifications} tinted={isRunning} />
        <Metric
          label="Taux de décrochage"
          value={session.pickupRate !== null ? `${session.pickupRate}%` : "—"}
          accent={session.pickupRate !== null && session.pickupRate >= 60 ? "#0E7A3A" : undefined}
          tinted={isRunning}
        />
      </div>

      {isRunning || (session.processed > 0 && session.processed < session.total) ? (
        <div className="flex flex-col gap-1.5">
          <ProgressBar value={session.processed} max={session.total} color="#0052D9" />
          <span className="text-[11.5px] text-muted-foreground tabular-nums">{Math.round(pct)}% complété</span>
        </div>
      ) : null}

      <Button
        type="button"
        variant={primary.action === "view" ? "outline" : "default"}
        className="w-full"
        onClick={() => {
          if (primary.action === "view" || primary.action === "resume" || primary.action === "start") {
            router.push(`/call-sessions2/${session.id}`);
          }
          onAction(primary.action, session);
        }}
      >
        <PrimaryIcon className="size-3.5" />
        {primary.label}
      </Button>
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
