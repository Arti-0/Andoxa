"use client";

import { cn } from "@/lib/utils";

export interface KPIRowItem {
  label: string;
  value: string;
  color?: string;
}

export interface KPIRowProps {
  items: KPIRowItem[];
  className?: string;
  columns?: 2 | 3 | 4;
}

export function KPIRow({
  items,
  className,
  columns = 3,
}: KPIRowProps) {
  const gridCols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-3";

  return (
    <div
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-xl border",
        gridCols,
        className
      )}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col gap-1 p-5",
            i > 0 && "border-t sm:border-t-0 sm:border-l"
          )}
        >
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span
            className={cn(
              "text-2xl font-bold tracking-tight",
              item.color ?? "text-foreground"
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
