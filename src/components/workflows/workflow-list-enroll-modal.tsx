"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/workspace";
import {
  WorkflowBddTablePicker,
  mergeBddPickerSelection,
} from "./workflow-bdd-table-picker";
import type { BddRow } from "@/components/crm/crm-table";

interface WorkflowListEnrollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  onSuccess?: () => void;
}

export function WorkflowListEnrollModal({
  open,
  onOpenChange,
  workflowId,
  onSuccess,
}: WorkflowListEnrollModalProps) {
  const { workspaceId } = useWorkspace();
  const [merged, setMerged] = useState<Map<string, BddRow>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setMerged(new Map());
    }
    wasOpenRef.current = open;
  }, [open]);

  const handlePickerChange = useCallback((selectedOnPage: BddRow[], pageRowIds: string[]) => {
    setMerged((prev) => mergeBddPickerSelection(prev, selectedOnPage, pageRowIds));
  }, []);

  const handleOpenChange = (o: boolean) => {
    if (!o) setMerged(new Map());
    onOpenChange(o);
  };

  const bddIds = [...merged.keys()];
  const countLists = bddIds.length;

  const submit = async () => {
    if (!bddIds.length || !workflowId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bdd_ids: bddIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Échec");
      }
      const created = json.data?.created_run_ids?.length ?? 0;
      const skipped = json.data?.skipped?.length ?? 0;
      if (created) {
        toast.success(
          created === 1 ? "1 contact ajouté au parcours." : `${created} contacts ajoutés au parcours.`
        );
      }
      if (skipped) {
        toast.message(`${skipped} ignoré(s)`, {
          description: "Déjà dans ce parcours ou hors sélection.",
        });
      }
      if (!created && !skipped) {
        toast.error("Aucun contact ajouté (listes vides ?)");
      }
      handleOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(88vh,760px)] w-[min(calc(100vw-1.5rem),56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-xl"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>Démarrer pour des listes</DialogTitle>
          <DialogDescription>
            Choisissez une ou plusieurs listes. Chaque contact démarre son propre parcours, sans bloquer les
            autres lancements.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <WorkflowBddTablePicker
            workspaceId={workspaceId}
            onSelectionChange={handlePickerChange}
            toolbarExtra={
              countLists > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {countLists} liste{countLists > 1 ? "s" : ""} sélectionnée{countLists > 1 ? "s" : ""}
                </span>
              ) : null
            }
          />
        </div>
        <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" disabled={!bddIds.length || submitting} onClick={submit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lancer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
