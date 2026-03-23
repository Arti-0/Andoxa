"use client";

import { cn } from "@/lib/utils";

export interface DesignToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function DesignToolbar({ children, className }: DesignToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-xs",
        className
      )}
    >
      {children}
    </div>
  );
}
