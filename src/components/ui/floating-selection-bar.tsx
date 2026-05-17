"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Fixed bottom toolbar for bulk selection (campaigns table, CRM prospects, etc.).
 * Uses a charcoal shell in both themes — avoids marketing `.dark` inverting `--neutral-950` to white.
 */
export function FloatingSelectionBar({
  count,
  onClear,
  children,
  className,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Actions sur la sélection"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-[#09090b] px-4 py-2.5 text-[13px] text-white shadow-xl",
        className,
      )}
    >
      <span className="whitespace-nowrap">
        <strong className="font-bold">{count}</strong>
        {" "}
        sélectionné{count > 1 ? "s" : ""}
      </span>
      <span aria-hidden className="hidden h-5 w-px shrink-0 bg-white/15 sm:block" />
      <div className="flex flex-wrap items-center gap-1">{children}</div>
      <span aria-hidden className="hidden h-5 w-px shrink-0 bg-white/15 sm:block" />
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-md p-1.5 text-white/65 hover:bg-white/10 hover:text-white"
        aria-label="Effacer la sélection"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** Shared triggers for toolbar actions on the charcoal bar */
export function floatingSelectionToolbarButtonClass(destructive?: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
    destructive
      ? "text-red-300 hover:bg-red-500/20"
      : "text-white/95 hover:bg-white/10",
  );
}
