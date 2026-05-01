"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export interface WorkflowEnrollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospects: { id: string; full_name?: string | null }[];
  /** When set, skip workflow picker (e.g. on workflow detail page). */
  fixedWorkflowId?: string | null;
  onSuccess?: () => void;
}

interface WorkflowRow {
  id: string;
  name: string;
  is_active: boolean;
  is_published: boolean;
}

export function WorkflowEnrollModal({
  open,
  onOpenChange,
  prospects,
  fixedWorkflowId,
  onSuccess,
}: WorkflowEnrollModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState<WorkflowRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>(fixedWorkflowId ?? "");

  useEffect(() => {
    if (!open) return;
    if (fixedWorkflowId) {
      setSelectedId(fixedWorkflowId);
      return;
    }
    setSelectedId("");
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/workflows?pageSize=100", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message ?? "Erreur");
        }
        const items = (json.data?.items ?? []) as WorkflowRow[];
        if (!cancelled) {
          setList(items.filter((w) => w.is_published));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Impossible de charger les parcours");
          setList([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fixedWorkflowId]);

  const workflowId = fixedWorkflowId ?? selectedId;
  const canSubmit =
    prospects.length > 0 &&
    workflowId &&
    (fixedWorkflowId || list.some((w) => w.id === workflowId));

  const handleSubmit = async () => {
    if (!workflowId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prospect_ids: prospects.map((p) => p.id) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Échec");
      }
      const created = json.data?.created_run_ids?.length ?? 0;
      const skipped = json.data?.skipped?.length ?? 0;
      if (created) {
        toast.success(
          created === 1
            ? "Prospect inscrit au parcours."
            : `${created} prospects inscrits au parcours.`
        );
      }
      if (skipped) {
        toast.message(
          `${skipped} ignoré(s)`,
          {
            description:
              "Déjà un parcours actif pour ce suivi, ou prospect invalide.",
          }
        );
      }
      if (!created && !skipped) {
        toast.error("Aucune inscription effectuée");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setSubmitting(false);
    }
  };

  const names = prospects
    .map((p) => p.full_name?.trim() || p.id.slice(0, 8))
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrire au parcours</DialogTitle>
          <DialogDescription>
            {prospects.length === 1
              ? `Prospect : ${names}`
              : `${prospects.length} prospects : ${names.slice(0, 120)}${names.length > 120 ? "…" : ""}`}
          </DialogDescription>
        </DialogHeader>

        {!fixedWorkflowId && (
          <div className="space-y-2">
            <Label>Parcours prêt à lancer</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun parcours prêt à lancer.{" "}
                <Link href="/workflows" className="text-primary underline">
                  Créer ou finaliser un parcours
                </Link>
              </p>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un parcours" />
                </SelectTrigger>
                <SelectContent>
                  {list.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inscrire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
