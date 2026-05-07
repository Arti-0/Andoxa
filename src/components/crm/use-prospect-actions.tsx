"use client";

/**
 * Self-contained row-action hook used by every prospect row in the
 * Prospects + Pipeline tabs. Encapsulates:
 *   • Modifier            → navigates to /prospect/[id]
 *   • Inviter sur LinkedIn → POST /api/unipile/prospects/invite
 *   • Ajouter à un parcours → opens WorkflowEnrollModal (via a dialog
 *                              hosted at the page level)
 *   • Ajouter à une liste  → opens a list picker (Popover)
 *   • Supprimer            → soft-delete via DELETE /api/prospects/:id
 *
 * Usage:
 *   const { menu, dialogs } = useProspectActions();
 *   <RowMenu items={menu(prospect)} />
 *   {dialogs}        // mounted once at the tab level
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WorkflowEnrollModal } from "@/components/workflows/workflow-enroll-modal";
import type { Prospect } from "@/lib/types/prospects";

export interface ProspectMenuItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function useProspectActions(invalidateKey: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [enrolProspect, setEnrolProspect] = useState<Prospect | null>(null);
  const [pickListProspect, setPickListProspect] = useState<Prospect | null>(
    null,
  );
  const [confirmDeleteProspect, setConfirmDeleteProspect] =
    useState<Prospect | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async (prospect: Prospect) => {
      const res = await fetch("/api/unipile/prospects/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prospect_id: prospect.id }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(json?.error?.message ?? `Erreur ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast.success("Invitation LinkedIn envoyée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveListMutation = useMutation({
    mutationFn: async (vars: { id: string; bddId: string | null }) => {
      const res = await fetch("/api/prospects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: [vars.id],
          action: "bdd",
          value: vars.bddId,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast.success("Liste mise à jour");
    },
    onError: () => toast.error("Impossible de déplacer le prospect"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast.success("Prospect déplacé dans la corbeille");
    },
    onError: () => toast.error("Suppression impossible"),
  });

  const menu = (p: Prospect): ProspectMenuItem[] => [
    {
      label: "Modifier",
      onClick: () => router.push(`/prospect/${p.id}`),
    },
    {
      label: "Inviter sur LinkedIn",
      disabled: !p.linkedin,
      onClick: () => inviteMutation.mutate(p),
    },
    {
      label: "Ajouter à un parcours",
      onClick: () => setEnrolProspect(p),
    },
    {
      label: "Ajouter à une liste",
      onClick: () => setPickListProspect(p),
    },
    {
      label: "Supprimer",
      destructive: true,
      onClick: () => setConfirmDeleteProspect(p),
    },
  ];

  return {
    menu,
    dialogs: (
      <ProspectActionDialogs
        enrolProspect={enrolProspect}
        setEnrolProspect={setEnrolProspect}
        pickListProspect={pickListProspect}
        setPickListProspect={setPickListProspect}
        onPickList={(bddId) => {
          if (pickListProspect) {
            moveListMutation.mutate({ id: pickListProspect.id, bddId });
            setPickListProspect(null);
          }
        }}
        confirmDeleteProspect={confirmDeleteProspect}
        setConfirmDeleteProspect={setConfirmDeleteProspect}
        onDeleteConfirmed={(p) => deleteMutation.mutate(p.id)}
      />
    ),
  };
}

function ProspectActionDialogs({
  enrolProspect,
  setEnrolProspect,
  pickListProspect,
  setPickListProspect,
  onPickList,
  confirmDeleteProspect,
  setConfirmDeleteProspect,
  onDeleteConfirmed,
}: {
  enrolProspect: Prospect | null;
  setEnrolProspect: (v: Prospect | null) => void;
  pickListProspect: Prospect | null;
  setPickListProspect: (v: Prospect | null) => void;
  onPickList: (bddId: string | null) => void;
  confirmDeleteProspect: Prospect | null;
  setConfirmDeleteProspect: (v: Prospect | null) => void;
  onDeleteConfirmed: (p: Prospect) => void;
}) {
  const { data: bddOptions } = useQuery({
    queryKey: ["bdd-row-list-picker"],
    queryFn: async () => {
      const res = await fetch("/api/bdd?page=1&pageSize=100", {
        credentials: "include",
      });
      if (!res.ok) return { items: [] as { id: string; name: string }[] };
      const json = await res.json();
      return (json.data ?? json) as { items: { id: string; name: string }[] };
    },
    enabled: !!pickListProspect,
    staleTime: 60_000,
  });

  return (
    <>
      <WorkflowEnrollModal
        open={!!enrolProspect}
        onOpenChange={(o) => {
          if (!o) setEnrolProspect(null);
        }}
        prospects={
          enrolProspect
            ? [{ id: enrolProspect.id, full_name: enrolProspect.full_name }]
            : []
        }
        onSuccess={() => setEnrolProspect(null)}
      />

      <Dialog
        open={!!pickListProspect}
        onOpenChange={(o) => {
          if (!o) setPickListProspect(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter à une liste</DialogTitle>
            <DialogDescription>
              Sélectionnez la liste qui accueillera{" "}
              {pickListProspect?.full_name ?? "ce prospect"}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[320px] space-y-1 overflow-y-auto">
            <button
              onClick={() => onPickList(null)}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-muted-foreground hover:bg-accent"
            >
              Détacher de toute liste
            </button>
            {(bddOptions?.items ?? []).length === 0 && (
              <div className="px-2 py-2 text-[12.5px] text-muted-foreground">
                Aucune liste
              </div>
            )}
            {(bddOptions?.items ?? []).map((b) => (
              <button
                key={b.id}
                onClick={() => onPickList(b.id)}
                className="block w-full truncate rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent"
              >
                {b.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteProspect}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteProspect(null);
        }}
        title="Supprimer ce prospect ?"
        description={`"${confirmDeleteProspect?.full_name ?? "Ce prospect"}" sera déplacé dans la corbeille.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteProspect) {
            onDeleteConfirmed(confirmDeleteProspect);
            setConfirmDeleteProspect(null);
          }
        }}
      />
    </>
  );
}
