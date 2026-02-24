"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, ExternalLink, Trash2, MessageSquare } from "lucide-react";
import type { Prospect } from "@/lib/types/prospects";

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  lost: "Perdu",
  won: "Gagné",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contacted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  qualified:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manuel",
  csv: "Import CSV",
  linkedin_extension: "LinkedIn",
  linkedin: "LinkedIn",
  import: "Import",
  website: "Site web",
};

export function getProspectColumns(
  onDelete: (prospect: Prospect) => void
): ColumnDef<Prospect>[] {
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
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Tout sélectionner"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Sélectionner"
        />
      </div>
    ),
    enableSorting: false,
    size: 48,
  },
  {
    accessorKey: "full_name",
    header: "Nom",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div>
          <p className="font-medium">{p.full_name ?? "—"}</p>
          {p.job_title && (
            <p className="text-sm text-muted-foreground">{p.job_title}</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "company",
    header: "Entreprise",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.company ?? "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const status = row.original.status ?? "new";
      return (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            STATUS_COLORS[status] ?? ""
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      );
    },
  },
  {
    id: "contact",
    header: "Contact",
    cell: ({ row }) => {
      const p = row.original;
      const hasChat = !!p.linked_chat_id;
      return (
        <div className="flex items-center gap-2">
          {p.email && (
            <a
              href={`mailto:${p.email}`}
              className="rounded p-1 hover:bg-accent"
              title={p.email}
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
          {p.phone && (
            <a
              href={`tel:${p.phone}`}
              className="rounded p-1 hover:bg-accent"
              title={p.phone}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
          {p.linkedin && (
            <a
              href={p.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1 hover:bg-accent"
              title="LinkedIn"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
          {hasChat ? (
            <Link
              href={`/messagerie?chat=${p.linked_chat_id}`}
              className="rounded p-1 hover:bg-accent"
              title="Ouvrir le chat"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <span
              className="rounded p-1 cursor-not-allowed opacity-50"
              title="Invitez d'abord ce prospect pour ouvrir un chat"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const p = row.original;
      const source = p.source ?? "";
      const isLinkedIn = source === "linkedin_extension" || source === "linkedin";
      if (isLinkedIn && p.linkedin) {
        return (
          <a
            href={p.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            LinkedIn
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        );
      }
      if (isLinkedIn) {
        return (
          <span className="text-sm text-muted-foreground">LinkedIn</span>
        );
      }
      return (
        <span className="text-sm capitalize text-muted-foreground">
          {(SOURCE_LABELS[source] ?? source) || "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => {
      const date = row.original.created_at;
      if (!date) return "—";
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(date).toLocaleDateString("fr-FR")}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(
                  `Supprimer le prospect "${p.full_name ?? p.email ?? "sans nom"}" ?`
                )
              ) {
                onDelete(p);
              }
            }}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Supprimer le prospect"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
    enableSorting: false,
    size: 48,
  },
  ];
}

/** Default columns without delete handler (for ProspectTable etc.) */
export const prospectColumns = getProspectColumns(() => {});
