"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, List, Trash2, Users } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import type { BddRow } from "./crm-table";

const SOURCE_LABELS: Record<string, string> = {
  linkedin_extension: "LinkedIn",
  linkedin: "LinkedIn",
  csv: "Import CSV",
  import: "Import",
  manual: "Manuel",
  website: "Site web",
};

export function getBddColumns(
  onSelect: (bddId: string | null) => void,
  onDelete: (bddId: string) => void,
  memberNames: Map<string, string>
): ColumnDef<BddRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Tout sélectionner"
          />
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        if (item.id === "__all__") return null;
        return (
          <div
            className="flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Sélectionner la liste"
            />
          </div>
        );
      },
      enableSorting: false,
      size: 48,
    },
    {
      accessorKey: "name",
      header: "Liste",
      cell: ({ row }) => {
        const item = row.original;
        const isAll = item.id === "__all__";
        return (
          <div className="flex items-center gap-2 font-medium">
            {isAll ? (
              <Users className="h-4 w-4 text-muted-foreground" />
            ) : (
              <List className="h-4 w-4 text-muted-foreground" />
            )}
            {item.name}
          </div>
        );
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const item = row.original;
        if (item.id === "__all__") return "—";
        return (
          <span className="text-muted-foreground">
            {SOURCE_LABELS[item.source ?? ""] ?? item.source ?? "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "proprietaire",
      header: "Auteur",
      cell: ({ row }) => {
        const item = row.original;
        if (item.id === "__all__") return "—";
        const name = item.proprietaire ? memberNames.get(item.proprietaire) ?? item.proprietaire : "—";
        return <span className="text-sm text-muted-foreground">{name}</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => {
        const item = row.original;
        if (item.id === "__all__") return "—";
        return (
          <span className="text-sm text-muted-foreground">
            {item.created_at ? formatDate(item.created_at) : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        if (item.id === "__all__") {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Voir tous les prospects"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          );
        }
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.id);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Ouvrir la liste"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Supprimer la liste"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
      size: 80,
    },
  ];
}
