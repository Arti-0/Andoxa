"use client";

import { Copy, Download, Pause, Trash2, X } from "lucide-react";

export type BulkAction = "pause" | "duplicate" | "export" | "delete";

const ACTIONS: { id: BulkAction; label: string; icon: React.ComponentType<{ className?: string }>; destructive?: boolean }[] = [
  { id: "pause", label: "Mettre en pause", icon: Pause },
  { id: "duplicate", label: "Dupliquer", icon: Copy },
  { id: "export", label: "Exporter", icon: Download },
  { id: "delete", label: "Supprimer", icon: Trash2, destructive: true },
];

export function BulkActionBar({
  count,
  onAction,
  onClear,
}: {
  count: number;
  onAction: (a: BulkAction) => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-2.5 text-white shadow-xl"
      style={{ background: "var(--neutral-950, #111)" }}
    >
      <span className="text-[13px]">
        <strong className="font-bold">{count}</strong> sélectionné{count > 1 ? "s" : ""}
      </span>
      <span className="h-5 w-px bg-white/15" />
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onAction(a.id)}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[12.5px] font-medium ${
              a.destructive ? "text-red-300 hover:bg-red-500/20" : "text-white hover:bg-white/10"
            }`}
          >
            <Icon className="size-3.5" />
            {a.label}
          </button>
        );
      })}
      <span className="h-5 w-px bg-white/15" />
      <button
        type="button"
        onClick={onClear}
        className="rounded p-1 text-white/60 hover:text-white"
        aria-label="Effacer la sélection"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
