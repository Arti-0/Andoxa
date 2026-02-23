"use client";

import { useWorkspace } from "@/lib/workspace";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

export function DeletedOrganizationBanner() {
  const { workspace } = useWorkspace();

  const exportDeadline = useMemo(() => {
    const deletedAt = workspace?.deleted_at;
    if (!deletedAt) return null;
    const d = new Date(deletedAt);
    d.setDate(d.getDate() + 30);
    return d;
  }, [workspace?.deleted_at]);

  if (workspace?.status !== "deleted" || !exportDeadline) return null;

  const dateStr = exportDeadline.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/50">
      <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          Cette organisation a été supprimée. Vous pouvez exporter vos données
          jusqu&apos;au <strong>{dateStr}</strong>. Accès limité (export uniquement).
        </p>
      </div>
    </div>
  );
}
