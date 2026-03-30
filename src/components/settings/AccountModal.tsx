"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/workspace";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountModal({ open, onOpenChange }: AccountModalProps) {
  const { signOut } = useWorkspace();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSignOut = () => {
    signOut();
    onOpenChange(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "SUPPRIMER") return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmation: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      window.location.href = "/auth/inactive?reason=account";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compte</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              Se déconnecter
            </Button>
          </div>

          <div className="border-t pt-4">
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Supprimer mon compte
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour
                  confirmer la suppression de votre compte et de vos données
                  personnelles (conformément au RGPD).
                </p>
                <div className="space-y-2">
                  <Label htmlFor="delete_confirm">Confirmation</Label>
                  <Input
                    id="delete_confirm"
                    value={deleteConfirm}
                    onChange={(e) => {
                      setDeleteConfirm(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="SUPPRIMER"
                    className="border-destructive/50"
                  />
                </div>
                {deleteError && (
                  <p className="text-sm text-destructive">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirm("");
                      setDeleteError(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteConfirm !== "SUPPRIMER" || deleteLoading}
                    onClick={handleDeleteAccount}
                  >
                    {deleteLoading ? "Suppression…" : "Supprimer mon compte"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
