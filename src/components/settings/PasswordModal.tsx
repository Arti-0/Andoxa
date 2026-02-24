"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

interface PasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordModal({ open, onOpenChange }: PasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setOldPassword("");
    setPassword("");
    setConfirm("");
    setError(null);
    setSuccess(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!oldPassword.trim()) {
      setError("Veuillez saisir votre mot de passe actuel");
      return;
    }
    if (password.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirm) {
      setError("Les nouveaux mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) {
        setError("Impossible de récupérer votre adresse email");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        setError("Mot de passe actuel incorrect");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setSuccess(true);
      reset();
      setTimeout(() => handleClose(false), 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du changement de mot de passe"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Sécurité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {success ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                Mot de passe mis à jour avec succès.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Mot de passe actuel</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </>
            )}
          </div>
          {!success && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement…" : "Changer le mot de passe"}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
