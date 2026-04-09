"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/workspace";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SettingsCard,
  settingsFieldClass,
  settingsLabelClass,
} from "./settings-card";
import { cn } from "@/lib/utils";
import { LogOut, UserX } from "lucide-react";

const actionBtnBase =
  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors sm:min-w-[140px]";

const neutralBtn =
  "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/10 dark:bg-black dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-zinc-900/50";

const dangerBtnIdle =
  "border-red-300/60 bg-red-500/10 text-red-600 hover:border-red-400 hover:bg-red-500/15 dark:border-red-500/30 dark:text-red-400";

const dangerBtnActive =
  "border-red-600 bg-red-500/15 text-red-700 ring-2 ring-red-500/20 dark:border-red-500 dark:text-red-300 dark:ring-red-500/30";

export function AccountSettingsSection() {
  const { signOut } = useWorkspace();
  const [panelOpen, setPanelOpen] = useState(false);

  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState("");
  const [accountDeleteLoading, setAccountDeleteLoading] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState<string | null>(
    null
  );

  const handleSignOut = () => {
    signOut();
  };

  const openAccountPanel = () => {
    setPanelOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (accountDeleteConfirm !== "SUPPRIMER") return;
    setAccountDeleteLoading(true);
    setAccountDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          confirmation: accountDeleteConfirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      window.location.href = "/auth/inactive?reason=account";
    } catch (err) {
      setAccountDeleteError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression"
      );
    } finally {
      setAccountDeleteLoading(false);
    }
  };

  return (
    <SettingsCard title="Zone de danger" variant="danger">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(actionBtnBase, neutralBtn)}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Se déconnecter
          </button>
          <button
            type="button"
            onClick={openAccountPanel}
            className={cn(
              actionBtnBase,
              panelOpen ? dangerBtnActive : dangerBtnIdle
            )}
          >
            <UserX className="h-5 w-5 shrink-0" />
            Supprimer mon compte
          </button>
        </div>

        {panelOpen && (
          <div className="space-y-3 rounded-lg border border-red-500/25 bg-red-500/5 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Cette action est irréversible. Tapez{" "}
              <strong className="text-red-600 dark:text-red-400">
                SUPPRIMER
              </strong>{" "}
              pour confirmer la suppression de votre compte et de vos données
              personnelles (RGPD).
            </p>
            <div className="space-y-2">
              <Label
                htmlFor="danger_delete_account"
                className={settingsLabelClass}
              >
                Confirmation
              </Label>
              <Input
                id="danger_delete_account"
                value={accountDeleteConfirm}
                onChange={(e) => {
                  setAccountDeleteConfirm(e.target.value);
                  setAccountDeleteError(null);
                }}
                placeholder="SUPPRIMER"
                className={cn(settingsFieldClass, "border-red-500/30")}
              />
            </div>
            {accountDeleteError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {accountDeleteError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                  setAccountDeleteConfirm("");
                  setAccountDeleteError(null);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium dark:border-white/10 dark:bg-zinc-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  accountDeleteConfirm !== "SUPPRIMER" || accountDeleteLoading
                }
                onClick={handleDeleteAccount}
                className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
              >
                {accountDeleteLoading
                  ? "Suppression…"
                  : "Supprimer mon compte"}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
