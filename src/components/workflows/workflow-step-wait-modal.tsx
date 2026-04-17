"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface WorkflowStepWaitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  durationHours: number;
  onlyIfNoReply?: boolean;
  onSave: (hours: number, onlyIfNoReply: boolean) => void;
}

export function WorkflowStepWaitModal({
  open,
  onOpenChange,
  durationHours,
  onlyIfNoReply,
  onSave,
}: WorkflowStepWaitModalProps) {
  const [local, setLocal] = useState(String(durationHours));
  const [localOnlyIfNoReply, setLocalOnlyIfNoReply] = useState(
    onlyIfNoReply ?? false
  );

  useEffect(() => {
    if (open) {
      setLocal(String(durationHours));
      setLocalOnlyIfNoReply(onlyIfNoReply ?? false);
    }
  }, [open, durationHours, onlyIfNoReply]);

  const handleSave = () => {
    const n = parseFloat(local);
    if (!Number.isFinite(n) || n <= 0) return;
    onSave(n, localOnlyIfNoReply);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attente</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="wait-hours">Durée (heures)</Label>
          <Input
            id="wait-hours"
            type="number"
            min={0.01}
            step={0.5}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            L’étape suivante sera planifiée après ce délai.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Switch
            id="only-if-no-reply"
            checked={localOnlyIfNoReply}
            onCheckedChange={setLocalOnlyIfNoReply}
          />
          <div className="space-y-1">
            <Label
              htmlFor="only-if-no-reply"
              className="cursor-pointer text-sm font-medium"
            >
              Seulement si pas de réponse
            </Label>
            <p className="text-xs text-muted-foreground">
              Si le prospect a déjà répondu quand cette étape est atteinte, le
              parcours passe immédiatement à l’étape suivante.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
