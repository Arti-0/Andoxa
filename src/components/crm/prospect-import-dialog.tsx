"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProspectRow {
  name: string;
  url: string;
}

interface ProspectImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProspectImportDialog({
  open,
  onOpenChange,
}: ProspectImportDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listName, setListName] = useState("");
  const [rows, setRows] = useState<ProspectRow[]>([{ name: "", url: "" }]);

  const resetForm = () => {
    setListName("");
    setRows([{ name: "", url: "" }]);
    setError(null);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { name: "", url: "" }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: "name" | "url", value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) {
      setError("Le nom de la liste est requis");
      return;
    }
    const prospects = rows
      .filter((r) => r.name.trim() || r.url.trim())
      .map((r) => ({ name: r.name.trim() || "Sans nom", url: r.url.trim() }));

    if (prospects.length === 0) {
      setError("Ajoutez au moins un prospect (nom ou URL LinkedIn)");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: listName.trim(),
          prospects,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errors = json?.error?.details?.errors;
        const errMsg = errors
          ? Object.values(errors).find(Boolean)
          : json?.error?.message ?? "Erreur lors de l'import";
        throw new Error(String(errMsg));
      }

      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importer des prospects</DialogTitle>
          <DialogDescription>
            Importez des prospects depuis LinkedIn (format extension). Nom et URL
            du profil.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">Nom de la liste *</Label>
            <Input
              id="list-name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Ex: Prospects Q1 2025"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Prospects (nom, URL LinkedIn)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRow}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Ligne
              </Button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Nom"
                    value={row.name}
                    onChange={(e) => updateRow(index, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={row.url}
                    onChange={(e) => updateRow(index, "url", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    disabled={rows.length === 1}
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Import en cours..." : "Importer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
