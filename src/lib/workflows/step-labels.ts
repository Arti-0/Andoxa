import {
  Clock,
  CornerDownLeft,
  MessageCircle,
  MessageSquare,
  Smartphone,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Lucide icon name for serialization / mapping */
export type StepLabelIconName =
  | "Clock"
  | "CornerDownLeft"
  | "MessageCircle"
  | "MessageSquare"
  | "Smartphone"
  | "UserPlus"
  | "Zap";

export type StepTypeDisplay = {
  label: string;
  description: string;
  icon: StepLabelIconName;
};

const ICON_BY_NAME: Record<StepLabelIconName, LucideIcon> = {
  Clock,
  CornerDownLeft,
  MessageCircle,
  MessageSquare,
  Smartphone,
  UserPlus,
  Zap,
};

/** Human-readable French labels (canonical types from `WorkflowStepType`). */
export const STEP_TYPE_LABELS: Record<string, StepTypeDisplay> = {
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
