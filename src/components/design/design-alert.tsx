"use client";

import {
  Check,
  Info,
  AlertCircle as AlertCircleIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const variantConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-800 dark:text-blue-300",
    iconColor: "text-blue-600",
  },
  success: {
    icon: Check,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900",
    text: "text-emerald-800 dark:text-emerald-300",
    iconColor: "text-emerald-600",
  },
  warning: {
    icon: AlertCircleIcon,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
    text: "text-amber-800 dark:text-amber-300",
    iconColor: "text-amber-600",
  },
  error: {
    icon: X,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    text: "text-red-800 dark:text-red-300",
    iconColor: "text-red-600",
  },
};

export type DesignAlertVariant = keyof typeof variantConfig;

export interface DesignAlertProps {
  variant: DesignAlertVariant;
  title: string;
  message: string;
  className?: string;
}

export function DesignAlert({
  variant,
  title,
  message,
  className,
}: DesignAlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon as LucideIcon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        config.bg,
        config.border,
        className
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", config.iconColor)} />
      <div>
        <p className={cn("text-sm font-semibold", config.text)}>{title}</p>
        <p className={cn("mt-0.5 text-sm opacity-80", config.text)}>{message}</p>
      </div>
    </div>
  );
}
