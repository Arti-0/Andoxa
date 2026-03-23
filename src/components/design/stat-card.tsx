"use client";

import {
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  subtitle: string;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType,
  subtitle,
  icon: Icon,
  className,
}: StatCardProps) {
  const changeColor =
    changeType === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : changeType === "negative"
        ? "text-red-500 dark:text-red-400"
        : "text-muted-foreground";
  const ChangeIcon =
    changeType === "positive"
      ? ArrowUpRight
      : changeType === "negative"
        ? ArrowDownRight
        : null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium",
            changeColor
          )}
        >
          {ChangeIcon && <ChangeIcon className="h-3 w-3" />}
          {change}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
