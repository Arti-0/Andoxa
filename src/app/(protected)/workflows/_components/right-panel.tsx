"use client";

// Right config panel — visuals from design/whatsapp/wf-components.jsx
// RightConfigPanel. Form fields use .wf-* (scoped under .ws2-root) + theme tokens.

import { type ReactNode, useEffect, useState } from "react";
import {
  Calendar,
  CalendarX,
  Database,
  Hand,
  ListPlus,
  type LucideIcon,
  MessageCircle,
  Megaphone,
  Tag as TagIcon,
} from "lucide-react";
import { Icon, ICO } from "./icons";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";
import type { WorkflowStep } from "@/lib/workflows/schema";
import {
  WORKFLOW_TRIGGER_KIND_OPTIONS,
  WORKFLOW_TRIGGER_CATEGORY_LABELS,
  getTriggerOption,
  type WorkflowTriggerKind,
  type WorkflowTriggerCategory,
} from "@/lib/workflows";
import { useProspectStatuses } from "@/lib/prospects/statuses";
import { LinkedinIcon, WhatsappIcon } from "@/components/marketing/icons/brand-icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRIGGER_NODE_ID } from "./xy-canvas";
import { cn } from "@/lib/utils";

// One lucide icon per trigger kind. LinkedIn / WhatsApp use the brand-icons
// wordmarks for instant channel recognition.
const TRIGGER_ICONS: Record<
  WorkflowTriggerKind,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  on_booking: asLucide(Calendar),
  on_no_show: asLucide(CalendarX),
  on_status_change: asLucide(Database),
  on_linkedin_reply: LinkedinIcon,
  on_whatsapp_reply: WhatsappIcon,
  on_campaign_reply: asLucide(Megaphone),
  on_list_add: asLucide(ListPlus),
  on_tag: asLucide(TagIcon),
  manual: asLucide(Hand),
};

/** Adapter so lucide icons fit the `{size, className}` prop shape used by
 *  the brand-icons (LinkedinIcon / WhatsappIcon). */
function asLucide(
  Cmp: LucideIcon
): React.ComponentType<{ size?: number; className?: string }> {
  function Wrapped({ size = 16, className }: { size?: number; className?: string }) {
    return <Cmp size={size} className={className} />;
  }
  Wrapped.displayName = `LucideAdapter(${Cmp.displayName ?? "Icon"})`;
  return Wrapped;
}

// Used by MessageCircle/etc when we wanted them — kept for tree-shake.
void MessageCircle;

interface RightPanelProps {
  selectedId: string;
  step: WorkflowStep | null;
  triggerKind: WorkflowTriggerKind;
  triggerConfig: Record<string, unknown>;
  onClose: () => void;
  onUpdateStep: (stepId: string, patch: Record<string, unknown>) => void;
  onUpdateTriggerKind: (next: WorkflowTriggerKind) => void;
  onUpdateTriggerConfig: (next: Record<string, unknown>) => void;
  onDeleteStep: (stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
}

const STEP_TYPE_TO_NODE_TYPE: Record<string, WfNodeType> = {
  whatsapp_message: "whatsapp",
  wait: "wait",
  condition: "condition",
  linkedin_invite: "linkedin",
  linkedin_message: "linkedin",
  crm: "crm",
  notification: "notification",
  task: "task",
  end: "end",
};

const sectionTitle =
  "mb-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground";

const infoCallout =
  "rounded-lg border border-border bg-muted/45 p-2 text-[11px] leading-relaxed text-muted-foreground dark:bg-muted/30";

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="wf-label">{children}</label>;
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          value ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-1 size-4 rounded-full bg-background shadow-sm ring-1 ring-black/5 transition-[transform] dark:ring-white/10",
            value ? "translate-x-[18px]" : "translate-x-0",
          )}
          aria-hidden
        />
      </button>
      <span className="text-xs text-muted-foreground">
        {value ? "Activé" : "Désactivé"}
      </span>
    </div>
  );
}

// Trigger picker order — matches the user's spec.
const TRIGGER_CATEGORY_ORDER: WorkflowTriggerCategory[] = [
  "pipeline",
  "reply",
  "list_tag",
  "manual",
];

function TriggerForm({
  triggerKind,
  triggerConfig,
  onUpdateKind,
  onUpdateConfig,
}: {
  triggerKind: WorkflowTriggerKind;
  triggerConfig: Record<string, unknown>;
  onUpdateKind: (next: WorkflowTriggerKind) => void;
  onUpdateConfig: (next: Record<string, unknown>) => void;
}) {
  const grouped: Record<WorkflowTriggerCategory, typeof WORKFLOW_TRIGGER_KIND_OPTIONS> = {
    pipeline: [],
    reply: [],
    list_tag: [],
    manual: [],
  };
  for (const opt of WORKFLOW_TRIGGER_KIND_OPTIONS) grouped[opt.category].push(opt);

  const option = getTriggerOption(triggerKind);
  const ActiveIcon = TRIGGER_ICONS[triggerKind];

  return (
    <>
      <div className="mb-3.5">
        <FieldLabel>Type de déclencheur</FieldLabel>
        <Select
          value={triggerKind}
          onValueChange={(v) => onUpdateKind(v as WorkflowTriggerKind)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {option ? (
                <span className="flex items-center gap-2">
                  <ActiveIcon size={14} className="text-muted-foreground" />
                  <span className="truncate">{option.label}</span>
                </span>
              ) : (
                "Choisir un déclencheur"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_CATEGORY_ORDER.map((cat, i) => (
              <SelectGroup key={cat}>
                {i > 0 && <div className="-mx-1 my-1 h-px bg-border" aria-hidden />}
                <SelectLabel className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                  {WORKFLOW_TRIGGER_CATEGORY_LABELS[cat]}
                </SelectLabel>
                {grouped[cat].map((t) => {
                  const ItemIcon = TRIGGER_ICONS[t.id];
                  return (
                    <SelectItem key={t.id} value={t.id} className="pl-2">
                      <ItemIcon size={14} className="text-muted-foreground" />
                      <span>{t.label}</span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {option && (
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {option.description}
          </p>
        )}
      </div>

      {option?.configTarget === "status" && (
        <TriggerStatusPicker
          value={(triggerConfig.targetStatusId as string | undefined) ?? ""}
          onChange={(v) =>
            onUpdateConfig({ ...triggerConfig, targetStatusId: v || null })
          }
        />
      )}

      {option?.configTarget === "tag" && (
        <TriggerTagPicker
          value={(triggerConfig.targetTagId as string | undefined) ?? ""}
          onChange={(v) =>
            onUpdateConfig({ ...triggerConfig, targetTagId: v || null })
          }
        />
      )}

      {/* on_list_add and on_campaign_reply scopes — kept as free-text UUID
          inputs until dedicated list / campaign-job picker helpers land. */}
      {option?.configTarget === "list" && (
        <div className="mb-3.5">
          <FieldLabel>Liste cible (optionnel)</FieldLabel>
          <input
            value={(triggerConfig.targetListId as string | undefined) ?? ""}
            placeholder="UUID de liste — vide = toutes les listes"
            onChange={(e) =>
              onUpdateConfig({
                ...triggerConfig,
                targetListId: e.target.value.trim() || null,
              })
            }
            className="wf-input box-border"
          />
        </div>
      )}

      {option?.configTarget === "campaign_job" && (
        <div className="mb-3.5">
          <FieldLabel>Campagne cible (optionnel)</FieldLabel>
          <input
            value={(triggerConfig.campaignJobId as string | undefined) ?? ""}
            placeholder="UUID de campagne — vide = toutes"
            onChange={(e) =>
              onUpdateConfig({
                ...triggerConfig,
                campaignJobId: e.target.value.trim() || null,
              })
            }
            className="wf-input box-border"
          />
        </div>
      )}
    </>
  );
}

const ANY_STATUS_VALUE = "__any__";

function TriggerStatusPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { statuses, loading } = useProspectStatuses();
  // Radix Select doesn't allow empty string item values, so we use a sentinel
  // value for "any" and translate at the edges.
  const selectValue = value || ANY_STATUS_VALUE;
  const selected = statuses.find((s) => s.id === value);

  return (
    <div className="mb-3.5">
      <FieldLabel>Statut cible (optionnel)</FieldLabel>
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === ANY_STATUS_VALUE ? "" : v)}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {selected ? (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: selected.color }}
                />
                <span className="truncate">{selected.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Tous les changements</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_STATUS_VALUE} className="pl-2">
            <span className="h-2 w-2 rounded-full bg-muted ring-1 ring-inset ring-black/10" />
            <span>Tous les changements</span>
          </SelectItem>
          {statuses.length > 0 && <div className="-mx-1 my-1 h-px bg-border" aria-hidden />}
          {statuses.map((s) => (
            <SelectItem key={s.id} value={s.id} className="pl-2">
              <span
                className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Laissez vide pour déclencher sur n&apos;importe quel changement.
      </p>
    </div>
  );
}

const ANY_TAG_VALUE = "__any__";

function TriggerTagPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/tags");
        if (!res.ok) return;
        const json = await res.json();
        if (alive) setTags(json.items ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectValue = value || ANY_TAG_VALUE;
  const selected = tags.find((t) => t.id === value);

  return (
    <div className="mb-3.5">
      <FieldLabel>Tag cible (optionnel)</FieldLabel>
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === ANY_TAG_VALUE ? "" : v)}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {selected ? (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: selected.color }}
                />
                <span className="truncate">{selected.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">N&apos;importe quel tag</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_TAG_VALUE} className="pl-2">
            <span className="h-2 w-2 rounded-full bg-muted ring-1 ring-inset ring-black/10" />
            <span>N&apos;importe quel tag</span>
          </SelectItem>
          {tags.length > 0 && <div className="-mx-1 my-1 h-px bg-border" aria-hidden />}
          {tags.map((t) => (
            <SelectItem key={t.id} value={t.id} className="pl-2">
              <span
                className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: t.color }}
              />
              <span>{t.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
      <div className={sectionTitle}>Délai d&apos;attente</div>
      <div className="mb-3.5">
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
          className="wf-input box-border"
        />
      </div>
      <div className="mb-3.5">
        <FieldLabel>Conditionnel</FieldLabel>
        <Toggle
          value={!!cfg.onlyIfNoReply}
          onChange={(v) => onUpdate({ onlyIfNoReply: v })}
        />
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
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
      <div className={sectionTitle}>{label}</div>
      <div className="mb-3.5">
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
          className="wf-textarea min-h-[144px] leading-normal font-[inherit]"
        />
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          Variables disponibles : <code>{"{{firstName}}"}</code>,{" "}
          <code>{"{{lastName}}"}</code>, <code>{"{{company}}"}</code>.
        </p>
      </div>
    </>
  );
}

function CrmForm({
  step,
  onUpdate,
}: {
  step: WorkflowStep & { type: "crm" };
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const cfg = step.config as {
    field?: string;
    value?: string;
    notifyOwner?: boolean;
  };
  const field = cfg.field ?? "status";

  // Statuses now come from the workspace's prospect_statuses table (Phase 1).
  // For the legacy "priority" field — see known-bug note: the column doesn't
  // exist on prospects yet, so the action will fail at runtime if selected.
  const { statuses, loading } = useProspectStatuses();

  return (
    <>
      <div className={sectionTitle}>Mise à jour CRM</div>
      <div className="mb-3.5">
        <FieldLabel>Champ à modifier</FieldLabel>
        <select
          value={field}
          onChange={(e) => onUpdate({ field: e.target.value })}
          className="wf-select box-border"
        >
          <option value="status">Statut</option>
          <option value="priority">Priorité (non disponible — à venir)</option>
        </select>
      </div>
      <div className="mb-3.5">
        <FieldLabel>Nouvelle valeur</FieldLabel>
        {field === "status" ? (
          <select
            value={cfg.value ?? ""}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="wf-select box-border"
            disabled={loading}
          >
            <option value="">— Choisir un statut —</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={cfg.value ?? ""}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="ex : haute"
            className="wf-input box-border"
          />
        )}
      </div>
      <div className="mb-3.5">
        <FieldLabel>Notifier le propriétaire</FieldLabel>
        <Toggle
          value={!!cfg.notifyOwner}
          onChange={(v) => onUpdate({ notifyOwner: v })}
        />
      </div>
    </>
  );
}

function NotificationForm({
  step,
  onUpdate,
}: {
  step: WorkflowStep & { type: "notification" };
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const cfg = step.config as { message?: string; priority?: string };
  const [draft, setDraft] = useState(cfg.message ?? "");
  useEffect(() => {
    setDraft(cfg.message ?? "");
  }, [cfg.message]);
  return (
    <>
      <div className={sectionTitle}>Notification interne</div>
      <div className="mb-3.5">
        <FieldLabel>Message</FieldLabel>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== (cfg.message ?? "")) {
              onUpdate({ message: draft });
            }
          }}
          rows={4}
          placeholder="Aucun consentement WhatsApp pour {{firstName}}…"
          className="wf-textarea min-h-[112px] leading-normal font-[inherit]"
        />
      </div>
      <div className="mb-3.5">
        <FieldLabel>Priorité</FieldLabel>
        <select
          value={cfg.priority ?? "normal"}
          onChange={(e) => onUpdate({ priority: e.target.value })}
          className="wf-select box-border"
        >
          <option value="normal">Normale</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>
    </>
  );
}

function TaskForm({
  step,
  onUpdate,
}: {
  step: WorkflowStep & { type: "task" };
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const cfg = step.config as { title?: string; dueInHours?: number };
  const [draft, setDraft] = useState(cfg.title ?? "");
  useEffect(() => {
    setDraft(cfg.title ?? "");
  }, [cfg.title]);
  return (
    <>
      <div className={sectionTitle}>Création de tâche</div>
      <div className="mb-3.5">
        <FieldLabel>Titre</FieldLabel>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== (cfg.title ?? "")) {
              onUpdate({ title: draft });
            }
          }}
          placeholder="Relancer {{firstName}} manuellement"
          className="wf-input box-border"
        />
      </div>
      <div className="mb-3.5">
        <FieldLabel>Échéance (heures)</FieldLabel>
        <input
          type="number"
          min={0}
          value={cfg.dueInHours ?? 48}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 0) {
              onUpdate({ dueInHours: n });
            }
          }}
          className="wf-input box-border"
        />
      </div>
    </>
  );
}

function EndForm() {
  return (
    <>
      <div className={sectionTitle}>Fin du parcours</div>
      <p className={cn(infoCallout, "text-xs leading-relaxed text-foreground/90")}>
        Quand un prospect atteint cette étape, son parcours est marqué comme
        terminé. Aucune autre étape ne sera exécutée pour lui.
      </p>
    </>
  );
}

function ConditionForm() {
  return (
    <>
      <div className={sectionTitle}>Configuration de la condition</div>
      <div className="mb-3.5">
        <FieldLabel>Type de condition</FieldLabel>
        <select value="prospect_replied" disabled className="wf-select box-border opacity-70">
          <option value="prospect_replied">Le prospect a répondu</option>
        </select>
      </div>
      <p className={infoCallout}>
        Une seule condition est supportée pour le moment :{" "}
        <strong className="text-foreground">Le prospect a répondu ?</strong>. Les branches Oui/Non sont
        définies par les liens dans le canvas.
      </p>
    </>
  );
}

export function RightPanel({
  selectedId,
  step,
  triggerKind,
  triggerConfig,
  onClose,
  onUpdateStep,
  onUpdateTriggerKind,
  onUpdateTriggerConfig,
  onDeleteStep,
  onDuplicateStep,
}: RightPanelProps) {
  const isTrigger = selectedId === TRIGGER_NODE_ID;
  const nodeType: WfNodeType = isTrigger
    ? "trigger"
    : step
      ? (STEP_TYPE_TO_NODE_TYPE[step.type] ?? "end")
      : "end";
  const cfg = WF_NODE_TYPES[nodeType];
  const headline = isTrigger
    ? (WORKFLOW_TRIGGER_KIND_OPTIONS.find((t) => t.id === triggerKind)?.label ??
      "Déclencheur")
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
                : step.type === "crm"
                  ? "Mettre à jour le CRM"
                  : step.type === "notification"
                    ? "Notifier l'équipe"
                    : step.type === "task"
                      ? "Créer une tâche"
                      : step.type === "end"
                        ? "Fin du parcours"
                        : "Étape"
      : "Étape introuvable";

  return (
    <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <div
          style={{
            background: cfg.bg,
            borderColor: `${cfg.border}44`,
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border"
        >
          {cfg.iconFn(16)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">
            {headline}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex cursor-pointer items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Fermer"
        >
          <Icon size={14} color="currentColor" d={ICO.x} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isTrigger ? (
          <TriggerForm
            triggerKind={triggerKind}
            triggerConfig={triggerConfig}
            onUpdateKind={onUpdateTriggerKind}
            onUpdateConfig={onUpdateTriggerConfig}
          />
        ) : !step ? (
          <p className="text-sm text-muted-foreground">Étape introuvable.</p>
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
        ) : step.type === "crm" ? (
          <CrmForm
            step={step as WorkflowStep & { type: "crm" }}
            onUpdate={(p) => onUpdateStep(step.id, p)}
          />
        ) : step.type === "notification" ? (
          <NotificationForm
            step={step as WorkflowStep & { type: "notification" }}
            onUpdate={(p) => onUpdateStep(step.id, p)}
          />
        ) : step.type === "task" ? (
          <TaskForm
            step={step as WorkflowStep & { type: "task" }}
            onUpdate={(p) => onUpdateStep(step.id, p)}
          />
        ) : step.type === "end" ? (
          <EndForm />
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune configuration disponible pour ce type.
          </p>
        )}

        {!isTrigger && step && (
          <div className="mt-2 flex gap-1.5 border-t border-border pt-3.5">
            <button
              type="button"
              onClick={() => onDuplicateStep(step.id)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Icon size={12} color="currentColor" d={ICO.copy} />
              Dupliquer
            </button>
            <button
              type="button"
              onClick={() => onDeleteStep(step.id)}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-destructive/35 bg-destructive/10 px-2.5 py-1.5 text-[12.5px] text-destructive transition-colors hover:bg-destructive/15 dark:border-destructive/45 dark:bg-destructive/15"
              aria-label="Supprimer"
            >
              <Icon size={12} color="currentColor" d={ICO.trash} />
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <p className="text-center text-[11px] text-muted-foreground">
          Les modifications sont enregistrées au prochain clic sur{" "}
          <strong className="text-foreground">Enregistrer</strong>.
        </p>
      </div>
    </div>
  );
}
