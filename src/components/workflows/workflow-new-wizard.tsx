"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarOff,
  Check,
  ChevronLeft,
  Clock,
  Database,
  Hand,
  Loader2,
  ListPlus,
  MessageCircle,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WORKFLOW_COLOR_KEYS,
  WORKFLOW_ICON_KEYS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGERS,
  type WorkflowColorKey,
  type WorkflowIconKey,
  type WorkflowTemplate,
  type WorkflowTemplateTrigger,
} from "@/lib/workflows";
import { toast } from "sonner";
import { toastFromApiError } from "@/lib/toast";
import { WorkflowListIcon } from "./workflow-list-icon";

type WizardStepNum = 1 | 2 | 3;

const TRIGGER_ICONS: Record<WorkflowTemplateTrigger, LucideIcon> = {
  meeting_booked: Calendar,
  linkedin_invite_accepted: UserPlus,
  whatsapp_reply_received: MessageCircle,
  no_reply_after_days: Clock,
  crm_status_changed: Database,
  new_prospect_in_list: ListPlus,
  meeting_no_show: CalendarOff,
  manual: Hand,
};

const COLOR_SWATCH_CLASS: Record<WorkflowColorKey, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
};

const TAG_CLASS: Record<"WhatsApp" | "LinkedIn" | "CRM" | "IA", string> = {
  WhatsApp:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  LinkedIn:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  CRM: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
  IA: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
};

export function WorkflowNewPageClient() {
  const router = useRouter();

  const [stepNum, setStepNum] = useState<WizardStepNum>(1);
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [trigger, setTrigger] = useState<WorkflowTemplateTrigger | null>(null);
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<WorkflowIconKey>("Workflow");
  const [colorKey, setColorKey] = useState<WorkflowColorKey>("violet");
  const [submitting, setSubmitting] = useState(false);

  // When picking a template, prefill defaults so step 3 isn't blank.
  function selectTemplate(tpl: WorkflowTemplate) {
    setTemplate(tpl);
    setTrigger(tpl.trigger);
    setIconKey(tpl.ui.icon);
    setColorKey(tpl.ui.color);
    if (!name.trim()) setName(tpl.id === "blank" ? "" : tpl.name);
  }

  function nextDisabled(): boolean {
    if (stepNum === 1) return template == null;
    if (stepNum === 2) return trigger == null;
    if (stepNum === 3) return name.trim().length === 0;
    return false;
  }

  async function handleSave() {
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
          draft_definition: template.buildDefinition(),
          ui: { icon: iconKey, color: colorKey, trigger },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Enregistrement impossible");
      }
      const id = json.data.id as string;
      toast.success("Parcours enregistré");
      router.push(`/workflows/${id}`);
    } catch (e) {
      toastFromApiError(e, "Enregistrement impossible");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/workflows" aria-label="Retour">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">Nouveau parcours</p>
              <p className="text-xs text-muted-foreground">
                Choisissez un modèle, un déclencheur, puis nommez votre parcours.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stepNum > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepNum((s) => (s - 1) as WizardStepNum)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1">Précédent</span>
              </Button>
            )}
            {stepNum < 3 ? (
              <Button
                type="button"
                disabled={nextDisabled()}
                onClick={() => setStepNum((s) => (s + 1) as WizardStepNum)}
              >
                <span className="mr-1">Suivant</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting || nextDisabled()}
                onClick={handleSave}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Créer le parcours
              </Button>
            )}
          </div>
        </div>
        <Stepper current={stepNum} />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {stepNum === 1 && (
            <TemplateStep selected={template} onSelect={selectTemplate} />
          )}
          {stepNum === 2 && (
            <TriggerStep selected={trigger} onSelect={setTrigger} />
          )}
          {stepNum === 3 && (
            <MetadataStep
              name={name}
              setName={setName}
              iconKey={iconKey}
              setIconKey={setIconKey}
              colorKey={colorKey}
              setColorKey={setColorKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: WizardStepNum }) {
  const labels: Record<WizardStepNum, string> = {
    1: "Point de départ",
    2: "Déclencheur",
    3: "Informations",
  };
  return (
    <div className="mt-4 flex items-center gap-2">
      {([1, 2, 3] as WizardStepNum[]).map((n, i) => {
        const active = current === n;
        const done = current > n;
        return (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                done && "bg-emerald-500 text-white border-emerald-500",
                active && "bg-foreground text-background border-foreground",
                !done && !active && "bg-muted text-muted-foreground border-muted"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </div>
            <p
              className={cn(
                "truncate text-xs",
                active
                  ? "font-medium text-foreground"
                  : done
                    ? "text-foreground/70"
                    : "text-muted-foreground"
              )}
            >
              {labels[n]}
            </p>
            {i < 2 && (
              <div
                className={cn(
                  "h-px flex-1",
                  done ? "bg-emerald-500" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TemplateStep({
  selected,
  onSelect,
}: {
  selected: WorkflowTemplate | null;
  onSelect: (tpl: WorkflowTemplate) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Quel est votre point de départ ?
        </h2>
        <p className="text-sm text-muted-foreground">
          Partez d&apos;un modèle pré-rempli ou construisez votre parcours à partir
          de zéro.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {WORKFLOW_TEMPLATES.map((tpl) => {
          const isActive = selected?.id === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all",
                "hover:border-foreground/20 hover:shadow-sm",
                isActive &&
                  "border-foreground/40 ring-2 ring-foreground/10 shadow-sm"
              )}
            >
              {tpl.popular && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  Populaire
                </span>
              )}
              <WorkflowListIcon
                icon={tpl.ui.icon}
                color={tpl.ui.color}
                className="h-10 w-10"
              />
              <div className="space-y-1">
                <p className="font-medium leading-tight">{tpl.name}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {tpl.description}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {tpl.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className={cn(
                      "border px-1.5 py-0 text-[10px] font-medium",
                      TAG_CLASS[t]
                    )}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TriggerStep({
  selected,
  onSelect,
}: {
  selected: WorkflowTemplateTrigger | null;
  onSelect: (t: WorkflowTemplateTrigger) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Quel déclencheur lance le parcours ?
        </h2>
        <p className="text-sm text-muted-foreground">
          C&apos;est l&apos;événement à partir duquel chaque contact entre dans le
          parcours.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {WORKFLOW_TRIGGERS.map((t) => {
          const Icon = TRIGGER_ICONS[t.id];
          const isActive = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all",
                "hover:border-foreground/20 hover:shadow-sm",
                isActive &&
                  "border-foreground/40 ring-2 ring-foreground/10 shadow-sm"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-medium leading-tight">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetadataStep({
  name,
  setName,
  iconKey,
  setIconKey,
  colorKey,
  setColorKey,
}: {
  name: string;
  setName: (s: string) => void;
  iconKey: WorkflowIconKey;
  setIconKey: (k: WorkflowIconKey) => void;
  colorKey: WorkflowColorKey;
  setColorKey: (k: WorkflowColorKey) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Comment voulez-vous le retrouver ?
        </h2>
        <p className="text-sm text-muted-foreground">
          Donnez un nom et un repère visuel à votre parcours.
        </p>
      </div>
      <div className="space-y-6 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="wf-name">Nom du parcours</Label>
          <Input
            id="wf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Suivi post-démo"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label>Icône</Label>
          <div className="flex flex-wrap gap-2">
            {WORKFLOW_ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setIconKey(key)}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg border transition-all",
                  iconKey === key
                    ? "border-foreground/40 ring-2 ring-foreground/10"
                    : "border-border hover:border-foreground/20"
                )}
                aria-label={key}
                aria-pressed={iconKey === key}
              >
                <WorkflowListIcon icon={key} color={colorKey} className="h-9 w-9" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Couleur</Label>
          <div className="flex flex-wrap gap-2">
            {WORKFLOW_COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColorKey(c)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border transition-all",
                  colorKey === c
                    ? "border-foreground/40 ring-2 ring-foreground/10"
                    : "border-border hover:border-foreground/20"
                )}
                aria-label={c}
                aria-pressed={colorKey === c}
              >
                <span
                  className={cn(
                    "h-7 w-7 rounded-full",
                    COLOR_SWATCH_CLASS[c]
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
