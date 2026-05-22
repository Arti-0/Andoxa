/**
 * Canonical workflow templates shipped with the product.
 *
 * Each template has:
 *   - `triggerKind` — the *actual* trigger that fires the workflow at runtime
 *     (one of WorkflowTriggerKind from trigger-kind.ts). Wired by the wizard
 *     onto the new `workflows.trigger_kind` column and matched at emit time.
 *   - `triggerConfigStatusKey?` — for status-targeted triggers (on_status_change,
 *     on_tag), the per-org `key` whose UUID the wizard resolves and writes
 *     into `workflows.trigger_config.targetStatusId`. Empty → "any change".
 *   - `trigger` — legacy enum kept ONLY so the existing wizard/mapping code
 *     that reads `template.trigger` keeps compiling. It mirrors triggerKind
 *     in spirit. Once every consumer migrates to triggerKind we can delete
 *     this field.
 *   - `buildDefinition()` — returns the graph (steps + entry_step_id).
 *
 * The three templates below are the org-default catalogue every workspace
 * sees in the wizard. They are NOT auto-seeded as workflow rows; instead
 * the user instantiates one and the resulting workflow row is fully owned
 * by the org (deletable, editable, activatable like any other workflow).
 */

import type {
  WorkflowDefinition,
  WorkflowStep,
} from "./schema";
import type { WorkflowColorKey, WorkflowIconKey } from "./workflow-ui";
import type { WorkflowTriggerKind } from "./trigger-kind";

export type WorkflowTemplateTrigger =
  | "meeting_booked"
  | "meeting_no_show"
  | "crm_status_changed"
  | "manual";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  popular?: boolean;
  tags: ("WhatsApp" | "LinkedIn" | "CRM" | "IA")[];
  ui: { icon: WorkflowIconKey; color: WorkflowColorKey };
  /** Legacy: kept for back-compat with existing consumers. */
  trigger: WorkflowTemplateTrigger;
  /** Source of truth — used for `workflows.trigger_kind` at instantiation. */
  triggerKind: WorkflowTriggerKind;
  /** When set, the wizard resolves <org>.prospect_statuses.key = X → uuid
   *  and writes `{ targetStatusId: <uuid> }` into trigger_config. */
  triggerConfigStatusKey?: string;
  buildDefinition: () => WorkflowDefinition;
}

// ---------------------------------------------------------------------------
// Step factories — keep step ids stable within a single buildDefinition() call
// so the graph can wire next_id / on_true_id / on_false_id deterministically.
// ---------------------------------------------------------------------------

let stepCounter = 0;
function uid(prefix: string): string {
  stepCounter += 1;
  return `${prefix}_${stepCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

function whatsapp(message: string, next_id?: string): WorkflowStep {
  return {
    id: uid("wa"),
    type: "whatsapp_message",
    config: { messageTemplate: message },
    next_id,
  };
}

function wait(durationHours: number, opts: { onlyIfNoReply?: boolean; next_id?: string } = {}): WorkflowStep {
  return {
    id: uid("wait"),
    type: "wait",
    config: { durationHours, onlyIfNoReply: opts.onlyIfNoReply ?? false },
    next_id: opts.next_id,
  };
}

function crm(statusKey: string, opts: { notifyOwner?: boolean; next_id?: string } = {}): WorkflowStep {
  return {
    id: uid("crm"),
    type: "crm",
    config: { field: "status", value: statusKey, notifyOwner: opts.notifyOwner ?? false },
    next_id: opts.next_id,
  };
}

function notification(message: string, opts: { priority?: "normal" | "high" | "urgent"; next_id?: string } = {}): WorkflowStep {
  return {
    id: uid("notif"),
    type: "notification",
    config: { message, priority: opts.priority ?? "normal" },
    next_id: opts.next_id,
  };
}

function task(title: string, opts: { dueInHours?: number; next_id?: string } = {}): WorkflowStep {
  return {
    id: uid("task"),
    type: "task",
    config: { title, dueInHours: opts.dueInHours ?? 48 },
    next_id: opts.next_id,
  };
}

function condition(opts: { on_true_id?: string; on_false_id?: string } = {}): WorkflowStep {
  return {
    id: uid("cond"),
    type: "condition",
    config: { conditionType: "prospect_replied" },
    on_true_id: opts.on_true_id,
    on_false_id: opts.on_false_id,
  };
}

/** Chain a list of LINEAR steps by setting each next_id to the following id. */
function chain(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.map((s, i) => {
    const next = steps[i + 1];
    if (!next) return s;
    // Conditions branch via on_true_id/on_false_id, not next_id.
    if (s.type === "condition") return s;
    return { ...s, next_id: next.id };
  });
}

// ---------------------------------------------------------------------------
// TEMPLATE 1 — Pré-RDV WhatsApp
//   Trigger: Réunion réservée (on_booking)
//   Goal: reduce no-shows via confirmation + automatic reminders.
//
//   NOTE on timing: the user spec calls for "J-1" and "H-2" (relative to the
//   meeting time). The current `wait` step only supports a fixed hour
//   duration — it has no access to the booked event's start_time. We
//   approximate with absolute delays (24h then 22h after the previous step).
//   For meetings booked far in advance, switch the durations or add a
//   "wait until event_time - X" mode in a follow-up.
// ---------------------------------------------------------------------------
const preRdvWhatsappTemplate: WorkflowTemplate = {
  id: "pre-rdv-whatsapp",
  name: "Pré-RDV WhatsApp",
  description:
    "Réduisez les no-shows : confirmation immédiate, rappel J-1 et rappel final H-2 avant le rendez-vous.",
  popular: true,
  tags: ["WhatsApp"],
  ui: { icon: "Workflow", color: "emerald" },
  trigger: "meeting_booked",
  triggerKind: "on_booking",
  buildDefinition: () => {
    const steps = chain([
      whatsapp(
        "Bonjour {{firstName}}, votre RDV est bien confirmé. À très vite !"
      ),
      wait(24), // approx J-1
      whatsapp(
        "Petit rappel — notre échange est prévu demain. À demain !"
      ),
      wait(22), // approx H-2
      whatsapp(
        "Notre RDV est dans 2 heures. À tout de suite !"
      ),
    ]);
    return { schemaVersion: 1, steps, entry_step_id: steps[0]!.id };
  },
};

// ---------------------------------------------------------------------------
// TEMPLATE 2 — Récupération no-show
//   Trigger: No-show à une réunion (on_no_show)
//
//   Sequence:
//     1. CRM → noshow
//     2. Wait 2h
//     3. WhatsApp soft re-engagement
//     4. Wait 48h
//     5. Condition: prospect_replied?
//        ✅ Oui  → CRM → rdv_replanifier
//        ❌ Non → Notification interne ("relancer manuellement")
// ---------------------------------------------------------------------------
const noShowRecoveryTemplate: WorkflowTemplate = {
  id: "recuperation-no-show",
  name: "Récupération no-show",
  description:
    "Recontactez rapidement un prospect absent : tag no-show, relance douce, puis branchement selon sa réponse.",
  popular: true,
  tags: ["WhatsApp", "CRM"],
  ui: { icon: "Clock", color: "amber" },
  trigger: "meeting_no_show",
  triggerKind: "on_no_show",
  buildDefinition: () => {
    // Build leaf steps first so condition can reference their ids.
    const yesBranch = crm("rdv_replanifier");
    const noBranch = notification(
      "Le prospect n'a pas répondu après le no-show — à relancer manuellement.",
      { priority: "high" }
    );
    const cond = condition({ on_true_id: yesBranch.id, on_false_id: noBranch.id });
    const wait2 = wait(48, { next_id: cond.id });
    const wa = whatsapp(
      "Bonjour {{firstName}}, je n'ai pas réussi à vous joindre. Pas de souci, voici un lien pour replanifier dès que cela vous convient.",
      wait2.id
    );
    const wait1 = wait(2, { next_id: wa.id });
    const setNoShow = crm("noshow", { next_id: wait1.id });
    const steps: WorkflowStep[] = [setNoShow, wait1, wa, wait2, cond, yesBranch, noBranch];
    return { schemaVersion: 1, steps, entry_step_id: setNoShow.id };
  },
};

// ---------------------------------------------------------------------------
// TEMPLATE 3 — Suivi post-RDV
//   Trigger: Statut CRM modifié → RDV réalisé
//
//   Sequence:
//     1. Wait 2h
//     2. WhatsApp (merci + point clé)
//     3. Wait 72h
//     4. Condition: prospect_replied?
//        ✅ Oui  → Notification interne ("réponse reçue")
//        ❌ Non →
//             WhatsApp (relance douce)
//             Wait 96h
//             Condition: prospect_replied?
//                 ✅ Oui  → Notification interne ("réponse tardive")
//                 ❌ Non → Créer une tâche ("décision manuelle")
// ---------------------------------------------------------------------------
const followUpPostRdvTemplate: WorkflowTemplate = {
  id: "suivi-post-rdv",
  name: "Suivi post-RDV",
  description:
    "Gardez le momentum après un RDV réalisé : remerciement, relance conditionnelle, puis tâche manuelle si silence.",
  popular: true,
  tags: ["WhatsApp", "CRM"],
  ui: { icon: "TrendingUp", color: "blue" },
  trigger: "crm_status_changed",
  triggerKind: "on_status_change",
  triggerConfigStatusKey: "rdv_realise",
  buildDefinition: () => {
    // Build the deepest leaves first.
    const yes2 = notification(
      "Le prospect a fini par répondre — à toi de prendre la suite."
    );
    const no2 = task(
      "Décider manuellement de la suite (relance / clôture)",
      { dueInHours: 24 }
    );
    const cond2 = condition({ on_true_id: yes2.id, on_false_id: no2.id });
    const wait3 = wait(96, { next_id: cond2.id }); // J+4
    const waRelance = whatsapp(
      "Bonjour {{firstName}}, je relance simplement : avez-vous eu le temps d'y réfléchir ?",
      wait3.id
    );

    // First condition.
    const yes1 = notification(
      "Le prospect a répondu après le RDV — passer à la suite commerciale."
    );
    const cond1 = condition({ on_true_id: yes1.id, on_false_id: waRelance.id });
    const wait2 = wait(72, { next_id: cond1.id }); // J+3
    const waMerci = whatsapp(
      "Bonjour {{firstName}}, merci pour notre échange. Un point clé que j'ai retenu : …",
      wait2.id
    );
    const wait1 = wait(2, { next_id: waMerci.id });

    const steps: WorkflowStep[] = [
      wait1,
      waMerci,
      wait2,
      cond1,
      yes1,
      waRelance,
      wait3,
      cond2,
      yes2,
      no2,
    ];
    return { schemaVersion: 1, steps, entry_step_id: wait1.id };
  },
};

// ---------------------------------------------------------------------------
// Public template catalogue. The order here drives the wizard's left-panel
// listing (Pré-RDV first as the most discoverable starting point).
// ---------------------------------------------------------------------------
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  preRdvWhatsappTemplate,
  noShowRecoveryTemplate,
  followUpPostRdvTemplate,
];

export function findTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Legacy export — preserved so existing wizard pickers keep compiling. The
// trigger picker on the workflow detail page already uses the new
// WORKFLOW_TRIGGER_KIND_OPTIONS (trigger-kind.ts); this list is only used
// by the wizard's UI-metadata bookkeeping.
// ---------------------------------------------------------------------------
export const WORKFLOW_TRIGGERS: {
  id: WorkflowTemplateTrigger;
  label: string;
  description: string;
}[] = [
  {
    id: "meeting_booked",
    label: "Réunion réservée",
    description: "Quand un prospect réserve un créneau via votre page booking.",
  },
  {
    id: "meeting_no_show",
    label: "No-show à une réunion",
    description: "Le prospect ne s'est pas présenté à la réunion.",
  },
  {
    id: "crm_status_changed",
    label: "Statut CRM modifié",
    description: "Quand un prospect change de statut dans le CRM.",
  },
  {
    id: "manual",
    label: "Déclencheur manuel",
    description: "Lancer le parcours à la demande, sans condition.",
  },
];
