"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Clock,
  GitBranch,
  MessageCircle,
  Linkedin,
  UserPlus,
  Users,
  Bell,
  ClipboardList,
  Flag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStep, WorkflowStepType } from "@/lib/workflows";

export type StepNodeData = {
  step: WorkflowStep;
  label: string;
  subtitle?: string;
  configured: boolean;
};

const TYPE_STYLES: Record<
  WorkflowStepType,
  { icon: LucideIcon; chip: string; ring: string; iconBg: string; iconColor: string }
> = {
  whatsapp_message: {
    icon: MessageCircle,
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    ring: "ring-emerald-200/60 dark:ring-emerald-900/40",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  wait: {
    icon: Clock,
    chip: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    ring: "ring-violet-200/60 dark:ring-violet-900/40",
    iconBg: "bg-violet-50 dark:bg-violet-950/60",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  condition: {
    icon: GitBranch,
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    ring: "ring-amber-200/60 dark:ring-amber-900/40",
    iconBg: "bg-amber-50 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  linkedin_invite: {
    icon: UserPlus,
    chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    ring: "ring-blue-200/60 dark:ring-blue-900/40",
    iconBg: "bg-blue-50 dark:bg-blue-950/60",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  linkedin_message: {
    icon: Linkedin,
    chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    ring: "ring-blue-200/60 dark:ring-blue-900/40",
    iconBg: "bg-blue-50 dark:bg-blue-950/60",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  crm: {
    icon: Users,
    chip: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-900",
    ring: "ring-slate-200/60 dark:ring-slate-900/40",
    iconBg: "bg-slate-50 dark:bg-slate-950/60",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
  notification: {
    icon: Bell,
    chip: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
    ring: "ring-sky-200/60 dark:ring-sky-900/40",
    iconBg: "bg-sky-50 dark:bg-sky-950/60",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  task: {
    icon: ClipboardList,
    chip: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
    ring: "ring-orange-200/60 dark:ring-orange-900/40",
    iconBg: "bg-orange-50 dark:bg-orange-950/60",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  end: {
    icon: Flag,
    chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
    ring: "ring-rose-200/60 dark:ring-rose-900/40",
    iconBg: "bg-rose-50 dark:bg-rose-950/60",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
};

const TYPE_LABEL: Record<WorkflowStepType, string> = {
  whatsapp_message: "WhatsApp",
  wait: "Délai",
  condition: "Condition",
  linkedin_invite: "LinkedIn",
  linkedin_message: "LinkedIn",
  crm: "CRM",
  notification: "Notification",
  task: "Tâche",
  end: "Fin",
};

export function StepNode({ data, selected }: NodeProps) {
  const { step, label, subtitle, configured } = data as unknown as StepNodeData;
  const styles = TYPE_STYLES[step.type];
  const Icon = styles.icon;

  return (
    <div
      className={cn(
        "group relative w-[280px] rounded-xl border bg-card shadow-sm transition-all",
        "hover:shadow-md hover:border-foreground/20",
        selected && cn("ring-2 ring-offset-2 ring-offset-background", styles.ring),
        !configured && "border-dashed"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-background !bg-muted-foreground/40"
      />
      <div className="flex items-start gap-3 p-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", styles.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium leading-tight text-foreground">
              {label}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                styles.chip
              )}
            >
              {TYPE_LABEL[step.type]}
            </span>
          </div>
          {subtitle && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
          {!configured && (
            <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              À configurer
            </p>
          )}
        </div>
      </div>
      {step.type === "condition" ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            style={{ left: "30%" }}
            className="!h-2 !w-2 !border-2 !border-background !bg-emerald-500"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{ left: "70%" }}
            className="!h-2 !w-2 !border-2 !border-background !bg-rose-500"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-2 !border-background !bg-muted-foreground/40"
        />
      )}
    </div>
  );
}
