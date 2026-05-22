"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WorkflowTemplate } from "@/lib/workflows";
import { WORKFLOW_TRIGGER_KIND_OPTIONS } from "@/lib/workflows";

interface TemplateApplyDialogProps {
  template: WorkflowTemplate | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TemplateApplyDialog({
  template,
  busy = false,
  onClose,
  onConfirm,
}: TemplateApplyDialogProps) {
  const triggerLabel = template
    ? (WORKFLOW_TRIGGER_KIND_OPTIONS.find((t) => t.id === template.triggerKind)
        ?.label ?? template.triggerKind)
    : null;

  return (
    <Dialog
      open={template != null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appliquer ce modèle ?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-1 text-left text-sm text-muted-foreground">
              {template ? (
                <>
                  <p>
                    Le parcours actuel sera remplacé par{" "}
                    <span className="font-medium text-foreground">
                      {template.name}
                    </span>
                    .
                  </p>
                  {template.description ? (
                    <p className="text-xs leading-relaxed">{template.description}</p>
                  ) : null}
                  {triggerLabel ? (
                    <p className="text-xs">
                      Déclencheur :{" "}
                      <span className="font-medium text-foreground">
                        {triggerLabel}
                      </span>
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || !template}
            onClick={onConfirm}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border-none bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-[0.92] disabled:opacity-60"
          >
            {busy ? "Application…" : "Appliquer le modèle"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
