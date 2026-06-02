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
import type { Conversation, TimelineEvent } from "./data";
import { Avatar } from "./components";
import { useProspect, useProspectTimeline, useUpdateProspectStatus } from "./queries";
import {
  useDynamicStatusConfig,
  StatusPill,
  type StatusConfig,
} from "@/components/crm/crm-shared";
import { toast } from "@/lib/toast";

const sectionStyle: React.CSSProperties = {
  padding: "22px 20px",
  borderBottom: "1px solid var(--m2-slate-150)",
};

/**
 * Pipeline stepper driven by the per-org custom statuses (same source as the
 * CRM). Clicking a status sets the prospect to that status key. Falls back to
 * a flat row when statuses are still loading.
 */
function MiniStepper({
  order,
  cfgByKey,
  currentKey,
  onStatusClick,
}: {
  order: string[];
  cfgByKey: Map<string, StatusConfig>;
  currentKey: string | null;
  onStatusClick?: (key: string) => void;
}) {
  const idx = currentKey ? order.indexOf(currentKey) : -1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        marginTop: 4,
        overflowX: "auto",
      }}
    >
      {order.map((key, i) => {
        const isPast = idx >= 0 && i < idx;
        const isActive = i === idx;
        const cfg = cfgByKey.get(key);
        const label = cfg?.label ?? key;
        const hex = cfg?.hex ?? "#0052D9";
        return (
          <Fragment key={key}>
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
                onClick={() => onStatusClick?.(key)}
                title={`Passer à : ${label}`}
                style={{
                  background: isActive ? hex : isPast ? `${hex}22` : "transparent",
                  color: isActive ? "white" : isPast ? hex : "var(--m2-slate-500)",
                  border: `2px solid ${isActive || isPast ? hex : "var(--m2-slate-200)"}`,
                  boxShadow: isActive ? `0 0 0 4px ${hex}1f` : "none",
                  cursor: onStatusClick && !isActive ? "pointer" : "default",
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
                  maxWidth: 48,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={label}
              >
                {label}
              </span>
            </div>
            {i < order.length - 1 && (
              <div
                className="m2-stepper-line"
                style={{
                  background: i < idx ? `${hex}55` : "var(--m2-slate-200)",
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
  const { data: timelineData } = useProspectTimeline(conv.prospectId);
  const timeline: TimelineEvent[] = timelineData ?? [];
  const updateStatus = useUpdateProspectStatus();

  // Per-org custom statuses (same source as the CRM pipeline). The prospect's
  // real status key lives on the cached prospect row hydrated by the chats
  // query; the cockpit reads it to highlight the active step.
  const { pipelineOrder, cfgByKey } = useDynamicStatusConfig();
  const { data: prospect } = useProspect(conv.prospectId);
  const currentKey = prospect?.status ?? null;
  const currentCfg = currentKey ? cfgByKey.get(currentKey) : undefined;
  const stageIdx = currentKey ? pipelineOrder.indexOf(currentKey) : -1;
  const total = pipelineOrder.length;

  const handleStatusClick = (key: string) => {
    if (!conv.prospectId || key === currentKey) return;
    updateStatus.mutate(
      { prospectId: conv.prospectId, status: key },
      {
        onSuccess: () =>
          toast.success(`Statut mis à jour : ${cfgByKey.get(key)?.label ?? key}`),
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
          {currentKey ? <StatusPill status={currentKey} size="lg" /> : null}
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

      {/* Section 2 — Pipeline (custom statuses) */}
      {conv.prospectId && pipelineOrder.length > 0 && (
        <div style={sectionStyle}>
          <MiniStepper
            order={pipelineOrder}
            cfgByKey={cfgByKey}
            currentKey={currentKey}
            onStatusClick={handleStatusClick}
          />
          {stageIdx >= 0 && (
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
                {currentCfg?.label ?? currentKey}
              </span>
            </div>
          )}
        </div>
      )}

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
