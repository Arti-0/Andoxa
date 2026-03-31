"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/lib/workspace";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    getUserOrganizations,
    type Organization,
} from "@/lib/organizations/utils-client";
import {
    Loader2,
    UserMinus,
    Shield,
    ShieldCheck,
    Crown,
    Mail,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import {
    SettingsCard,
    settingsFieldClass,
    settingsLabelClass,
    settingsSaveButtonClass,
} from "@/components/settings/settings-card";
import { cn } from "@/lib/utils";

interface Member {
    id: string;
    name: string;
    role: string;
    avatar_url: string | null;
    email: string | null;
}

const ROLE_LABELS: Record<string, string> = {
    owner: "Propriétaire",
    admin: "Administrateur",
    member: "Membre",
};

const PLAN_LABELS: Record<string, string> = {
    free: "Gratuit",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
};

const ROLE_ICONS: Record<string, typeof Crown> = {
    owner: Crown,
    admin: ShieldCheck,
    member: Shield,
};

const selectClass = cn(
    settingsFieldClass,
    "h-10 cursor-pointer appearance-auto bg-zinc-50 py-2 dark:bg-black"
);

/** Compact role picker vs wide e-mail field in invite row */
const inviteRoleSelectClass = cn(
    settingsFieldClass,
    "h-10 w-full cursor-pointer appearance-auto bg-zinc-50 py-1.5 pl-2.5 pr-7 text-sm dark:bg-black sm:w-[10.5rem] sm:shrink-0 sm:grow-0"
);

export function OrganizationSettingsSection({
    onSwitch,
    showLinkedInAutoEnrich,
    linkedInAutoEnrich,
    linkedInAutoEnrichSaving,
    onLinkedInAutoEnrichChange,
}: {
    onSwitch?: () => void;
    showLinkedInAutoEnrich?: boolean;
    linkedInAutoEnrich?: boolean;
    linkedInAutoEnrichSaving?: boolean;
    onLinkedInAutoEnrichChange?: (checked: boolean) => void;
}) {
    const { user, workspace, workspaceId, isOwner, switchWorkspace, refresh } =
        useWorkspace();
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [orgsError, setOrgsError] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
    const [inviteEmailLoading, setInviteEmailLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

    const [orgNameInput, setOrgNameInput] = useState("");
    const [orgNameSaving, setOrgNameSaving] = useState(false);

    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const loadOrgs = useCallback(async () => {
        if (!user?.id) return;
        setLoadingOrgs(true);
        setOrgsError(null);
        try {
            const list = await getUserOrganizations(user.id);
            setOrgs(list);
        } catch {
            setOrgsError("Impossible de charger les organisations");
        } finally {
            setLoadingOrgs(false);
        }
    }, [user?.id]);

    const loadMembers = useCallback(async () => {
        if (!workspaceId) return;
        setLoadingMembers(true);
        try {
            const res = await fetch("/api/organization/members", {
                credentials: "include",
            });
            const json = await res.json();
            setMembers((json.data?.items ?? json.items ?? []) as Member[]);
        } catch {
            setMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadOrgs();
    }, [loadOrgs]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    useEffect(() => {
        setOrgNameInput(workspace?.name ?? "");
    }, [workspace?.name]);

    useEffect(() => {
        setInviteEmail("");
        setInviteRole("member");
        setInviteError(null);
        setInviteSuccess(null);
        setMemberToRemove(null);
    }, [workspaceId]);

    const handleInviteByEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspaceId || !inviteEmail.trim()) return;
        setInviteEmailLoading(true);
        setInviteError(null);
        setInviteSuccess(null);
        try {
            const res = await fetch("/api/invitations/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    organization_id: workspaceId,
                    role: inviteRole,
                }),
            });
            const json = (await res.json()) as {
                success?: boolean;
                error?: { message?: string };
            };
            if (!res.ok || !json.success) {
                throw new Error(
                    json.error?.message ?? "Impossible d’envoyer l’invitation"
                );
            }
            toast.success("Invitation envoyée par e-mail");
            setInviteEmail("");
            setInviteSuccess(
                "Un e-mail d’invitation a été envoyé. La personne pourra définir son mot de passe après acceptation."
            );
            loadMembers();
        } catch (err) {
            setInviteError(
                err instanceof Error ? err.message : "Erreur lors de l’invitation"
            );
        } finally {
            setInviteEmailLoading(false);
        }
    };

    const handleSwitch = async (orgId: string) => {
        try {
            await switchWorkspace(orgId);
            refresh?.();
            onSwitch?.();
        } catch (err) {
            console.error("Switch organization error:", err);
        }
    };

    const handleChangeRole = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/organization/members/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json?.error?.message ?? "Erreur");
            }
            toast.success("Rôle mis à jour");
            loadMembers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            const res = await fetch(`/api/organization/members/${userId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json?.error?.message ?? "Erreur");
            }
            toast.success("Membre retiré");
            loadMembers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleSaveOrgName = async () => {
        const name = orgNameInput.trim();
        if (!workspaceId || !isOwner || !name || name === workspace?.name)
            return;
        setOrgNameSaving(true);
        try {
            const res = await fetch(`/api/organizations/${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Erreur");
            }
            toast.success("Nom de l'organisation mis à jour");
            refresh?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        } finally {
            setOrgNameSaving(false);
        }
    };

    const callerIsAdmin =
        isOwner ||
        members.find((m) => m.id === user?.id)?.role === "admin";

    return (
        <SettingsCard
            title="Organisation"
            description="Organisation active, membres et invitations"
        >
            {workspaceId && (
                <div className="space-y-2">
                    <Label className={settingsLabelClass}>
                        Organisation active
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            value={orgNameInput}
                            onChange={(e) => setOrgNameInput(e.target.value)}
                            onBlur={() =>
                                isOwner &&
                                orgNameInput.trim() !== workspace?.name &&
                                void handleSaveOrgName()
                            }
                            disabled={!isOwner}
                            placeholder="Nom de l'organisation"
                            className={cn(settingsFieldClass, "flex-1")}
                        />
                        {isOwner &&
                            orgNameInput.trim() !== workspace?.name && (
                                <button
                                    type="button"
                                    onClick={handleSaveOrgName}
                                    disabled={orgNameSaving}
                                    className={settingsSaveButtonClass}
                                >
                                    {orgNameSaving
                                        ? "Enregistrement…"
                                        : "Enregistrer"}
                                </button>
                            )}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label className={settingsLabelClass}>
                    Changer d&apos;organisation
                </Label>
                {loadingOrgs && orgs.length === 0 ? null : orgsError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {orgsError}
                    </p>
                ) : orgs.length === 0 && !loadingOrgs ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Aucune organisation
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {orgs.map((org) => {
                            const isActive = org.id === workspaceId;
                            const isDeleted = org.status === "deleted";
                            return (
                                <div
                                    key={org.id}
                                    className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
                                >
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white">
                                            {org.name}
                                            {isDeleted && (
                                                <span className="ml-2 text-xs text-zinc-500">
                                                    (supprimée)
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {isActive
                                                ? "Actif"
                                                : (PLAN_LABELS[
                                                      (org.plan ?? "free").toLowerCase()
                                                  ] ??
                                                  org.plan ??
                                                  "Gratuit")}
                                        </p>
                                    </div>
                                    {!isActive && (
                                        <button
                                            type="button"
                                            onClick={() => handleSwitch(org.id)}
                                            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:bg-black dark:text-white dark:hover:bg-zinc-900"
                                        >
                                            Activer
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {workspaceId && (
                <div className="space-y-2">
                    <Label className={settingsLabelClass}>
                        Membres ({members.length})
                    </Label>
                    {memberToRemove && (
                        <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                Retirer{" "}
                                <strong>{memberToRemove.name}</strong> de
                                l&apos;organisation ?
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMemberToRemove(null)}
                                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium dark:border-white/10 dark:bg-zinc-900"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void handleRemoveMember(
                                            memberToRemove.id
                                        );
                                        setMemberToRemove(null);
                                    }}
                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                >
                                    Retirer
                                </button>
                            </div>
                        </div>
                    )}
                    {loadingMembers ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin" />{" "}
                            Chargement…
                        </div>
                    ) : members.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Aucun membre
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {members.map((m) => {
                                const Icon = ROLE_ICONS[m.role] ?? Shield;
                                const isSelf = m.id === user?.id;
                                return (
                                    <div
                                        key={m.id}
                                        className="flex flex-col gap-2 rounded-md border border-zinc-200 p-2 sm:flex-row sm:items-center dark:border-white/10"
                                    >
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage
                                                src={m.avatar_url ?? undefined}
                                                alt=""
                                            />
                                            <AvatarFallback className="text-xs font-medium">
                                                {m.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                                                {m.name}{" "}
                                                {isSelf && (
                                                    <span className="text-xs font-normal text-zinc-500">
                                                        (vous)
                                                    </span>
                                                )}
                                            </p>
                                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                {m.email ?? "—"}
                                            </p>
                                            <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                <Icon className="h-3 w-3" />
                                                {ROLE_LABELS[m.role] ?? m.role}
                                            </div>
                                        </div>
                                        {callerIsAdmin &&
                                            !isSelf &&
                                            m.role !== "owner" && (
                                                <div className="flex items-center gap-1">
                                                    <select
                                                        defaultValue={m.role}
                                                        onChange={(e) =>
                                                            handleChangeRole(
                                                                m.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className={cn(
                                                            selectClass,
                                                            "max-w-[120px] text-xs"
                                                        )}
                                                    >
                                                        <option value="admin">
                                                            Admin
                                                        </option>
                                                        <option value="member">
                                                            Membre
                                                        </option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setMemberToRemove({
                                                                id: m.id,
                                                                name: m.name,
                                                            })
                                                        }
                                                        className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-600 dark:text-zinc-400"
                                                        title="Retirer"
                                                    >
                                                        <UserMinus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {callerIsAdmin && workspaceId && (
                <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-white/10">
                    <Label
                        className={cn(
                            settingsLabelClass,
                            "flex items-center gap-2"
                        )}
                    >
                        <Mail className="h-4 w-4" />
                        Inviter par e-mail
                    </Label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Un e-mail Supabase est envoyé : la personne pourra
                        accepter l&apos;invitation et définir son mot de passe.
                    </p>
                    <form
                        onSubmit={handleInviteByEmail}
                        className="flex flex-col gap-2"
                    >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-stretch">
                            <Input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) =>
                                    setInviteEmail(e.target.value)
                                }
                                placeholder="collegue@entreprise.com"
                                className={cn(
                                    settingsFieldClass,
                                    "min-h-10 min-w-0 w-full"
                                )}
                                autoComplete="off"
                            />
                            <select
                                value={inviteRole}
                                onChange={(e) =>
                                    setInviteRole(
                                        e.target.value as "member" | "admin"
                                    )
                                }
                                className={inviteRoleSelectClass}
                            >
                                <option value="member">Membre</option>
                                <option value="admin">Administrateur</option>
                            </select>
                            <button
                                type="submit"
                                disabled={
                                    inviteEmailLoading || !inviteEmail.trim()
                                }
                                className={cn(
                                    "inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-100 sm:w-auto",
                                    "min-h-10"
                                )}
                            >
                                {inviteEmailLoading ? "Envoi…" : "Inviter"}
                            </button>
                        </div>
                        {inviteError ? (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {inviteError}
                            </p>
                        ) : null}
                        {inviteSuccess ? (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                {inviteSuccess}
                            </p>
                        ) : null}
                    </form>
                </div>
            )}

            {showLinkedInAutoEnrich &&
                onLinkedInAutoEnrichChange !== undefined &&
                linkedInAutoEnrich !== undefined && (
                    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Sparkles className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                                <span
                                    className={cn(
                                        settingsLabelClass,
                                        "inline-flex items-center gap-2"
                                    )}
                                >
                                    Enrichissement LinkedIn à l&apos;import
                                </span>
                                <PremiumBadge variant="small" showStar={false}>
                                    Pro+
                                </PremiumBadge>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Après chaque import CSV, enrichir automatiquement
                                les fiches (file d&apos;attente, crédits).
                            </p>
                        </div>
                        <Switch
                            checked={linkedInAutoEnrich}
                            disabled={linkedInAutoEnrichSaving}
                            onCheckedChange={onLinkedInAutoEnrichChange}
                            aria-label="Enrichissement automatique à l'import"
                            className={cn(
                                "h-6 w-11 shrink-0 border border-zinc-300 bg-zinc-200/90 shadow-none dark:border-white/15 dark:bg-zinc-700",
                                "data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900",
                                "dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white",
                                "[&_[data-slot=switch-thumb]]:size-[1.125rem]",
                                "data-[state=checked]:[&_[data-slot=switch-thumb]]:bg-white",
                                "dark:data-[state=checked]:[&_[data-slot=switch-thumb]]:bg-zinc-900"
                            )}
                        />
                    </div>
                )}
        </SettingsCard>
    );
}
