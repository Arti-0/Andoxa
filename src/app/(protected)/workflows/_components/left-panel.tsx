"use client";

// Left panel — visuals from design/whatsapp/wf-components.jsx LeftTemplatePanel.
// Theme: uses bg-background / bg-card / border-border so dark mode matches the app shell.

import { Fragment, useMemo, useState } from "react";
import { Icon, ICO } from "./icons";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
} from "@/lib/workflows";
import type { WorkflowStepType } from "@/lib/workflows/schema";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  WhatsApp: { bg: "#ECFDF5", color: "#065F46", border: "#10B981" },
  LinkedIn: { bg: "#EFF6FF", color: "#0A66C2", border: "#0A66C2" },
  CRM: { bg: "#EFF6FF", color: "#1E3A8A", border: "#2563EB" },
  IA: { bg: "#F0FDF4", color: "#047857", border: "#059669" },
};

// Map each template id → category chip rendered on its card. New ids match
// the 3 canonical templates in src/lib/workflows/templates.ts.
const TEMPLATE_CATEGORY: Record<string, "WhatsApp" | "LinkedIn" | "CRM" | "IA"> = {
  "pre-rdv-whatsapp": "WhatsApp",
  "recuperation-no-show": "CRM",
  "suivi-post-rdv": "CRM",
};

/** Mini node preview — derives the step types from the template's definition.
 *  Caps at 6 nodes so the chip strip stays readable on dense templates. */
function templateNodes(t: WorkflowTemplate): WfNodeType[] {
  const def = t.buildDefinition();
  const out: WfNodeType[] = ["trigger"];
  for (const s of def.steps) {
    if (s.type === "whatsapp_message") out.push("whatsapp");
    else if (s.type === "wait") out.push("wait");
    else if (s.type === "condition") out.push("condition");
    else if (s.type === "linkedin_invite" || s.type === "linkedin_message") out.push("linkedin");
    else if (s.type === "crm") out.push("crm");
    else if (s.type === "notification") out.push("notification");
    else if (s.type === "task") out.push("task");
  }
  if (out.length > 7) return [...out.slice(0, 6), "end"];
  return out.length > 1 ? out : ["trigger"];
}

/** Block types the user can insert. The order mirrors the design palette. */
type BlockChoice = {
  type: WfNodeType;
  backend: WorkflowStepType;
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
    <div className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-background">
      <div className="border-b border-border px-3.5 pb-2.5 pt-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Modèles
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="wf-input box-border text-[12.5px]"
        />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-2.5 py-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "cursor-pointer rounded-md border-none px-2 py-0.5 text-[11px] font-semibold transition-colors",
              cat === c
                ? "bg-(--brand-blue) text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map((t) => {
          const category = TEMPLATE_CATEGORY[t.id] ?? "WhatsApp";
          const cc = CATEGORY_COLORS[category]!;
          const nodes = templateNodes(t);
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onApplyTemplate(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onApplyTemplate(t);
                }
              }}
              className="mb-1 cursor-pointer rounded-[10px] border border-border bg-card p-2.5 transition-colors hover:border-(--brand-blue)/35 dark:hover:border-blue-400/40"
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex-1 text-[12.5px] font-semibold leading-snug text-foreground">
                  {t.name}
                </div>
                <span
                  style={{
                    background: cc.bg,
                    color: cc.color,
                    borderColor: `${cc.border}33`,
                  }}
                  className="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold dark:opacity-95"
                >
                  {category}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {nodes.map((type, i) => {
                  const cfg = WF_NODE_TYPES[type];
                  return (
                    <Fragment key={`${type}-${i}`}>
                      <div
                        style={{
                          background: cfg.bg,
                          borderColor: `${cfg.border}66`,
                        }}
                        className="flex size-5 items-center justify-center rounded-md border"
                      >
                        {cfg.iconFn(10)}
                      </div>
                      {i < nodes.length - 1 && (
                        <div className="h-px w-2 bg-border" />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-3 border-t border-border pt-2.5">
          <div className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Ajouter un bloc
          </div>
          {BLOCK_TYPES.map(({ type, backend, label }, i) => {
            const cfg = WF_NODE_TYPES[type];
            return (
              <button
                type="button"
                key={`${type}-${backend}-${i}`}
                onClick={() => onAddStep(backend)}
                className="mb-0.5 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-primary/35 hover:bg-accent/60"
              >
                <div
                  style={{
                    background: cfg.bg,
                  }}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md border border-black/5 dark:border-white/10"
                >
                  {cfg.iconFn(12)}
                </div>
                <span className="flex-1 text-xs font-medium text-foreground">
                  {label ?? cfg.label}
                </span>
                <span className="text-muted-foreground">
                  <Icon size={12} color="currentColor" d={ICO.plus} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
