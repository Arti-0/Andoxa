import type {
  WorkflowDefinition,
  WorkflowStep,
} from "./schema";
import type { WorkflowColorKey, WorkflowIconKey } from "./workflow-ui";

export type WorkflowTemplateTrigger =
  | "meeting_booked"
  | "linkedin_invite_accepted"
  | "whatsapp_reply_received"
  | "no_reply_after_days"
  | "crm_status_changed"
  | "new_prospect_in_list"
  | "meeting_no_show"
  | "manual";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  popular?: boolean;
  tags: ("WhatsApp" | "LinkedIn" | "CRM" | "IA")[];
  ui: { icon: WorkflowIconKey; color: WorkflowColorKey };
  trigger: WorkflowTemplateTrigger;
  buildDefinition: () => WorkflowDefinition;
}

const stepId = (() => {
  let n = 0;
  return (prefix: string) => `${prefix}_${++n}_${Math.random().toString(36).slice(2, 6)}`;
})();

function whatsappStep(message: string): WorkflowStep {
  return {
    id: stepId("wa"),
    type: "whatsapp_message",
    config: { messageTemplate: message },
  };
}

function waitStep(durationHours: number, onlyIfNoReply = false): WorkflowStep {
  return {
    id: stepId("wait"),
    type: "wait",
    config: { durationHours, onlyIfNoReply },
  };
}

function chain(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.map((s, i) => ({
    ...s,
    next_id: i < steps.length - 1 ? steps[i + 1]!.id : undefined,
  }));
}

const blankDefinition = (): WorkflowDefinition => ({
  schemaVersion: 1,
  steps: [],
});

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "post-meeting-whatsapp",
    name: "Séquence post-réunion WhatsApp",
    description:
      "Confirmation, rappel J-0, et message de suivi après la réunion.",
    popular: true,
    tags: ["WhatsApp"],
    ui: { icon: "Workflow", color: "emerald" },
    trigger: "meeting_booked",
    buildDefinition: () => {
      const steps = chain([
        whatsappStep(
          "Bonjour {{prenom}}, merci d'avoir réservé un créneau. À très vite !"
        ),
        waitStep(2),
        whatsappStep(
          "Petit rappel — notre échange commence dans 2 heures. À tout de suite."
        ),
        waitStep(24),
        whatsappStep(
          "Bonjour {{prenom}}, ravi de notre échange. Voici les prochaines étapes."
        ),
      ]);
      return { schemaVersion: 1, steps };
    },
  },
  {
    id: "linkedin-welcome-followup",
    name: "LinkedIn → Bienvenue + Suivi",
    description:
      "Squelette de bienvenue après acceptation LinkedIn (placeholder en attendant la réintroduction des étapes LinkedIn).",
    tags: ["LinkedIn", "WhatsApp"],
    ui: { icon: "Users", color: "indigo" },
    trigger: "linkedin_invite_accepted",
    buildDefinition: () => {
      const steps = chain([
        whatsappStep(
          "Bonjour {{prenom}}, merci d'avoir accepté ma demande sur LinkedIn !"
        ),
        waitStep(48),
        whatsappStep(
          "Pour faire connaissance, voici un mot rapide sur ce que je fais : ..."
        ),
      ]);
      return { schemaVersion: 1, steps };
    },
  },
  {
    id: "no-show-recovery",
    name: "Récupération no-show",
    description:
      "Reprise de contact après absence à un rendez-vous, avec proposition de reschedule.",
    tags: ["WhatsApp", "CRM"],
    ui: { icon: "Clock", color: "amber" },
    trigger: "meeting_no_show",
    buildDefinition: () => {
      const steps = chain([
        waitStep(2),
        whatsappStep(
          "Bonjour {{prenom}}, je n'ai pas réussi à vous joindre. Pas de souci, voici un lien pour replanifier : {{lien_reservation}}."
        ),
        waitStep(72, true),
        whatsappStep(
          "Si vous souhaitez toujours échanger, je reste disponible — à bientôt."
        ),
      ]);
      return { schemaVersion: 1, steps };
    },
  },
  {
    id: "post-proposal-followup",
    name: "Suivi post-proposition",
    description:
      "Relance progressive après envoi d'une proposition commerciale.",
    tags: ["WhatsApp", "CRM"],
    ui: { icon: "TrendingUp", color: "blue" },
    trigger: "crm_status_changed",
    buildDefinition: () => {
      const steps = chain([
        waitStep(48, true),
        whatsappStep(
          "Bonjour {{prenom}}, avez-vous eu le temps de regarder la proposition ?"
        ),
        waitStep(96, true),
        whatsappStep(
          "Petite relance — je reste à votre disposition pour en discuter."
        ),
      ]);
      return { schemaVersion: 1, steps };
    },
  },
  {
    id: "reengage-silent-prospects",
    name: "Réengager les prospects silencieux",
    description:
      "Réveiller les contacts inactifs avec un message court et un appel à l'action.",
    tags: ["WhatsApp"],
    ui: { icon: "Zap", color: "rose" },
    trigger: "no_reply_after_days",
    buildDefinition: () => {
      const steps = chain([
        whatsappStep(
          "Bonjour {{prenom}}, on s'était échangé il y a quelques semaines. Toujours d'actualité de votre côté ?"
        ),
        waitStep(72, true),
        whatsappStep(
          "Je vous laisse mon créneau : {{lien_reservation}} — si jamais."
        ),
      ]);
      return { schemaVersion: 1, steps };
    },
  },
  {
    id: "blank",
    name: "Partir de zéro",
    description: "Construire un parcours sans étape pré-remplie.",
    tags: ["WhatsApp"],
    ui: { icon: "Workflow", color: "violet" },
    trigger: "manual",
    buildDefinition: blankDefinition,
  },
];

export function findTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

export const WORKFLOW_TRIGGERS: {
  id: WorkflowTemplateTrigger;
  label: string;
  description: string;
}[] = [
  {
    id: "meeting_booked",
    label: "Réunion réservée",
    description: "Quand un prospect réserve un créneau via votre lien.",
  },
  {
    id: "linkedin_invite_accepted",
    label: "Invitation LinkedIn acceptée",
    description: "Quand une demande LinkedIn est acceptée.",
  },
  {
    id: "whatsapp_reply_received",
    label: "Réponse WhatsApp reçue",
    description: "Dès qu'un prospect répond sur WhatsApp.",
  },
  {
    id: "no_reply_after_days",
    label: "Aucune réponse après X jours",
    description: "Relancer les prospects silencieux.",
  },
  {
    id: "crm_status_changed",
    label: "Statut CRM modifié",
    description: "Quand un prospect change de statut dans le CRM.",
  },
  {
    id: "new_prospect_in_list",
    label: "Nouveau prospect dans une liste",
    description: "À chaque ajout dans une liste de prospection.",
  },
  {
    id: "meeting_no_show",
    label: "No-show à une réunion",
    description: "Le prospect ne s'est pas présenté à la réunion.",
  },
  {
    id: "manual",
    label: "Déclencheur manuel",
    description: "Lancer le parcours à la demande, sans condition.",
  },
];
