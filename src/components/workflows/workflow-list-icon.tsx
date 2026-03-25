"use client";

import {
  Clock,
  Mail,
  Phone,
  Rocket,
  Star,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowColorKey, WorkflowIconKey } from "@/lib/workflows";

const ICON_MAP: Record<WorkflowIconKey, typeof Workflow> = {
  Workflow,
  Zap,
  Target,
  Mail,
  Phone,
  TrendingUp,
  Users,
  Rocket,
  Clock,
  Star,
};

const COLOR_CLASS: Record<WorkflowColorKey, string> = {
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/25",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-indigo-500/25",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-violet-500/25",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/25",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/25",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-sky-500/25",
};

export function WorkflowListIcon({
  icon,
  color,
  className,
  iconClassName,
}: {
  icon: WorkflowIconKey;
  color: WorkflowColorKey;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = ICON_MAP[icon] ?? Workflow;
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
        COLOR_CLASS[color] ?? COLOR_CLASS.violet,
        className
      )}
    >
      <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden />
    </span>
  );
}
