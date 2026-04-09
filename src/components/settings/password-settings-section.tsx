"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SettingsCard,
  settingsFieldClass,
  settingsLabelClass,
  settingsSaveButtonClass,
} from "./settings-card";
import { cn } from "@/lib/utils";

export function PasswordSettingsSection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "Impossible de mettre à jour le mot de passe"
        );
      }
      toast.success("Mot de passe mis à jour");
      setPassword("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsCard
      title="Mot de passe"
      description="Définir ou modifier votre mot de passe"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settings-pwd" className={settingsLabelClass}>
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Input
              id="settings-pwd"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              minLength={8}
              className={cn(settingsFieldClass, "pr-10")}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showPwd ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-pwd-confirm" className={settingsLabelClass}>
            Confirmer le mot de passe
          </Label>
          <Input
            id="settings-pwd-confirm"
            type={showPwd ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Répétez le mot de passe"
            className={settingsFieldClass}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className={settingsSaveButtonClass}
          >
            {loading ? "Enregistrement…" : "Mettre à jour"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
