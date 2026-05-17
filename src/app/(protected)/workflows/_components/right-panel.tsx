"use client";

// Right config panel — visuals from design/whatsapp/wf-components.jsx
// RightConfigPanel. Form fields use .wf-* (scoped under .ws2-root) + theme tokens.

import { type ReactNode, useEffect, useState } from "react";
import { Icon, ICO } from "./icons";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";
import type { WorkflowStep } from "@/lib/workflows/schema";
import {
  WORKFLOW_TRIGGERS,
  WORKFLOW_TRIGGER_KIND_OPTIONS,
  type WorkflowTemplateTrigger,
  type WorkflowTriggerKind,
} from "@/lib/workflows";
import { TRIGGER_NODE_ID } from "./xy-canvas";
import { cn } from "@/lib/utils";

interface RightPanelProps {
  selectedId: string;
  step: WorkflowStep | null;
  trigger: WorkflowTemplateTrigger | null;
  triggerKind: WorkflowTriggerKind;
  onClose: () => void;
  onUpdateStep: (stepId: string, patch: Record<string, unknown>) => void;
  onUpdateTrigger: (next: WorkflowTemplateTrigger | null) => void;
  onUpdateTriggerKind: (next: WorkflowTriggerKind) => void;
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

function TriggerKindForm({
  triggerKind,
  onUpdate,
}: {
  triggerKind: WorkflowTriggerKind;
  onUpdate: (next: WorkflowTriggerKind) => void;
}) {
  return (
    <div className="mb-5">
      <FieldLabel>Type d&apos;automatisation (enregistré en base)</FieldLabel>
      <select
        value={triggerKind}
        onChange={(e) => onUpdate(e.target.value as WorkflowTriggerKind)}
        className="wf-select box-border"
      >
        {WORKFLOW_TRIGGER_KIND_OPTIONS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {WORKFLOW_TRIGGER_KIND_OPTIONS.find((t) => t.id === triggerKind)
          ?.description ?? ""}
      </p>
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
      <div className={sectionTitle}>Configuration du déclencheur</div>
      <div className="mb-3.5">
        <FieldLabel>Scénario marketing (métadonnées)</FieldLabel>
        <select
          value={trigger ?? ""}
          onChange={(e) =>
            onUpdate((e.target.value || null) as WorkflowTemplateTrigger | null)
          }
          className="wf-select box-border"
        >
          <option value="">Aucun</option>
          {WORKFLOW_TRIGGERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <p className={infoCallout}>
        Le libellé ci-dessus sert au canvas et à la simulation. Le routage
        automatique utilisera le <strong className="text-foreground">type d&apos;automatisation</strong>{" "}
        (champ <code className="text-xs">trigger_kind</code>) une fois les écouteurs branchés côté
        serveur.
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
          <option value="priority">Priorité</option>
        </select>
      </div>
      <div className="mb-3.5">
        <FieldLabel>Nouvelle valeur</FieldLabel>
        <input
          value={cfg.value ?? ""}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder={
            field === "status"
              ? "ex : Réunion effectuée"
              : "ex : haute"
          }
          className="wf-input box-border"
        />
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
  trigger,
  triggerKind,
  onClose,
  onUpdateStep,
  onUpdateTrigger,
  onUpdateTriggerKind,
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
          <div
            style={{ color: cfg.color }}
            className="text-[11px] font-bold uppercase tracking-wide"
          >
            {cfg.label}
          </div>
          <div className="truncate text-[13px] font-semibold text-foreground">
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
          <>
            <TriggerKindForm
              triggerKind={triggerKind}
              onUpdate={onUpdateTriggerKind}
            />
            <TriggerForm trigger={trigger} onUpdate={onUpdateTrigger} />
          </>
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
