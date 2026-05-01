import {
  Bell,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  Database,
  GitBranch,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Sparkles,
  Square,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Lucide icon name for serialization / mapping */
export type StepLabelIconName =
  | "Bell"
  | "CheckCircle2"
  | "Clock"
  | "CornerDownLeft"
  | "Database"
  | "GitBranch"
  | "MessageCircle"
  | "MessageSquare"
  | "Smartphone"
  | "Sparkles"
  | "Square"
  | "UserPlus"
  | "Zap";

export type StepTypeDisplay = {
  label: string;
  description: string;
  icon: StepLabelIconName;
};

const ICON_BY_NAME: Record<StepLabelIconName, LucideIcon> = {
  Bell,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  Database,
  GitBranch,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Sparkles,
  Square,
  UserPlus,
  Zap,
};

/** Human-readable French labels (canonical types from `WorkflowStepType`). */
export const STEP_TYPE_LABELS: Record<string, StepTypeDisplay> = {
  condition: {
    label: "Condition",
    description: "Bifurquer selon la réponse du prospect",
    icon: "GitBranch",
  },
  linkedin_invite: {
    label: "Invitation LinkedIn",
    description: "Envoyer une demande de connexion",
    icon: "UserPlus",
  },
  linkedin_message: {
    label: "Message LinkedIn",
    description: "Envoyer un message à une relation",
    icon: "MessageSquare",
  },
  whatsapp_message: {
    label: "Message WhatsApp",
    description: "Envoyer un message WhatsApp",
    icon: "MessageCircle",
  },
  wait: {
    label: "Délai d'attente",
    description: "Attendre avant l'étape suivante",
    icon: "Clock",
  },
  crm: {
    label: "Mise à jour CRM",
    description: "Modifier le statut ou la priorité du prospect",
    icon: "Database",
  },
  notification: {
    label: "Notification interne",
    description: "Envoyer une notification à l'équipe",
    icon: "Bell",
  },
  task: {
    label: "Créer une tâche",
    description: "Créer un rappel pour un membre de l'équipe",
    icon: "CheckCircle2",
  },
  end: {
    label: "Fin",
    description: "Terminer le parcours pour ce prospect",
    icon: "Square",
  },
  /** Alias / future — kept for API strings or older data */
  send_invite: {
    label: "Invitation LinkedIn",
    description: "Envoyer une demande de connexion",
    icon: "UserPlus",
  },
  send_message: {
    label: "Message LinkedIn",
    description: "Envoyer un message à une relation",
    icon: "MessageSquare",
  },
  send_whatsapp: {
    label: "Message WhatsApp",
    description: "Envoyer un message WhatsApp",
    icon: "MessageCircle",
  },
  wait_reply: {
    label: "Attendre une réponse",
    description: "Passer à la suite si réponse reçue",
    icon: "CornerDownLeft",
  },
};

function capitalizeRawType(stepType: string): string {
  if (!stepType) return "";
  return stepType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function getStepLabel(stepType: string): StepTypeDisplay {
  const found = STEP_TYPE_LABELS[stepType];
  if (found) return found;
  return {
    label: capitalizeRawType(stepType) || stepType,
    description: "",
    icon: "Zap",
  };
}

export function getStepTypeLucideIcon(stepType: string): LucideIcon {
  const name = getStepLabel(stepType).icon;
  return ICON_BY_NAME[name] ?? Zap;
}
