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

interface WorkflowStepWaitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  durationHours: number;
  onSave: (hours: number) => void;
}

export function WorkflowStepWaitModal({
  open,
  onOpenChange,
  durationHours,
  onSave,
}: WorkflowStepWaitModalProps) {
  const [local, setLocal] = useState(String(durationHours));

  useEffect(() => {
    if (open) setLocal(String(durationHours));
  }, [open, durationHours]);

  const handleSave = () => {
    const n = parseFloat(local);
    if (!Number.isFinite(n) || n <= 0) return;
    onSave(n);
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
