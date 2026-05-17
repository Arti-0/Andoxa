"use client";

import { Copy, Download, Pause, Trash2 } from "lucide-react";

import {
  FloatingSelectionBar,
  floatingSelectionToolbarButtonClass,
} from "@/components/ui/floating-selection-bar";

export type BulkAction = "pause" | "duplicate" | "export" | "delete";

const ACTIONS: {
  id: BulkAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}[] = [
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
  return (
    <FloatingSelectionBar count={count} onClear={onClear}>
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onAction(a.id)}
            className={floatingSelectionToolbarButtonClass(Boolean(a.destructive))}
          >
            <Icon className="size-3.5" />
            {a.label}
          </button>
        );
      })}
    </FloatingSelectionBar>
  );
}
