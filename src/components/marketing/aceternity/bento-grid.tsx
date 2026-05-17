"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Variable-sized grid; each cell can span multiple columns/rows. */
export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-6xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-2xl border border-[var(--border)] bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
    >
      <div className="relative flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--neutral-50)]">
        {header}
      </div>
      <div className="transition duration-300 group-hover/bento:translate-x-1">
        {icon && (
          <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-card text-foreground transition-colors group-hover/bento:border-[var(--brand-blue)] group-hover/bento:bg-[var(--brand-blue-tint)] group-hover/bento:text-[var(--brand-blue)]">
            {icon}
          </div>
        )}
        <div className="font-semibold tracking-tight text-foreground">{title}</div>
        {description && (
          <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  );
}
