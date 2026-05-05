"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Linkedin,
  Check,
  MessageSquare,
  CalendarPlus,
  FileText,
  X,
  Eye,
} from "lucide-react";
import type { Conversation, TimelineEvent, Stage } from "./data";
import { PIPELINE_ORDER, STAGES } from "./data";
import { Avatar, StagePill } from "./components";
import { useProspectTimeline, useUpdateProspectStatus } from "./queries";
import { toast } from "sonner";

// Inverse of statusToStage — maps design stage back to the DB status enum value.
const STAGE_TO_STATUS: Partial<Record<Stage, string>> = {
  contacted: "contacted",
  replied: "qualified",
  meeting: "rdv",
  proposal: "proposal",
  closing: "won",
  noshow: "lost",
};

const sectionStyle: React.CSSProperties = {
  padding: "22px 20px",
  borderBottom: "1px solid var(--m2-slate-150)",
};

function MiniStepper({
  stage,
  onStageClick,
}: {
  stage: Stage;
  onStageClick?: (s: Stage) => void;
}) {
  const idx = PIPELINE_ORDER.indexOf(stage);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        marginTop: 4,
      }}
    >
      {PIPELINE_ORDER.map((k, i) => {
        const isPast = i < idx;
        const isActive = i === idx;
        const s = STAGES[k];
        return (
          <Fragment key={k}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
                width: 50,
              }}
            >
              <div
                className="m2-stepper-dot"
                onClick={() => onStageClick?.(k)}
                title={`Passer à : ${s.label}`}
                style={{
                  background: isActive
                    ? "var(--m2-blue)"
                    : isPast
                      ? "var(--m2-blue-100)"
                      : "transparent",
                  color: isActive
                    ? "white"
                    : isPast
                      ? "var(--m2-blue)"
                      : "var(--m2-slate-500)",
                  border: isActive
                    ? "2px solid var(--m2-blue)"
                    : isPast
                      ? "2px solid var(--m2-blue-100)"
                      : "2px solid var(--m2-slate-200)",
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(0,82,217,0.12)"
                    : "none",
                  cursor: onStageClick && !isActive ? "pointer" : "default",
                }}
              >
                {isPast ? <Check size={11} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--m2-slate-900)" : "var(--m2-slate-500)",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label.split(" ")[0]}
              </span>
            </div>
            {i < PIPELINE_ORDER.length - 1 && (
              <div
                className="m2-stepper-line"
                style={{
                  background:
                    i < idx ? "var(--m2-blue-100)" : "var(--m2-slate-200)",
                  margin: "11px -2px 0 -2px",
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

const ICON_MAP = {
  invite: Linkedin,
  accept: Check,
  reply: MessageSquare,
  "meeting-booked": CalendarPlus,
  proposal: FileText,
  noshow: X,
} as const;

function ActivityRow({
  ev,
  isLast,
}: {
  ev: TimelineEvent;
  isLast: boolean;
}) {
  const I = ICON_MAP[ev.kind] || MessageSquare;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: isLast ? "none" : "1px dashed var(--m2-slate-150)",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: "var(--m2-slate-100)",
          color: "var(--m2-slate-700)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <I size={12} />
      </div>
      <div
        style={{
          flex: 1,
          fontSize: 12.5,
          color: "var(--m2-slate-700)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {ev.label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--m2-slate-500)",
          flexShrink: 0,
        }}
      >
        {ev.date}
      </div>
    </div>
  );
}

export function Cockpit({ conv }: { conv: Conversation }) {
  const stage = STAGES[conv.stage];
  const stageIdx = PIPELINE_ORDER.indexOf(conv.stage);
  const total = PIPELINE_ORDER.length;
  const { data: timelineData } = useProspectTimeline(conv.prospectId);
  const timeline: TimelineEvent[] = timelineData ?? [];
  const updateStatus = useUpdateProspectStatus();

  const handleStageClick = (s: Stage) => {
    if (!conv.prospectId || s === conv.stage) return;
    const dbStatus = STAGE_TO_STATUS[s];
    if (!dbStatus) return;
    updateStatus.mutate(
      { prospectId: conv.prospectId, status: dbStatus },
      {
        onSuccess: () => toast.success(`Statut mis à jour : ${STAGES[s].label}`),
        onError: () => toast.error("Impossible de mettre à jour le statut"),
      },
    );
  };

  return (
    <aside
      style={{
        width: 300,
        minWidth: 260,
        borderLeft: "1px solid var(--m2-slate-200)",
        background: "var(--m2-surface-elevated)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      {/* Section 1 — Identité */}
      <div style={{ ...sectionStyle, padding: "24px 20px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Avatar name={conv.name} size={64} pictureUrl={conv.pictureUrl} />
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "var(--m2-slate-900)",
            marginTop: 12,
          }}
        >
          {conv.name}
        </div>
        {conv.role && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--m2-slate-500)",
              marginTop: 3,
            }}
          >
            {conv.role}
          </div>
        )}
        {conv.company && (
          <div style={{ fontSize: 11.5, color: "var(--m2-slate-500)" }}>
            {conv.company}
          </div>
        )}
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 12 }}
        >
          <StagePill stage={conv.stage} />
        </div>
        {conv.prospectId ? (
          <Link
            href={`/prospect/${conv.prospectId}`}
            className="m2-btn m2-btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 16,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <Eye size={13} />
            Voir la fiche complète
          </Link>
        ) : (
          <div
            style={{
              marginTop: 16,
              padding: "9px 12px",
              fontSize: 11.5,
              color: "var(--m2-slate-500)",
              textAlign: "center",
              border: "1px dashed var(--m2-slate-200)",
              borderRadius: 8,
            }}
          >
            Conversation hors CRM
          </div>
        )}
      </div>

      {/* Section 2 — Pipeline */}
      <div style={sectionStyle}>
        <MiniStepper
          stage={conv.stage}
          onStageClick={conv.prospectId ? handleStageClick : undefined}
        />
        <div
          style={{
            fontSize: 11,
            color: "var(--m2-slate-500)",
            marginTop: 14,
            textAlign: "center",
          }}
        >
          Étape {stageIdx + 1}/{total} —{" "}
          <span style={{ color: "var(--m2-slate-700)", fontWeight: 500 }}>
            {stage.label}
          </span>
        </div>
      </div>

      {/* Section 3 — Activité clé */}
      <div style={sectionStyle}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--m2-slate-500)",
            marginBottom: 6,
          }}
        >
          Activité clé
        </div>
        <div>
          {timeline.map((ev, i, arr) => (
            <ActivityRow key={i} ev={ev} isLast={i === arr.length - 1} />
          ))}
          {timeline.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--m2-slate-500)",
                padding: "8px 0",
              }}
            >
              Aucune activité enregistrée.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
