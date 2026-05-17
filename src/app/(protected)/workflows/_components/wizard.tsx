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
import { cn } from "@/lib/utils";

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
    <div className="mx-auto mb-14 flex max-w-[640px] items-center justify-center gap-0">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <Fragment key={s.n}>
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-all",
                  done || active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Icon size={14} color="currentColor" d={ICO.check} /> : s.n}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[13.5px]",
                  active && "font-semibold text-foreground",
                  done && !active && "text-muted-foreground",
                  !active && !done && "text-muted-foreground/70",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-5 h-px min-w-14 max-w-[120px] flex-1 transition-colors",
                  s.n < current ? "bg-primary" : "bg-border",
                )}
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
      <h2 className="mb-2 text-center text-[26px] font-bold tracking-tight text-foreground">
        Comment souhaitez-vous commencer ?
      </h2>
      <p className="mx-auto mb-9 max-w-[560px] text-center text-[14.5px] leading-snug text-muted-foreground">
        Choisissez un modèle prêt à l&apos;emploi ou créez un workflow
        personnalisé depuis zéro.
      </p>
      <div className="grid grid-cols-3 gap-3.5">
        {WORKFLOW_TEMPLATES.map((t) => {
          const sel = selected?.id === t.id;
          const tags = TEMPLATE_TAGS[t.id] ?? [];
          const isScratch = t.id === "blank";
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(t);
                }
              }}
              className={cn(
                "relative cursor-pointer rounded-[14px] border-2 p-4 pb-5 transition-colors",
                sel
                  ? "border-primary bg-primary/10 ring-1 ring-primary/25 dark:bg-primary/15"
                  : "border-border bg-card hover:border-primary/40",
                isScratch &&
                  !sel &&
                  "bg-muted/35 hover:bg-muted/50 dark:bg-muted/25",
              )}
            >
              {sel ? (
                <div className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon size={11} color="currentColor" d={ICO.check} />
                </div>
              ) : (
                t.popular && (
                  <div className="absolute right-2.5 top-2.5 rounded-[10px] bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-orange-500">
                    Populaire
                  </div>
                )
              )}
              <div
                className={cn(
                  "mb-2.5 flex size-9 items-center justify-center rounded-[10px]",
                  isScratch
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/12 text-primary",
                )}
              >
                <Icon
                  size={18}
                  color="currentColor"
                  d={isScratch ? ICO.plus_circle : ICO.template}
                />
              </div>
              <div
                className={cn(
                  "mb-1.5 text-[13.5px] font-bold leading-snug text-foreground",
                  t.popular ? "pr-14" : undefined,
                  sel && !t.popular ? "pr-10" : undefined,
                )}
              >
                {t.name}
              </div>
              <div className="mb-2.5 text-xs leading-snug text-muted-foreground">
                {t.description}
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => {
                  const c = TAG_COLOR[tag] ?? ["#F1F5F9", "#64748B"];
                  return (
                    <span
                      key={tag}
                      style={{ background: c[0], color: c[1] }}
                      className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold ring-1 ring-black/5 dark:ring-white/10"
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
      <h2 className="mb-2 text-center text-[26px] font-bold tracking-tight text-foreground">
        Quel est le déclencheur ?
      </h2>
      <p className="mx-auto mb-9 max-w-[560px] text-center text-[14.5px] leading-snug text-muted-foreground">
        Sélectionnez l&apos;événement qui démarrera automatiquement ce workflow.
      </p>
      <div className="mx-auto grid max-w-[800px] grid-cols-2 gap-3">
        {WORKFLOW_TRIGGERS.map((t) => {
          const sel = selected === t.id;
          const ico = TRIGGER_ICONS[t.id];
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(t.id);
                }
              }}
              className={cn(
                "flex cursor-pointer items-start gap-3.5 rounded-xl border-2 px-4 py-3.5 transition-colors",
                sel
                  ? "border-primary bg-primary/10 ring-1 ring-primary/25 dark:bg-primary/15"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div
                style={{
                  background: sel ? ico.bg : undefined,
                  borderColor: sel ? `${ico.color}33` : undefined,
                }}
                className={cn(
                  "flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border",
                  !sel && "border-border bg-muted",
                  sel && "border-transparent",
                )}
              >
                <span className={sel ? "" : "text-muted-foreground"}>
                  <Icon
                    size={18}
                    color={sel ? ico.color : "currentColor"}
                    d={ico.d}
                  />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "mb-1 text-[13.5px] font-bold",
                    sel ? "text-primary" : "text-foreground",
                  )}
                >
                  {t.label}
                </div>
                <div className="text-xs leading-snug text-muted-foreground">
                  {t.description}
                </div>
              </div>
              {sel && (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon size={11} color="currentColor" d={ICO.check} />
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
    <div className="flex items-center gap-2.5">
      <span className="min-w-[120px] text-[12.5px] text-muted-foreground">
        {label}
      </span>
      <span
        style={color ? { color } : undefined}
        className={cn(
          "text-[13px] font-semibold",
          !color && "text-foreground",
        )}
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
    <div className="andoxa-fade-up mx-auto max-w-[600px]">
      <h2 className="mb-2 text-center text-[26px] font-bold tracking-tight text-foreground">
        Nommez votre workflow
      </h2>
      <p className="mb-9 text-center text-[14.5px] leading-snug text-muted-foreground">
        Donnez un nom clair à votre workflow pour le retrouver facilement dans
        la liste.
      </p>

      <div className="mb-5">
        <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
          Nom du workflow <span className="text-destructive">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex : Séquence post-réunion — Q3 2025"
          className="w-full rounded-[10px] border-[1.5px] border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="mb-7">
        <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
          Description{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optionnel)
          </span>
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="Décrivez l'objectif de ce workflow..."
          className="w-full resize-y rounded-[10px] border-[1.5px] border-input bg-background px-3.5 py-2.5 font-[inherit] text-sm leading-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="rounded-[14px] border border-border bg-muted/45 p-5 dark:bg-muted/30">
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Récapitulatif
        </div>
        <div className="flex flex-col gap-2.5">
          <SummaryRow
            label="Point de départ"
            value={template ? template.name : "—"}
            color="var(--primary)"
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
                <span className="italic text-muted-foreground/70">
                  Non renseigné
                </span>
              )
            }
          />
          <div className="my-1 h-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-muted-foreground/50" />
            <span className="text-[12.5px] text-muted-foreground">
              Statut initial :{" "}
              <strong className="text-foreground">Brouillon</strong>
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8 pt-6 sm:px-10 md:pb-12 md:pt-10 lg:px-12">
        <div className="mx-auto flex min-h-full w-full max-w-[960px] flex-col justify-center py-6 md:py-10">
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

      <div className="flex h-[68px] shrink-0 items-center justify-between gap-4 border-t border-border bg-card px-6 sm:px-12">
        <button
          type="button"
          onClick={handlePrev}
          className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-border bg-background px-[18px] py-2 text-[13.5px] font-medium text-foreground hover:bg-accent"
        >
          <Icon size={14} color="currentColor" d={ICO.arrow_left} />
          {step === 1 ? "Annuler" : "Retour"}
        </button>
        <div className="flex items-center gap-2.5">
          <span className="text-[12.5px] text-muted-foreground">
            {step} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext || submitting}
            className={cn(
              "flex items-center gap-1.5 rounded-[10px] border-none px-[22px] py-2.5 text-[13.5px] font-semibold transition-colors",
              canNext && !submitting
                ? "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground opacity-70",
            )}
          >
            {step === 3
              ? submitting
                ? "Création…"
                : "Créer le workflow"
              : "Continuer"}
            {step < 3 && canNext && !submitting && (
              <Icon size={14} color="currentColor" d={ICO.arrow_right} />
            )}
            {step === 3 && !submitting && canNext && (
              <Icon size={14} color="currentColor" d={ICO.lightning} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
