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

// Tags get their own palette so the visual vocabulary stays distinct from
// pipeline statuses (different intent — tags are descriptors, statuses are
// stages). Re-exported from this file to keep imports symmetric with the
// status modal.
export const PIPELINE_PALETTE = [
  "#64748b",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#84cc16",
];

type SubmitValues = { name: string; color: string };

interface TagFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initial: SubmitValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SubmitValues) => Promise<void>;
}

/** Create / edit dialog for tags. Symmetric with StatusFormDialog. */
export function TagFormDialog({
  open,
  mode,
  initial,
  onOpenChange,
  onSubmit,
}: TagFormDialogProps) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [saving, setSaving] = useState(false);

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
      // Caller surfaces the toast.
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
              {mode === "edit" ? "Modifier le tag" : "Nouveau tag"}
            </DialogTitle>
            <DialogDescription>
              Les tags sont des étiquettes libres applicables à plusieurs
              prospects (ex. « ICP », « VIP », « À rappeler »).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tag-name">Nom</Label>
            <Input
              id="tag-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. « ICP »"
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
