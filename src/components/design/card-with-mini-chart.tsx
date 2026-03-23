"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardWithMiniChartProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
  footer?: string;
  children?: React.ReactNode;
  className?: string;
}

export function CardWithMiniChart({
  title,
  value,
  icon: Icon,
  iconClassName,
  footer,
  children,
  className,
}: CardWithMiniChartProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 space-y-4 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10",
            iconClassName
          )}
        >
          <Icon className={cn("h-4 w-4 text-primary", iconClassName)} />
        </div>
      </div>
      {children}
      {footer && (
        <p className="text-xs text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}
