"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, AlertTriangle, Crown } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { Input } from "@/components/ui/input";
import { SettingsCard, settingsFieldClass } from "./settings-card";
import { cn } from "@/lib/utils";
import { TransferOwnershipModal } from "@/components/organizations/transfer-ownership-modal";

interface MemberShape {
  user_id: string;
  name: string;
  role: "owner" | "admin" | "member";
  active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export function OrganizationDangerSection() {
  const { isOwner, user, workspace, workspaceId, refresh } = useWorkspace();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [members, setMembers] = useState<MemberShape[]>([]);

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch("/api/organization/members", {
        credentials: "include",
      });
      const json = await res.json();
      const items = (json.data?.items ?? json.items ?? []) as Array<{
        user_id: string;
        name: string;
        role: string;
        active?: boolean;
        avatar_url: string | null;
        created_at?: string | null;
      }>;
      setMembers(
        items.map((m) => ({
          user_id: m.user_id,
          name: m.name,
          role: (m.role as "owner" | "admin" | "member") ?? "member",
          active: m.active ?? true,
          avatar_url: m.avatar_url,
          created_at: m.created_at ?? "",
        }))
      );
    } catch {
      setMembers([]);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (transferOpen) void loadMembers();
  }, [transferOpen, loadMembers]);

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
    <SettingsCard title="Zone de danger" description="Actions irréversibles sur cette organisation" icon={<AlertTriangle />} variant="danger">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setTransferOpen(true)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
            "border-amber-300/60 bg-amber-500/10 text-amber-700 hover:border-amber-400 hover:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300"
          )}
        >
          <Crown className="h-5 w-5 shrink-0" />
          Transférer la propriété
        </button>

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

        <TransferOwnershipModal
          open={transferOpen}
          organizationId={workspaceId}
          callerId={user?.id ?? ""}
          callerName={user?.email ?? "Vous"}
          members={members}
          intent="standalone"
          onClose={() => setTransferOpen(false)}
          onTransferred={() => {
            refresh?.();
          }}
        />

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
