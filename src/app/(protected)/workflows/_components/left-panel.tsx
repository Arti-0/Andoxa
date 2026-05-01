"use client";

// Left panel — visuals from design/whatsapp/wf-components.jsx LeftTemplatePanel.
// Templates list comes from WORKFLOW_TEMPLATES (lib/workflows). The "Ajouter un
// bloc" palette only enables types the backend currently supports.

import { Fragment, useMemo, useState } from "react";
import { Icon, ICO } from "./icons";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
} from "@/lib/workflows";
import type { WorkflowStepType } from "@/lib/workflows/schema";

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  WhatsApp: { bg: "#ECFDF5", color: "#065F46", border: "#10B981" },
  LinkedIn: { bg: "#EFF6FF", color: "#0A66C2", border: "#0A66C2" },
  CRM: { bg: "#EFF6FF", color: "#1E3A8A", border: "#2563EB" },
  IA: { bg: "#F0FDF4", color: "#047857", border: "#059669" },
};

const TEMPLATE_CATEGORY: Record<string, "WhatsApp" | "LinkedIn" | "CRM" | "IA"> = {
  "post-meeting-whatsapp": "WhatsApp",
  "linkedin-welcome-followup": "LinkedIn",
  "no-show-recovery": "WhatsApp",
  "post-proposal-followup": "CRM",
  "reengage-silent-prospects": "IA",
  blank: "WhatsApp",
};

/** Mini node preview — derives the step types from the template's definition. */
function templateNodes(t: WorkflowTemplate): WfNodeType[] {
  const def = t.buildDefinition();
  const out: WfNodeType[] = ["trigger"];
  for (const s of def.steps) {
    if (s.type === "whatsapp_message") out.push("whatsapp");
    else if (s.type === "wait") out.push("wait");
    else if (s.type === "condition") out.push("condition");
    else if (s.type === "linkedin_invite" || s.type === "linkedin_message") out.push("linkedin");
  }
  return out.length > 1 ? out : ["trigger"];
}

/** Block types the user can insert. The order mirrors the design palette. */
type BlockChoice = {
  type: WfNodeType;
  /** Pre-filled backend step type when the user picks this block. */
  backend: WorkflowStepType;
  /** Optional override label (defaults to WF_NODE_TYPES[type].label). */
  label?: string;
};

const BLOCK_TYPES: BlockChoice[] = [
  { type: "whatsapp", backend: "whatsapp_message" },
  { type: "wait", backend: "wait" },
  { type: "condition", backend: "condition" },
  { type: "linkedin", backend: "linkedin_message", label: "Message LinkedIn" },
  { type: "linkedin", backend: "linkedin_invite", label: "Invitation LinkedIn" },
  { type: "crm", backend: "crm" },
  { type: "notification", backend: "notification" },
  { type: "task", backend: "task" },
  { type: "end", backend: "end" },
];

interface LeftPanelProps {
  onAddStep: (type: WorkflowStepType) => void;
  onApplyTemplate: (t: WorkflowTemplate) => void;
}

export function LeftPanel({ onAddStep, onApplyTemplate }: LeftPanelProps) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("Tous");
  const categories = ["Tous", "WhatsApp", "LinkedIn", "CRM", "IA"];

  const filtered = useMemo(() => {
    return WORKFLOW_TEMPLATES.filter((t) => {
      const c = TEMPLATE_CATEGORY[t.id] ?? "WhatsApp";
      const catOk = cat === "Tous" || c === cat;
      const searchOk = t.name.toLowerCase().includes(search.toLowerCase());
      return catOk && searchOk;
    });
  }, [search, cat]);

  return (
    <div
      style={{
        width: 256,
        flexShrink: 0,
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        background: "#FAFAFA",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #E2E8F0" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#94A3B8",
            marginBottom: 8,
          }}
        >
          Modèles
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #E2E8F0",
            fontSize: 12.5,
            background: "white",
            color: "#0F172A",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 10px",
          flexWrap: "wrap",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              background: cat === c ? "#0052D9" : "#F1F5F9",
              color: cat === c ? "white" : "#64748B",
              transition: "all 120ms",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {filtered.map((t) => {
          const category = TEMPLATE_CATEGORY[t.id] ?? "WhatsApp";
          const cc = CATEGORY_COLORS[category]!;
          const nodes = templateNodes(t);
          return (
            <div
              key={t.id}
              onClick={() => onApplyTemplate(t)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                marginBottom: 4,
                cursor: "pointer",
                background: "white",
                border: "1px solid #E2E8F0",
                transition: "all 120ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#93C5FD";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E2E8F0";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#0F172A",
                    lineHeight: 1.3,
                    flex: 1,
                  }}
                >
                  {t.name}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 6,
                    background: cc.bg,
                    color: cc.color,
                    flexShrink: 0,
                    border: `1px solid ${cc.border}33`,
                  }}
                >
                  {category}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 3,
                  marginTop: 7,
                  alignItems: "center",
                }}
              >
                {nodes.map((type, i) => {
                  const cfg = WF_NODE_TYPES[type];
                  return (
                    <Fragment key={i}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}66`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {cfg.iconFn(10)}
                      </div>
                      {i < nodes.length - 1 && (
                        <div
                          style={{
                            width: 8,
                            height: 1,
                            background: "#CBD5E1",
                          }}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#94A3B8",
              marginBottom: 8,
              padding: "0 2px",
            }}
          >
            Ajouter un bloc
          </div>
          {BLOCK_TYPES.map(({ type, backend, label }, i) => {
            const cfg = WF_NODE_TYPES[type];
            return (
              <div
                key={`${type}-${backend}-${i}`}
                onClick={() => onAddStep(backend)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: "white",
                  border: "1px solid #E2E8F0",
                  transition: "border-color 120ms, background 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = cfg.border;
                  e.currentTarget.style.background = `${cfg.bg}80`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.background = "white";
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: cfg.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {cfg.iconFn(12)}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>
                  {label ?? cfg.label}
                </span>
                <Icon size={12} color="#94A3B8" d={ICO.plus} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
