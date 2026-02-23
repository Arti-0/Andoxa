"use client";

import { useState } from "react";
import { LayoutList, Plus, Upload, LayoutGrid, Table2 } from "lucide-react";
import { ProspectCreateDialog } from "./prospect-create-dialog";
import { ProspectImportDialog } from "./prospect-import-dialog";

export type CrmView = "listes" | "prospects" | "kanban";

interface CrmHeaderProps {
  view: CrmView;
  onViewChange: (view: CrmView) => void;
  workspaceId: string | null;
}

export function CrmHeader({ view, onViewChange }: CrmHeaderProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Gérez tous vos prospects en un seul endroit
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Vue : Listes | Prospects | Kanban */}
          <div
            className="flex rounded-lg border p-1"
            role="group"
            aria-label="Vue CRM"
          >
            <button
              type="button"
              onClick={() => onViewChange("listes")}
              aria-label="Vue listes"
              title="Listes"
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                view === "listes"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <LayoutList className="h-4 w-4" aria-hidden />
              Listes
            </button>
            <button
              type="button"
              onClick={() => onViewChange("prospects")}
              aria-label="Vue prospects"
              title="Prospects"
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                view === "prospects"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Table2 className="h-4 w-4" aria-hidden />
              Prospects
            </button>
            <button
              type="button"
              onClick={() => onViewChange("kanban")}
              aria-label="Vue kanban"
              title="Kanban"
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
              Kanban
            </button>
          </div>

          {/* Import Button */}
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-2 rounded-lg border px-4 py-2 text-sm opacity-50"
          >
            <Upload className="h-4 w-4" />
            Importer
          </button>

          {/* Add Button */}
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nouveau prospect
          </button>
        </div>
      </div>

      <ProspectCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <ProspectImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </>
  );
}
