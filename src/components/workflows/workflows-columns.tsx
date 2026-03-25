"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Copy, Loader2, ListPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { WorkflowColorKey, WorkflowIconKey } from "@/lib/workflows";
import { WorkflowListIcon } from "./workflow-list-icon";

export interface WorkflowListRow {
  id: string;
  name: string;
  is_active: boolean;
  is_published: boolean;
  active_runs_count: number;
  total_runs_count: number;
  runs_completed_count: number;
  /** Part des contacts ayant terminé le parcours ; `null` si aucun lancement. */
  execution_progress_pct: number | null;
  updated_at: string;
  ui: { icon: WorkflowIconKey; color: WorkflowColorKey };
}

function workflowStatePresentation(row: WorkflowListRow): {
  label: string;
  variant: "muted" | "default" | "primary" | "warning";
} {
  if (!row.is_published) {
    return { label: "À finaliser", variant: "muted" };
  }
  if (row.total_runs_count === 0) {
    return { label: "Prêt à lancer", variant: "default" };
  }
  if (row.is_active) {
    return { label: "En service", variant: "primary" };
  }
  return { label: "En pause", variant: "warning" };
}

export interface WorkflowListColumnsOptions {
  duplicateBusyId: string | null;
  onDuplicate: (row: WorkflowListRow) => void;
  onDelete: (row: WorkflowListRow) => void;
  onStartWithLists: (row: WorkflowListRow) => void;
}

export function getWorkflowListColumns(
  opts: WorkflowListColumnsOptions
): ColumnDef<WorkflowListRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Nom",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 font-medium">
          <WorkflowListIcon icon={row.original.ui.icon} color={row.original.ui.color} />
          <span className="truncate">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "state",
      header: "État",
      cell: ({ row }) => {
        const s = workflowStatePresentation(row.original);
        const color =
          s.variant === "primary"
            ? "text-primary"
            : s.variant === "warning"
              ? "text-amber-700 dark:text-amber-400"
              : "text-foreground";
        return (
          <div className="max-w-[220px]">
            <p className={`text-sm font-medium ${color}`}>{s.label}</p>
          </div>
        );
      },
    },
    {
      id: "execution_progress",
      header: "Avancement",
      cell: ({ row }) => {
        const p = row.original.execution_progress_pct;
        if (p === null) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="flex min-w-[120px] max-w-[160px] flex-col gap-1">
            <Progress value={p} className="h-2" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {p} % terminés
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "active_runs_count",
      header: "Actifs",
      cell: ({ row }) => {
        const t = row.original.total_runs_count;
        const a = row.original.active_runs_count;
        if (t === 0) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="tabular-nums text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{a}</span>
            <span className="text-xs"> / {t} entrés</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const busy = opts.duplicateBusyId === row.original.id;
        const canStart = row.original.is_published;
        return (
          <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {canStart ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 gap-1"
                title="Choisir une ou plusieurs listes puis lancer le parcours"
                onClick={() => opts.onStartWithLists(row.original)}
              >
                <ListPlus className="h-3.5 w-3.5 shrink-0" />
                Lancer
              </Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" className="h-8" asChild>
                <Link href={`/workflows/${row.original.id}`} title="Finaliser le parcours sur la fiche workflow">
                  Configurer
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={busy}
              title="Dupliquer"
              aria-label="Dupliquer"
              onClick={() => opts.onDuplicate(row.original)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Supprimer"
              aria-label="Supprimer"
              onClick={() => opts.onDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
