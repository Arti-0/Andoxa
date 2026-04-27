"use client";

// Right config panel — visuals from design/whatsapp/wf-components.jsx
// RightConfigPanel. Form fields are limited to what the backend schema can
// actually persist (see /lib/workflows/schema.ts). Fields shown in the
// original demo that aren't backed by storage (delay, tracking variables,
// etc.) are noted in `BACKEND_GAPS.md` rather than rendered.

import { useEffect, useState } from "react";
import { Icon, ICO } from "./icons";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";
import type { WorkflowStep } from "@/lib/workflows/schema";
import {
  WORKFLOW_TRIGGERS,
  type WorkflowTemplateTrigger,
} from "@/lib/workflows";
import { TRIGGER_NODE_ID } from "./xy-canvas";

interface RightPanelProps {
  /** Selected step or special TRIGGER_NODE_ID. */
  selectedId: string;
  step: WorkflowStep | null;
  trigger: WorkflowTemplateTrigger | null;
  onClose: () => void;
  onUpdateStep: (stepId: string, patch: Record<string, unknown>) => void;
  onUpdateTrigger: (next: WorkflowTemplateTrigger | null) => void;
  onDeleteStep: (stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
}

const STEP_TYPE_TO_NODE_TYPE: Record<string, WfNodeType> = {
  whatsapp_message: "whatsapp",
  wait: "wait",
  condition: "condition",
  linkedin_invite: "linkedin",
  linkedin_message: "linkedin",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "#374151",
        marginBottom: 5,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12.5,
  color: "#0F172A",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
};

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: value ? "#0052D9" : "#CBD5E1",
          position: "relative",
          cursor: "pointer",
          transition: "background 150ms",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "white",
            top: 2,
            left: value ? 18 : 2,
            transition: "left 150ms",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: "#64748B" }}>
        {value ? "Activé" : "Désactivé"}
      </span>
    </div>
  );
}

function TriggerForm({
  trigger,
  onUpdate,
}: {
  trigger: WorkflowTemplateTrigger | null;
  onUpdate: (next: WorkflowTemplateTrigger | null) => void;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 14,
        }}
      >
        Configuration du déclencheur
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Événement déclencheur</FieldLabel>
        <select
          value={trigger ?? ""}
          onChange={(e) =>
            onUpdate((e.target.value || null) as WorkflowTemplateTrigger | null)
          }
          style={inputStyle}
        >
          <option value="">Aucun</option>
          {WORKFLOW_TRIGGERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <p
        style={{
          fontSize: 11,
          color: "#94A3B8",
          lineHeight: 1.5,
          background: "#F8FAFC",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #E2E8F0",
        }}
      >
        Les déclencheurs sont enregistrés dans les métadonnées du workflow.
        L&apos;exécution réelle de chaque déclencheur sera branchée dans une
        prochaine itération du backend.
      </p>
    </>
  );
}

function WaitForm({
  step,
  onUpdate,
}: {
  step: WorkflowStep & { type: "wait" };
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const cfg = step.config as { durationHours: number; onlyIfNoReply?: boolean };
  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 14,
        }}
      >
        Délai d&apos;attente
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Durée (heures)</FieldLabel>
        <input
          type="number"
          min={1}
          step={1}
          value={cfg.durationHours ?? 0}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n > 0) {
              onUpdate({ durationHours: n });
            }
          }}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Conditionnel</FieldLabel>
        <Toggle
          value={!!cfg.onlyIfNoReply}
          onChange={(v) => onUpdate({ onlyIfNoReply: v })}
        />
        <p
          style={{
            fontSize: 11,
            color: "#94A3B8",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Si activé, l&apos;étape suivante ne s&apos;exécute que si le prospect
          n&apos;a pas répondu pendant ce délai.
        </p>
      </div>
    </>
  );
}

function MessageForm({
  step,
  label,
  onUpdate,
}: {
  step: WorkflowStep & { type: "whatsapp_message" | "linkedin_message" | "linkedin_invite" };
  label: string;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const cfg = step.config as { messageTemplate?: string };
  const [draft, setDraft] = useState(cfg.messageTemplate ?? "");
  useEffect(() => {
    setDraft(cfg.messageTemplate ?? "");
  }, [cfg.messageTemplate]);

  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Modèle de message</FieldLabel>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== (cfg.messageTemplate ?? "")) {
              onUpdate({ messageTemplate: draft });
            }
          }}
          rows={6}
          placeholder="Bonjour {{firstName}}, ..."
          style={{
            ...inputStyle,
            fontFamily: "inherit",
            lineHeight: 1.5,
            resize: "vertical",
          }}
        />
        <p
          style={{
            fontSize: 11,
            color: "#94A3B8",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Variables disponibles : <code>{"{{firstName}}"}</code>,{" "}
          <code>{"{{lastName}}"}</code>, <code>{"{{company}}"}</code>.
        </p>
      </div>
    </>
  );
}

function ConditionForm() {
  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 14,
        }}
      >
        Configuration de la condition
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Type de condition</FieldLabel>
        <select value="prospect_replied" disabled style={inputStyle}>
          <option value="prospect_replied">Le prospect a répondu</option>
        </select>
      </div>
      <p
        style={{
          fontSize: 11,
          color: "#94A3B8",
          lineHeight: 1.5,
          background: "#F8FAFC",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #E2E8F0",
        }}
      >
        Une seule condition est supportée pour le moment :{" "}
        <strong>Le prospect a répondu ?</strong>. Les branches Oui/Non sont
        définies par les liens dans le canvas.
      </p>
    </>
  );
}

export function RightPanel({
  selectedId,
  step,
  trigger,
  onClose,
  onUpdateStep,
  onUpdateTrigger,
  onDeleteStep,
  onDuplicateStep,
}: RightPanelProps) {
  const isTrigger = selectedId === TRIGGER_NODE_ID;
  const nodeType: WfNodeType = isTrigger
    ? "trigger"
    : (step ? (STEP_TYPE_TO_NODE_TYPE[step.type] ?? "end") : "end");
  const cfg = WF_NODE_TYPES[nodeType];
  const headline = isTrigger
    ? trigger
      ? (WORKFLOW_TRIGGERS.find((t) => t.id === trigger)?.label ?? "Déclencheur")
      : "Déclencheur"
    : step
      ? step.type === "wait"
        ? "Attendre"
        : step.type === "whatsapp_message"
          ? "Message WhatsApp"
          : step.type === "linkedin_message"
            ? "Message LinkedIn"
            : step.type === "linkedin_invite"
              ? "Invitation LinkedIn"
              : step.type === "condition"
                ? "Le prospect a répondu ?"
                : "Étape"
      : "Étape introuvable";

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: "1px solid #E2E8F0",
        background: "white",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: cfg.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `1px solid ${cfg.border}44`,
          }}
        >
          {cfg.iconFn(16)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: cfg.color,
            }}
          >
            {cfg.label}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0F172A",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {headline}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#94A3B8",
            display: "flex",
            padding: 4,
            borderRadius: 6,
          }}
          aria-label="Fermer"
        >
          <Icon size={14} color="#94A3B8" d={ICO.x} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {isTrigger ? (
          <TriggerForm trigger={trigger} onUpdate={onUpdateTrigger} />
        ) : !step ? (
          <p style={{ fontSize: 13, color: "#94A3B8" }}>
            Étape introuvable.
          </p>
        ) : step.type === "wait" ? (
          <WaitForm
            step={step as WorkflowStep & { type: "wait" }}
            onUpdate={(p) => onUpdateStep(step.id, p)}
          />
        ) : step.type === "whatsapp_message" ? (
          <MessageForm
            step={step as WorkflowStep & { type: "whatsapp_message" }}
            label="Message WhatsApp"
            onUpdate={(p) => onUpdateStep(step.id, p)}
          />
        ) : step.type === "linkedin_message" ? (
          <MessageForm
            step={step as WorkflowStep & { type: "linkedin_message" }}
            label="Message LinkedIn"
            onUpdate={(p) => onUpdateStep(step.id, p)}
          />
        ) : step.type === "linkedin_invite" ? (
          <MessageForm
            step={step as WorkflowStep & { type: "linkedin_invite" }}
            label="Invitation LinkedIn"
            onUpdate={(p) => onUpdateStep(step.id, p)}
          />
        ) : step.type === "condition" ? (
          <ConditionForm />
        ) : (
          <p style={{ fontSize: 13, color: "#94A3B8" }}>
            Aucune configuration disponible pour ce type.
          </p>
        )}

        {!isTrigger && step && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 14,
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              gap: 6,
            }}
          >
            <button
              onClick={() => onDuplicateStep(step.id)}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: "white",
                fontSize: 12.5,
                fontWeight: 500,
                color: "#374151",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <Icon size={12} color="#374151" d={ICO.copy} />
              Dupliquer
            </button>
            <button
              onClick={() => onDeleteStep(step.id)}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid #FEE2E2",
                background: "#FFF1F2",
                fontSize: 12.5,
                color: "#BE123C",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              aria-label="Supprimer"
            >
              <Icon size={12} color="#BE123C" d={ICO.trash} />
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0" }}>
        <p
          style={{
            fontSize: 11,
            color: "#94A3B8",
            textAlign: "center",
          }}
        >
          Les modifications sont enregistrées au prochain clic sur{" "}
          <strong style={{ color: "#0F172A" }}>Enregistrer</strong>.
        </p>
      </div>
    </div>
  );
}
