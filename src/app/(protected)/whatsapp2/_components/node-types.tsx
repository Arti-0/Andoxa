// Node type configuration — ported from design/whatsapp/wf-components.jsx
// Colors / labels / icons preserved exactly.

import type { ReactNode } from "react";
import {
  Icon,
  ICO,
  StopIcon,
  ConditionIcon,
  SparklesIcon,
} from "./icons";

export type WfNodeType =
  | "trigger"
  | "condition"
  | "whatsapp"
  | "wait"
  | "crm"
  | "notification"
  | "task"
  | "linkedin"
  | "ai"
  | "end";

export interface WfNodeConfig {
  bg: string;
  border: string;
  color: string;
  label: string;
  iconFn: (size?: number) => ReactNode;
}

export const WF_NODE_TYPES: Record<WfNodeType, WfNodeConfig> = {
  trigger: {
    bg: "#E8F0FD",
    border: "#0052D9",
    color: "#003EA3",
    label: "Déclencheur",
    iconFn: (s = 14) => <Icon size={s} color="#0052D9" fill d={ICO.lightning} />,
  },
  condition: {
    bg: "#FFFBEB",
    border: "#D97706",
    color: "#92400E",
    label: "Condition",
    iconFn: (s = 14) => <ConditionIcon size={s} color="#D97706" />,
  },
  whatsapp: {
    bg: "#ECFDF5",
    border: "#10B981",
    color: "#065F46",
    label: "WhatsApp",
    iconFn: (s = 14) => <Icon size={s} color="#10B981" fill d={ICO.whatsapp} />,
  },
  wait: {
    bg: "#F5F3FF",
    border: "#7C3AED",
    color: "#5B21B6",
    label: "Délai",
    iconFn: (s = 14) => <Icon size={s} color="#7C3AED" d={ICO.clock} />,
  },
  crm: {
    bg: "#EFF6FF",
    border: "#0052D9",
    color: "#1E3A8A",
    label: "CRM",
    iconFn: (s = 14) => <Icon size={s} color="#0052D9" d={ICO.database} />,
  },
  notification: {
    bg: "#FFF7ED",
    border: "#FF6700",
    color: "#C2410C",
    label: "Notification",
    iconFn: (s = 14) => <Icon size={s} color="#FF6700" d={ICO.bell} />,
  },
  task: {
    bg: "#FDF4FF",
    border: "#A855F7",
    color: "#7E22CE",
    label: "Tâche",
    iconFn: (s = 14) => <Icon size={s} color="#A855F7" d={ICO.check} />,
  },
  linkedin: {
    bg: "#EFF6FF",
    border: "#0A66C2",
    color: "#0A66C2",
    label: "LinkedIn",
    iconFn: (s = 14) => <Icon size={s} color="#0A66C2" d={ICO.linkedin} />,
  },
  ai: {
    bg: "#F0FDF4",
    border: "#059669",
    color: "#047857",
    label: "IA",
    iconFn: (s = 14) => <SparklesIcon size={s} color="#059669" />,
  },
  end: {
    bg: "#F9FAFB",
    border: "#6B7280",
    color: "#374151",
    label: "Fin",
    iconFn: (s = 14) => <StopIcon size={s} color="#6B7280" />,
  },
};
