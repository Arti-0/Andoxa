"use client";

/**
 * CRM v2 — Corbeille tab.
 *
 * Visual reference: design/CRM/crm-tab-listes.jsx (CorbeilleTab section).
 *
 * Data wiring:
 *   • GET /api/prospects/trash
 *   • POST /api/prospects/:id/restore
 *
 * "Vider la corbeille" is a stub — endpoint to add (see CRM_BACKEND_TODO.md).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NameAvatar, StatusPill, SourcePill } from "./crm-shared";
import type { Prospect } from "@/lib/types/prospects";

export function CorbeilleTab({
  workspaceId,
  onBack,
}: {
  workspaceId: string | null;
  onBack: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["prospects-trash-v2", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/prospects/trash?page=1&pageSize=100", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as { items: Prospect[]; total: number };
    },
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });

  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const emptyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/prospects/trash/empty", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as { deleted: number };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["prospects-trash-v2"] });
      toast.success(
        res.deleted > 0
          ? `${res.deleted} prospect${res.deleted > 1 ? "s" : ""} supprimé${res.deleted > 1 ? "s" : ""} définitivement`
          : "Corbeille déjà vide",
      );
    },
    onError: () => toast.error("Impossible de vider la corbeille"),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prospects/${id}/restore`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects-trash-v2"] });
      queryClient.invalidateQueries({ queryKey: ["prospects-v2"] });
      toast.success("Prospect restauré");
    },
    onError: () => toast.error("Restauration impossible"),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const isEmpty = !isLoading && total === 0;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-6">
        <div>
          <h1 className="m-0 text-[22px] font-semibold tracking-tight">
            Corbeille
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Les prospects supprimés sont conservés{" "}
            <b className="text-foreground">30 jours</b> avant suppression
            définitive.
          </p>
        </div>
        <button
          onClick={() => setConfirmEmpty(true)}
          disabled={isEmpty || emptyMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-3 py-1.5 text-[13px] font-medium text-destructive hover:bg-destructive/5 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Vider la corbeille
        </button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3.5 rounded-xl border border-border bg-card px-6 py-16">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-dashed border-border bg-muted/30">
            <Trash2 className="h-9 w-9 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <div className="text-base font-semibold">La corbeille est vide</div>
            <div className="mx-auto mt-1 max-w-[340px] text-[13px] text-muted-foreground">
              Les prospects que vous supprimez apparaîtront ici. Vous pourrez
              les restaurer pendant 30 jours.
            </div>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-blue-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux prospects
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>Prospect</Th>
                <Th>Statut</Th>
                <Th>Source</Th>
                <Th>Supprimé le</Th>
                <Th className="w-[80px] text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const trashedAt = (p as Prospect & { deleted_at?: string | null })
                  .deleted_at;
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/prospect/${p.id}`)}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <NameAvatar name={p.full_name ?? "?"} size={32} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {p.full_name ?? "Sans nom"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.company ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <SourcePill source={p.source} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-xs text-muted-foreground">
                        {trashedAt
                          ? new Date(trashedAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreMutation.mutate(p.id);
                        }}
                        title="Restaurer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            {total} prospect{total > 1 ? "s" : ""} dans la corbeille
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        onOpenChange={(open) => {
          if (!open) setConfirmEmpty(false);
        }}
        title="Vider la corbeille ?"
        description="Tous les prospects supprimés seront définitivement effacés. Cette action est irréversible."
        confirmLabel="Vider"
        variant="destructive"
        onConfirm={() => {
          setConfirmEmpty(false);
          emptyMutation.mutate();
        }}
      />
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
