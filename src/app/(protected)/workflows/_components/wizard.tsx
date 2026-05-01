"use client";

// Wizard — visuals from design/whatsapp/Create Workflow.html.
// Templates and triggers come from src/lib/workflows/templates.ts so the
// definition produced by the wizard matches the canvas reading code.

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon, ICO } from "./icons";
import {
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGERS,
  type WorkflowTemplate,
  type WorkflowTemplateTrigger,
} from "@/lib/workflows";
import { toastFromApiError } from "@/lib/toast";

const TRIGGER_ICONS: Record<
  WorkflowTemplateTrigger,
  { d: string; color: string; bg: string }
> = {
  meeting_booked: { d: ICO.calendar, color: "#0052D9", bg: "#E8F0FD" },
  linkedin_invite_accepted: { d: ICO.linkedin, color: "#0A66C2", bg: "#EFF6FF" },
  whatsapp_reply_received: { d: ICO.whatsapp, color: "#10B981", bg: "#ECFDF5" },
  no_reply_after_days: { d: ICO.clock, color: "#7C3AED", bg: "#F5F3FF" },
  crm_status_changed: { d: ICO.database, color: "#0052D9", bg: "#EFF6FF" },
  new_prospect_in_list: { d: ICO.user_plus, color: "#FF6700", bg: "#FFF7ED" },
  meeting_no_show: { d: ICO.bell, color: "#DC2626", bg: "#FFF1F2" },
  manual: { d: ICO.cursor, color: "#64748B", bg: "#F1F5F9" },
};

// Map each template id → list of design tags so the cards still surface a
// channel hint (the backend WorkflowTemplate doesn't carry tags).
const TEMPLATE_TAGS: Record<string, string[]> = {
  "post-meeting-whatsapp": ["WhatsApp", "CRM"],
  "linkedin-welcome-followup": ["LinkedIn"],
  "no-show-recovery": ["WhatsApp", "CRM"],
  "post-proposal-followup": ["IA", "CRM"],
  "reengage-silent-prospects": ["IA", "WhatsApp"],
  blank: [],
};

const TAG_COLOR: Record<string, [string, string]> = {
  WhatsApp: ["#ECFDF5", "#065F46"],
  LinkedIn: ["#EFF6FF", "#0A66C2"],
  CRM: ["#EFF6FF", "#1E3A8A"],
  IA: ["#F0FDF4", "#047857"],
};

const STEPS = [
  { n: 1, label: "Point de départ" },
  { n: 2, label: "Déclencheur" },
  { n: 3, label: "Informations" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginBottom: 56,
        maxWidth: 640,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <Fragment key={s.n}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  background: done || active ? "#0052D9" : "#F1F5F9",
                  color: done || active ? "white" : "#94A3B8",
                  border: done || active ? "none" : "2px solid #E2E8F0",
                  transition: "all 200ms",
                  flexShrink: 0,
                }}
              >
                {done ? <Icon size={14} color="white" d={ICO.check} /> : s.n}
              </div>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#0F172A" : done ? "#64748B" : "#94A3B8",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: s.n < current ? "#0052D9" : "#E2E8F0",
                  margin: "0 20px",
                  minWidth: 56,
                  maxWidth: 120,
                  transition: "background 300ms",
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function Step1({
  selected,
  onSelect,
}: {
  selected: WorkflowTemplate | null;
  onSelect: (t: WorkflowTemplate) => void;
}) {
  return (
    <div className="andoxa-fade-up">
      <h2
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#0F172A",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Comment souhaitez-vous commencer ?
      </h2>
      <p
        style={{
          fontSize: 14.5,
          color: "#64748B",
          marginBottom: 36,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Choisissez un modèle prêt à l&apos;emploi ou créez un workflow
        personnalisé depuis zéro.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {WORKFLOW_TEMPLATES.map((t) => {
          const sel = selected?.id === t.id;
          const tags = TEMPLATE_TAGS[t.id] ?? [];
          const isScratch = t.id === "blank";
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              onMouseEnter={(e) => {
                if (!sel) e.currentTarget.style.borderColor = "#93C5FD";
              }}
              onMouseLeave={(e) => {
                if (!sel) e.currentTarget.style.borderColor = "#E2E8F0";
              }}
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                border: `2px solid ${sel ? "#0052D9" : "#E2E8F0"}`,
                background: sel
                  ? "#E8F0FD"
                  : isScratch
                    ? "#F8FAFC"
                    : "white",
                cursor: "pointer",
                transition: "all 150ms",
                position: "relative",
                boxShadow: sel ? "0 0 0 1px rgba(0,82,217,0.15)" : "none",
              }}
            >
              {t.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    background: "#FF6700",
                    color: "white",
                    padding: "2px 7px",
                    borderRadius: 10,
                  }}
                >
                  Populaire
                </div>
              )}
              {sel && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#0052D9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={11} color="white" d={ICO.check} />
                </div>
              )}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isScratch ? "#F1F5F9" : "#E8F0FD",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Icon
                  size={18}
                  color={isScratch ? "#64748B" : "#0052D9"}
                  d={isScratch ? ICO.plus_circle : ICO.template}
                />
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#0F172A",
                  marginBottom: 5,
                  lineHeight: 1.3,
                  paddingRight: t.popular ? 60 : 0,
                }}
              >
                {t.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  lineHeight: 1.5,
                  marginBottom: 10,
                }}
              >
                {t.description}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {tags.map((tag) => {
                  const c = TAG_COLOR[tag] ?? ["#F1F5F9", "#64748B"];
                  return (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 5,
                        background: c[0],
                        color: c[1],
                      }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step2({
  selected,
  onSelect,
}: {
  selected: WorkflowTemplateTrigger | null;
  onSelect: (id: WorkflowTemplateTrigger) => void;
}) {
  return (
    <div className="andoxa-fade-up">
      <h2
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#0F172A",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Quel est le déclencheur ?
      </h2>
      <p
        style={{
          fontSize: 14.5,
          color: "#64748B",
          marginBottom: 36,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Sélectionnez l&apos;événement qui démarrera automatiquement ce workflow.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          maxWidth: 800,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {WORKFLOW_TRIGGERS.map((t) => {
          const sel = selected === t.id;
          const ico = TRIGGER_ICONS[t.id];
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t.id)}
              onMouseEnter={(e) => {
                if (!sel) e.currentTarget.style.borderColor = "#93C5FD";
              }}
              onMouseLeave={(e) => {
                if (!sel) e.currentTarget.style.borderColor = "#E2E8F0";
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 12,
                border: `2px solid ${sel ? "#0052D9" : "#E2E8F0"}`,
                background: sel ? "#E8F0FD" : "white",
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: sel ? ico.bg : "#F8FAFC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: `1px solid ${sel ? ico.color + "33" : "#E2E8F0"}`,
                  transition: "all 150ms",
                }}
              >
                <Icon
                  size={18}
                  color={sel ? ico.color : "#94A3B8"}
                  d={ico.d}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: sel ? "#0052D9" : "#0F172A",
                    marginBottom: 3,
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}
                >
                  {t.description}
                </div>
              </div>
              {sel && (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#0052D9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={11} color="white" d={ICO.check} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12.5, color: "#94A3B8", minWidth: 120 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: color ?? "#0F172A",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Step3({
  name,
  setName,
  desc,
  setDesc,
  trigger,
  template,
}: {
  name: string;
  setName: (s: string) => void;
  desc: string;
  setDesc: (s: string) => void;
  trigger: WorkflowTemplateTrigger | null;
  template: WorkflowTemplate | null;
}) {
  const trig = trigger ? WORKFLOW_TRIGGERS.find((t) => t.id === trigger) : null;
  const trigColor = trigger ? TRIGGER_ICONS[trigger].color : "#94A3B8";
  return (
    <div
      className="andoxa-fade-up"
      style={{
        maxWidth: 600,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <h2
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#0F172A",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Nommez votre workflow
      </h2>
      <p
        style={{
          fontSize: 14.5,
          color: "#64748B",
          marginBottom: 36,
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        Donnez un nom clair à votre workflow pour le retrouver facilement dans
        la liste.
      </p>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Nom du workflow <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex : Séquence post-réunion — Q3 2025"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid #E2E8F0",
            fontSize: 14,
            color: "#0F172A",
            background: "white",
            transition: "all 150ms",
            outline: "none",
          }}
        />
      </div>
      <div style={{ marginBottom: 28 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Description{" "}
          <span style={{ fontSize: 12, fontWeight: 400, color: "#94A3B8" }}>
            (optionnel)
          </span>
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="Décrivez l'objectif de ce workflow..."
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid #E2E8F0",
            fontSize: 14,
            color: "#0F172A",
            background: "white",
            resize: "vertical",
            transition: "all 150ms",
            lineHeight: 1.5,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div
        style={{
          background: "#F8FAFC",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "#94A3B8",
            marginBottom: 14,
          }}
        >
          Récapitulatif
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SummaryRow
            label="Point de départ"
            value={template ? template.name : "—"}
            color="#0052D9"
          />
          <SummaryRow
            label="Déclencheur"
            value={trig ? trig.label : "—"}
            color={trigColor}
          />
          <SummaryRow
            label="Nom"
            value={
              name || (
                <span style={{ color: "#CBD5E1", fontStyle: "italic" }}>
                  Non renseigné
                </span>
              )
            }
          />
          <div
            style={{ height: 1, background: "#E2E8F0", margin: "4px 0" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#94A3B8",
              }}
            />
            <span style={{ fontSize: 12.5, color: "#64748B" }}>
              Statut initial :{" "}
              <strong style={{ color: "#0F172A" }}>Brouillon</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WizardClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [trigger, setTrigger] = useState<WorkflowTemplateTrigger | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // When the template changes, prefill the name and pre-select the template's
  // recommended trigger (mirrors the design's behavior).
  useEffect(() => {
    if (!template) return;
    if (template.id === "blank") {
      setTrigger(null);
      return;
    }
    if (!name.trim()) setName(template.name);
    setTrigger(template.trigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const canNext =
    step === 1 ? !!template : step === 2 ? !!trigger : !!name.trim();

  async function handleSubmit() {
    if (!template || !trigger) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Indiquez un nom.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmed,
          description: desc.trim() || template.description,
          draft_definition: template.buildDefinition(),
          ui: { icon: template.ui.icon, color: template.ui.color, trigger },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Création impossible");
      }
      const id = json.data.id as string;
      toast.success("Workflow créé");
      router.push(`/workflows/${id}`);
    } catch (e) {
      toastFromApiError(e, "Création impossible");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    else void handleSubmit();
  }

  function handlePrev() {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
    else router.push("/workflows");
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "white",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 56,
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/workflows")}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0052D9")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#64748B",
            fontSize: 13,
            fontWeight: 500,
            transition: "color 120ms",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Icon size={14} color="currentColor" d={ICO.arrow_left} />
          Retour aux workflows
        </button>
        <div style={{ width: 1, height: 20, background: "#E2E8F0" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
          Créer un workflow
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "64px 48px 48px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 960 }}>
          <StepIndicator current={step} />
          {step === 1 && <Step1 selected={template} onSelect={setTemplate} />}
          {step === 2 && (
            <Step2 selected={trigger} onSelect={setTrigger} />
          )}
          {step === 3 && (
            <Step3
              name={name}
              setName={setName}
              desc={desc}
              setDesc={setDesc}
              trigger={trigger}
              template={template}
            />
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div
        style={{
          height: 68,
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          flexShrink: 0,
          background: "white",
        }}
      >
        <button
          onClick={handlePrev}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            background: "white",
            fontSize: 13.5,
            fontWeight: 500,
            color: "#374151",
            cursor: "pointer",
          }}
        >
          <Icon size={14} color="#374151" d={ICO.arrow_left} />
          {step === 1 ? "Annuler" : "Retour"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "#94A3B8" }}>
            {step} / {STEPS.length}
          </span>
          <button
            onClick={handleNext}
            disabled={!canNext || submitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 22px",
              borderRadius: 10,
              border: "none",
              background: canNext && !submitting ? "#0052D9" : "#CBD5E1",
              fontSize: 13.5,
              fontWeight: 600,
              color: "white",
              cursor: canNext && !submitting ? "pointer" : "not-allowed",
              transition: "all 150ms",
            }}
          >
            {step === 3
              ? submitting
                ? "Création…"
                : "Créer le workflow"
              : "Continuer"}
            {step < 3 && <Icon size={14} color="white" d={ICO.arrow_right} />}
            {step === 3 && !submitting && (
              <Icon size={14} color="white" d={ICO.lightning} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
