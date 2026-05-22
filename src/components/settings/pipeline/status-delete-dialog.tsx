"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Workflow } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProspectStatus {
  id: string;
  key: string;
  name: string;
  color: string;
  is_archived: boolean;
}

interface StatusUsage {
  prospectCount: number;
  workflows: {
    id: string;
    name: string;
    trigger: boolean;
    crmStepCount: number;
  }[];
}

interface StatusDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: ProspectStatus | null;
  allStatuses: ProspectStatus[];
  onDeleted: (id: string) => void;
}

function unwrap<T = unknown>(json: unknown): T {
  if (
    json &&
    typeof json === "object" &&
    "data" in (json as Record<string, unknown>)
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export function StatusDeleteDialog({
  open,
  onOpenChange,
  status,
  allStatuses,
  onDeleted,
}: StatusDeleteDialogProps) {
  const [usage, setUsage] = useState<StatusUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [transferToId, setTransferToId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const transferOptions = useMemo(
    () =>
      allStatuses.filter(
        (s) => s.id !== status?.id && !s.is_archived,
      ),
    [allStatuses, status?.id],
  );

  useEffect(() => {
    if (!open || !status) {
      setUsage(null);
      setTransferToId("");
      return;
    }

    let cancelled = false;
    setLoadingUsage(true);
    fetch(`/api/prospect-statuses/${status.id}/usage`, {
      credentials: "include",
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message ?? "Impossible de charger l'usage");
        }
        return unwrap<StatusUsage>(json);
      })
      .then((data) => {
        if (!cancelled) setUsage(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Impossible de charger l'usage",
          );
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, status, onOpenChange]);

  const needsTransfer =
    !!usage && (usage.prospectCount > 0 || usage.workflows.length > 0);

  const canSubmit =
    !loadingUsage &&
    !!status &&
    (!needsTransfer || (transferToId.length > 0 && transferOptions.length > 0));

  async function handleDelete() {
    if (!status || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/prospect-statuses/${status.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: needsTransfer
          ? JSON.stringify({ transfer_to_id: transferToId })
          : undefined,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json?.error?.fieldErrors?._ ??
            json?.error?.message ??
            "Suppression impossible",
        );
      }
      const payload = unwrap<{
        prospectsUpdated?: number;
        workflowsUpdated?: number;
      }>(json);
      const parts = [`Statut « ${status.name} » supprimé`];
      if ((payload.prospectsUpdated ?? 0) > 0) {
        parts.push(
          `${payload.prospectsUpdated} prospect${payload.prospectsUpdated! > 1 ? "s" : ""} transféré${payload.prospectsUpdated! > 1 ? "s" : ""}`,
        );
      }
      if ((payload.workflowsUpdated ?? 0) > 0) {
        parts.push(
          `${payload.workflowsUpdated} workflow${payload.workflowsUpdated! > 1 ? "s" : ""} mis à jour`,
        );
      }
      toast.success(parts.join(" · "));
      onDeleted(status.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Supprimer « {status?.name ?? "…"} » ?
          </DialogTitle>
          <DialogDescription>
            {loadingUsage
              ? "Vérification des prospects et workflows liés…"
              : needsTransfer
                ? "Ce statut est encore utilisé. Choisissez un statut de remplacement avant de supprimer."
                : "Cette action est irréversible. Aucun prospect ni workflow ne référence ce statut."}
          </DialogDescription>
        </DialogHeader>

        {loadingUsage ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Analyse en cours…
          </div>
        ) : usage && needsTransfer ? (
          <div className="flex flex-col gap-3">
            {usage.prospectCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>{usage.prospectCount}</strong> prospect
                  {usage.prospectCount > 1 ? "s" : ""} utilise
                  {usage.prospectCount > 1 ? "nt" : ""} ce statut.
                </span>
              </div>
            )}

            {usage.workflows.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <Workflow className="size-3.5 text-muted-foreground" />
                  {usage.workflows.length} workflow
                  {usage.workflows.length > 1 ? "s" : ""} concerné
                  {usage.workflows.length > 1 ? "s" : ""}
                </div>
                <ul className="max-h-28 space-y-1 overflow-y-auto text-[12.5px] text-muted-foreground">
                  {usage.workflows.map((wf) => (
                    <li key={wf.id} className="truncate">
                      {wf.name}
                      {wf.trigger && " · déclencheur"}
                      {wf.crmStepCount > 0 &&
                        ` · ${wf.crmStepCount} étape${wf.crmStepCount > 1 ? "s" : ""} CRM`}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  Les références seront remplacées par le statut choisi ci-dessous.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-foreground">
                Transférer vers
              </label>
              {transferOptions.length === 0 ? (
                <p className="text-[12.5px] text-destructive">
                  Aucun autre statut actif disponible. Créez ou restaurez un statut
                  avant de supprimer celui-ci.
                </p>
              ) : (
                <Select value={transferToId} onValueChange={setTransferToId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un statut…" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || submitting}
            onClick={() => void handleDelete()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Suppression…
              </>
            ) : needsTransfer ? (
              "Transférer et supprimer"
            ) : (
              "Supprimer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
