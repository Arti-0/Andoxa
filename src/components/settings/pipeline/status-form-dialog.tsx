"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared palette for both statuses and tags so the picker is consistent. */
export const PIPELINE_PALETTE = [
  "#94a3b8",
  "#60a5fa",
  "#2563eb",
  "#0ea5e9",
  "#a855f7",
  "#16a34a",
  "#ef4444",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
];

type SubmitValues = { name: string; color: string };

interface StatusFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initial: SubmitValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SubmitValues) => Promise<void>;
}

/**
 * Create / edit dialog for pipeline statuses. The same component handles
 * both flows — passing `mode: "edit"` swaps the title and Save copy. The
 * caller is responsible for the actual POST/PATCH; this dialog just
 * collects + validates a name and a colour.
 */
export function StatusFormDialog({
  open,
  mode,
  initial,
  onOpenChange,
  onSubmit,
}: StatusFormDialogProps) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [saving, setSaving] = useState(false);

  // Re-seed local state every time the dialog opens with new initial values
  // (e.g. clicking a different row to edit).
  useEffect(() => {
    if (open) {
      setName(initial.name);
      setColor(initial.color);
    }
  }, [open, initial.name, initial.color]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({ name: trimmed, color });
    } catch {
      // Caller surfaces the toast — keep the dialog open so the user can retry.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Modifier le statut" : "Nouveau statut"}
            </DialogTitle>
            <DialogDescription>
              Donnez un nom clair (visible dans le pipeline) et choisissez une
              couleur pour le repérer rapidement.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status-name">Nom</Label>
            <Input
              id="status-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. « Discovery »"
              maxLength={60}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap items-center gap-2">
              {PIPELINE_PALETTE.map((c) => {
                const active = c === color;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Couleur ${c}`}
                    aria-pressed={active}
                    onClick={() => setColor(c)}
                    className={cn(
                      "relative size-7 rounded-full ring-1 ring-inset ring-black/10 transition-transform",
                      active && "ring-2 ring-offset-2 ring-offset-background",
                      active ? "scale-110" : "hover:scale-110",
                    )}
                    style={{
                      backgroundColor: c,
                      ...(active && { boxShadow: `0 0 0 2px ${c}` }),
                    }}
                  />
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {mode === "edit" ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
