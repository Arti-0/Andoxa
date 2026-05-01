// Client-side workflow simulation.
//
// Walks the in-memory definition against a synthetic prospect, reporting at
// each step what would happen if the workflow ran for real. No network calls,
// no DB writes — pure preview. Used by the "Tester" toolbar button so users
// can validate logic without enrolling anyone.

import type {
  WorkflowDefinition,
  WorkflowStep,
} from "@/lib/workflows/schema";
import {
  WORKFLOW_TRIGGERS,
  type WorkflowTemplateTrigger,
} from "@/lib/workflows";

export type SimEntryStatus = "ok" | "warn" | "stop";

export interface SimEntry {
  stepId: string;
  stepType: string;
  status: SimEntryStatus;
  title: string;
  detail?: string;
}

export interface SimResult {
  ok: boolean;
  entries: SimEntry[];
  /** True when simulation reached an explicit `end` step or had no successor. */
  reachedEnd: boolean;
}

/** Minimal synthetic prospect used to resolve {{firstName}} / {{phone}} etc. */
const SAMPLE_PROSPECT = {
  full_name: "Alice Demo",
  first_name: "Alice",
  last_name: "Demo",
  email: "alice.demo@example.com",
  phone: "+33 6 00 00 00 00",
  company: "Acme Corp",
  job_title: "Head of Growth",
  linkedin: "https://www.linkedin.com/in/alice-demo/",
};

/** Mirrors lib/unipile/campaign#applyMessageVariables for client-side preview. */
function resolveTemplate(template: string): string {
  return template
    .replace(/\{\{\s*firstName\s*\}\}/g, SAMPLE_PROSPECT.first_name)
    .replace(/\{\{\s*lastName\s*\}\}/g, SAMPLE_PROSPECT.last_name)
    .replace(/\{\{\s*fullName\s*\}\}/g, SAMPLE_PROSPECT.full_name)
    .replace(/\{\{\s*company\s*\}\}/g, SAMPLE_PROSPECT.company)
    .replace(/\{\{\s*jobTitle\s*\}\}/g, SAMPLE_PROSPECT.job_title)
    .replace(/\{\{\s*email\s*\}\}/g, SAMPLE_PROSPECT.email)
    .replace(/\{\{\s*phone\s*\}\}/g, SAMPLE_PROSPECT.phone);
}

function summariseStep(
  step: WorkflowStep,
  visitsLeft: { value: number },
  branchChoice: boolean
): SimEntry {
  switch (step.type) {
    case "wait": {
      const cfg = step.config as {
        durationHours?: number;
        onlyIfNoReply?: boolean;
      };
      const h = Number(cfg.durationHours);
      const base = Number.isFinite(h)
        ? h >= 24
          ? `${Math.round(h / 24)} jour${h >= 48 ? "s" : ""}`
          : `${h} heure${h > 1 ? "s" : ""}`
        : "—";
      return {
        stepId: step.id,
        stepType: step.type,
        status: "ok",
        title: `Attendrait ${base}`,
        detail: cfg.onlyIfNoReply
          ? "Annulé si Alice répond pendant ce délai."
          : undefined,
      };
    }
    case "whatsapp_message": {
      const cfg = step.config as { messageTemplate?: string };
      const text = resolveTemplate(cfg.messageTemplate ?? "");
      return {
        stepId: step.id,
        stepType: step.type,
        status: text ? "ok" : "warn",
        title: `Enverrait WhatsApp à ${SAMPLE_PROSPECT.phone}`,
        detail: text || "(message vide — l'étape échouerait)",
      };
    }
    case "linkedin_message": {
      const cfg = step.config as { messageTemplate?: string };
      const text = resolveTemplate(cfg.messageTemplate ?? "");
      return {
        stepId: step.id,
        stepType: step.type,
        status: text ? "ok" : "warn",
        title: `Enverrait un message LinkedIn à ${SAMPLE_PROSPECT.full_name}`,
        detail: text || "(message vide — l'étape échouerait)",
      };
    }
    case "linkedin_invite": {
      const cfg = step.config as { messageTemplate?: string };
      const note = resolveTemplate(cfg.messageTemplate ?? "");
      return {
        stepId: step.id,
        stepType: step.type,
        status: "ok",
        title: `Enverrait une invitation LinkedIn à ${SAMPLE_PROSPECT.full_name}`,
        detail: note ? `Note : "${note}"` : "Sans note.",
      };
    }
    case "condition": {
      return {
        stepId: step.id,
        stepType: step.type,
        status: "ok",
        title: branchChoice
          ? "Condition : Alice a répondu — branche Oui"
          : "Condition : Alice n'a pas répondu — branche Non",
      };
    }
    case "crm": {
      const cfg = step.config as {
        field?: string;
        value?: string;
        notifyOwner?: boolean;
      };
      return {
        stepId: step.id,
        stepType: step.type,
        status: cfg.value ? "ok" : "warn",
        title: cfg.value
          ? `Mettrait à jour ${cfg.field ?? "status"} → ${cfg.value}`
          : "(valeur CRM manquante)",
        detail: cfg.notifyOwner ? "Notifierait également le propriétaire." : undefined,
      };
    }
    case "notification": {
      const cfg = step.config as { message?: string; priority?: string };
      const msg = resolveTemplate(cfg.message ?? "");
      return {
        stepId: step.id,
        stepType: step.type,
        status: msg ? "ok" : "warn",
        title: msg
          ? `Notifierait l'équipe : "${msg}"`
          : "(message manquant — l'étape échouerait)",
        detail: cfg.priority && cfg.priority !== "normal"
          ? `Priorité : ${cfg.priority}`
          : undefined,
      };
    }
    case "task": {
      const cfg = step.config as { title?: string; dueInHours?: number };
      const title = resolveTemplate(cfg.title ?? "");
      return {
        stepId: step.id,
        stepType: step.type,
        status: title ? "ok" : "warn",
        title: title
          ? `Créerait une tâche : "${title}"`
          : "(titre de tâche manquant)",
        detail: cfg.dueInHours
          ? `Échéance : dans ${cfg.dueInHours} h`
          : undefined,
      };
    }
    case "end": {
      visitsLeft.value = 0;
      return {
        stepId: step.id,
        stepType: step.type,
        status: "stop",
        title: "Termine le parcours pour Alice",
      };
    }
    default:
      return {
        stepId: (step as { id: string }).id,
        stepType: (step as { type: string }).type,
        status: "warn",
        title: "Étape non reconnue",
      };
  }
}

function nextStepId(step: WorkflowStep, branchChoice: boolean): string | undefined {
  if (step.type === "condition") {
    const cond = step as WorkflowStep & {
      on_true_id?: string;
      on_false_id?: string;
    };
    return branchChoice ? cond.on_true_id : cond.on_false_id;
  }
  return "next_id" in step ? step.next_id : undefined;
}

export function simulateWorkflow(
  def: WorkflowDefinition,
  trigger: WorkflowTemplateTrigger | null
): SimResult {
  const entries: SimEntry[] = [];
  const stepById = new Map<string, WorkflowStep>();
  for (const s of def.steps) stepById.set(s.id, s);

  // Trigger entry — display-only, since the backend doesn't model triggers
  // as steps.
  if (trigger) {
    const triggerLabel =
      WORKFLOW_TRIGGERS.find((t) => t.id === trigger)?.label ?? trigger;
    entries.push({
      stepId: "__trigger__",
      stepType: "trigger",
      status: "ok",
      title: `Déclencheur : ${triggerLabel}`,
      detail: "La simulation suppose que le déclencheur s'est produit.",
    });
  } else {
    entries.push({
      stepId: "__trigger__",
      stepType: "trigger",
      status: "warn",
      title: "Aucun déclencheur configuré",
      detail:
        "Le workflow ne démarrera pas automatiquement tant qu'un déclencheur n'est pas choisi.",
    });
  }

  let currentId = def.entry_step_id ?? def.steps[0]?.id;
  if (!currentId) {
    return {
      ok: false,
      entries: [
        ...entries,
        {
          stepId: "__no_entry__",
          stepType: "info",
          status: "warn",
          title: "Aucune étape — rien à exécuter",
        },
      ],
      reachedEnd: false,
    };
  }

  const visited = new Set<string>();
  const visitsLeft = { value: 50 };
  let reachedEnd = false;

  // For deterministic preview: condition flips on each visit.
  let conditionToggle = true;

  while (currentId && visitsLeft.value > 0) {
    const step = stepById.get(currentId);
    if (!step) {
      entries.push({
        stepId: currentId,
        stepType: "missing",
        status: "warn",
        title: `Étape introuvable : ${currentId}`,
      });
      break;
    }
    if (visited.has(step.id)) {
      entries.push({
        stepId: step.id,
        stepType: step.type,
        status: "warn",
        title: "Boucle détectée — arrêt de la simulation",
      });
      break;
    }
    visited.add(step.id);
    visitsLeft.value -= 1;

    const branchChoice = step.type === "condition" ? conditionToggle : false;
    const entry = summariseStep(step, visitsLeft, branchChoice);
    entries.push(entry);
    if (step.type === "condition") conditionToggle = !conditionToggle;
    if (entry.status === "stop") {
      reachedEnd = true;
      break;
    }

    const nextId = nextStepId(step, branchChoice);
    if (!nextId) {
      entries.push({
        stepId: step.id,
        stepType: "info",
        status: "stop",
        title: "Fin du parcours — plus d'étape suivante",
      });
      reachedEnd = true;
      break;
    }
    currentId = nextId;
  }

  return {
    ok: !entries.some((e) => e.status === "warn"),
    entries,
    reachedEnd,
  };
}
