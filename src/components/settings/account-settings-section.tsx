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
import { LogOut, UserX, Building2 } from "lucide-react";

type DangerPanel = "none" | "account" | "org";

const actionBtnBase =
    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors sm:min-w-[140px]";

const neutralBtn =
    "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/10 dark:bg-black dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-zinc-900/50";

const dangerBtnIdle =
    "border-red-300/60 bg-red-500/10 text-red-600 hover:border-red-400 hover:bg-red-500/15 dark:border-red-500/30 dark:text-red-400";

const dangerBtnActive =
    "border-red-600 bg-red-500/15 text-red-700 ring-2 ring-red-500/20 dark:border-red-500 dark:text-red-300 dark:ring-red-500/30";

export function AccountSettingsSection() {
    const { signOut, isOwner, workspace, workspaceId, refresh } =
        useWorkspace();
    const [panel, setPanel] = useState<DangerPanel>("none");

    const [accountDeleteConfirm, setAccountDeleteConfirm] = useState("");
    const [accountDeleteLoading, setAccountDeleteLoading] = useState(false);
    const [accountDeleteError, setAccountDeleteError] = useState<string | null>(
        null
    );

    const [orgDeleteConfirm, setOrgDeleteConfirm] = useState("");
    const [orgDeleteLoading, setOrgDeleteLoading] = useState(false);
    const [orgDeleteError, setOrgDeleteError] = useState<string | null>(null);

    const handleSignOut = () => {
        signOut();
    };

    const openAccountPanel = () => {
        setPanel("account");
        setOrgDeleteConfirm("");
        setOrgDeleteError(null);
    };

    const openOrgPanel = () => {
        if (!isOwner || !workspaceId) return;
        setPanel("org");
        setAccountDeleteConfirm("");
        setAccountDeleteError(null);
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

    const handleDeleteOrg = async () => {
        if (orgDeleteConfirm !== workspace?.name || !workspaceId) return;
        setOrgDeleteLoading(true);
        setOrgDeleteError(null);
        try {
            const res = await fetch(`/api/organizations/${workspaceId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur");
            }
            setPanel("none");
            setOrgDeleteConfirm("");
            refresh?.();
            window.location.reload();
        } catch (err) {
            setOrgDeleteError(
                err instanceof Error ? err.message : "Erreur"
            );
        } finally {
            setOrgDeleteLoading(false);
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
                            panel === "account" ? dangerBtnActive : dangerBtnIdle
                        )}
                    >
                        <UserX className="h-5 w-5 shrink-0" />
                        Supprimer mon compte
                    </button>
                    <button
                        type="button"
                        disabled={!isOwner || !workspaceId}
                        title={
                            !isOwner
                                ? "Réservé au propriétaire de l'organisation"
                                : undefined
                        }
                        onClick={openOrgPanel}
                        className={cn(
                            actionBtnBase,
                            (!isOwner || !workspaceId) &&
                                "cursor-not-allowed opacity-40",
                            isOwner &&
                                workspaceId &&
                                panel === "org" &&
                                dangerBtnActive,
                            isOwner &&
                                workspaceId &&
                                panel !== "org" &&
                                dangerBtnIdle
                        )}
                    >
                        <Building2 className="h-5 w-5 shrink-0" />
                        Supprimer l&apos;organisation
                    </button>
                </div>

                {panel === "account" && (
                    <div className="space-y-3 rounded-lg border border-red-500/25 bg-red-500/5 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            Cette action est irréversible. Tapez{" "}
                            <strong className="text-red-600 dark:text-red-400">
                                SUPPRIMER
                            </strong>{" "}
                            pour confirmer la suppression de votre compte et de
                            vos données personnelles (RGPD).
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
                                className={cn(
                                    settingsFieldClass,
                                    "border-red-500/30"
                                )}
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
                                    setPanel("none");
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
                                    accountDeleteConfirm !== "SUPPRIMER" ||
                                    accountDeleteLoading
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

                {panel === "org" && isOwner && workspaceId && (
                    <div className="space-y-3 rounded-lg border border-red-500/25 bg-red-500/5 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            Action irréversible. Saisissez exactement le nom de
                            l&apos;organisation pour confirmer.
                        </p>
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            « {workspace?.name} »
                        </p>
                        <Input
                            value={orgDeleteConfirm}
                            onChange={(e) => {
                                setOrgDeleteConfirm(e.target.value);
                                setOrgDeleteError(null);
                            }}
                            placeholder={workspace?.name ?? ""}
                            className={cn(
                                settingsFieldClass,
                                "border-red-500/30"
                            )}
                        />
                        {orgDeleteError && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {orgDeleteError}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setPanel("none");
                                    setOrgDeleteConfirm("");
                                    setOrgDeleteError(null);
                                }}
                                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium dark:border-white/10 dark:bg-zinc-900"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                disabled={
                                    orgDeleteConfirm !== workspace?.name ||
                                    orgDeleteLoading
                                }
                                onClick={handleDeleteOrg}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {orgDeleteLoading
                                    ? "Suppression…"
                                    : "Supprimer définitivement"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </SettingsCard>
    );
}
