"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { Input } from "@/components/ui/input";
import { SettingsCard, settingsFieldClass } from "./settings-card";
import { cn } from "@/lib/utils";

export function OrganizationDangerSection() {
  const { isOwner, workspace, workspaceId, refresh } = useWorkspace();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!isOwner || !workspaceId) return null;

  const handleDelete = async () => {
    if (confirm !== workspace?.name) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${workspaceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur");
      }
      setOpen(false);
      setConfirm("");
      refresh?.();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsCard title="Zone de danger" variant="danger">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          disabled={!isOwner}
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
            open
              ? "border-red-600 bg-red-500/15 text-red-700 ring-2 ring-red-500/20 dark:border-red-500 dark:text-red-300"
              : "border-red-300/60 bg-red-500/10 text-red-600 hover:border-red-400 hover:bg-red-500/15 dark:border-red-500/30 dark:text-red-400"
          )}
        >
          <Building2 className="h-5 w-5 shrink-0" />
          Supprimer l&apos;organisation
        </button>

        {open && (
          <div className="space-y-3 rounded-lg border border-red-500/25 bg-red-500/5 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Action irréversible. Saisissez exactement le nom de
              l&apos;organisation pour confirmer.
            </p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              « {workspace?.name} »
            </p>
            <Input
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder={workspace?.name ?? ""}
              className={cn(settingsFieldClass, "border-red-500/30")}
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                  setError(null);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium dark:border-white/10 dark:bg-zinc-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={confirm !== workspace?.name || loading}
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
