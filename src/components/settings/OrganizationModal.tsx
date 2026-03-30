"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/lib/workspace";
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
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Member {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  email: string | null;
}

interface OrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitch?: () => void;
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

export function OrganizationModal({
  open,
  onOpenChange,
  onSwitch,
}: OrganizationModalProps) {
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
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [orgNameInput, setOrgNameInput] = useState("");
  const [orgNameSaving, setOrgNameSaving] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

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
      const res = await fetch("/api/organization/members", { credentials: "include" });
      const json = await res.json();
      setMembers((json.data?.items ?? json.items ?? []) as Member[]);
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (open) {
      loadOrgs();
      loadMembers();
      setInviteEmail("");
      setInviteRole("member");
      setInviteError(null);
      setInviteSuccess(null);
      setDeleteConfirm("");
      setShowDeleteModal(false);
      setOrgNameInput(workspace?.name ?? "");
    }
  }, [open, loadOrgs, loadMembers, workspace?.name]);

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
      onOpenChange(false);
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
    if (!workspaceId || !isOwner || !name || name === workspace?.name) return;
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

  const handleDeleteOrg = async () => {
    if (deleteConfirm !== workspace?.name || !workspaceId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/organizations/${workspaceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      setShowDeleteModal(false);
      setDeleteConfirm("");
      refresh?.();
      onOpenChange(false);
      window.location.reload();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleteLoading(false);
    }
  };

  const callerIsAdmin = isOwner || members.find((m) => m.id === user?.id)?.role === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Organisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Active organisation name (owner can edit) */}
          {workspaceId && (
            <div className="space-y-2">
              <Label>Organisation active</Label>
              <div className="flex gap-2">
                <Input
                  value={orgNameInput}
                  onChange={(e) => setOrgNameInput(e.target.value)}
                  onBlur={() => isOwner && orgNameInput.trim() !== workspace?.name && handleSaveOrgName()}
                  disabled={!isOwner}
                  placeholder="Nom de l'organisation"
                  className="flex-1"
                />
                {isOwner && orgNameInput.trim() !== workspace?.name && (
                  <Button size="sm" onClick={handleSaveOrgName} disabled={orgNameSaving}>
                    {orgNameSaving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Org switcher */}
          <div className="space-y-2">
            <Label>Changer d&apos;organisation</Label>
            {loadingOrgs && orgs.length === 0 ? null : orgsError ? (
              <p className="text-sm text-destructive">{orgsError}</p>
            ) : orgs.length === 0 && !loadingOrgs ? (
              <p className="text-sm text-muted-foreground">Aucune organisation</p>
            ) : (
              <div className="flex flex-col gap-2">
                {orgs.map((org) => {
                  const isActive = org.id === workspaceId;
                  const isDeleted = org.status === "deleted";
                  return (
                    <div
                      key={org.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {org.name}
                          {isDeleted && (
                            <span className="ml-2 text-xs text-muted-foreground">(supprimée)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isActive ? "Actif" : PLAN_LABELS[(org.plan ?? "free").toLowerCase()] ?? org.plan ?? "Gratuit"}
                        </p>
                      </div>
                      {!isActive && (
                        <Button variant="outline" size="sm" onClick={() => handleSwitch(org.id)}>
                          Activer
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members */}
          {workspaceId && (
            <div className="space-y-2">
              <Label>Membres ({members.length})</Label>
              {loadingMembers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun membre</p>
              ) : (
                <div className="space-y-1">
                  {members.map((m) => {
                    const Icon = ROLE_ICONS[m.role] ?? Shield;
                    const isSelf = m.id === user?.id;
                    return (
                      <div key={m.id} className="flex items-center gap-3 rounded-md border p-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={m.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-xs font-medium">
                            {m.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {m.name} {isSelf && <span className="text-xs text-muted-foreground">(vous)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.email ?? "—"}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Icon className="h-3 w-3" />
                            {ROLE_LABELS[m.role] ?? m.role}
                          </div>
                        </div>
                        {callerIsAdmin && !isSelf && m.role !== "owner" && (
                          <div className="flex items-center gap-1">
                            <select
                              defaultValue={m.role}
                              onChange={(e) => handleChangeRole(m.id, e.target.value)}
                              className="rounded border bg-background px-1.5 py-0.5 text-xs"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Membre</option>
                            </select>
                            <button
                              onClick={() => setMemberToRemove({ id: m.id, name: m.name })}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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

          {/* Invite by e-mail (owner/admin) */}
          {callerIsAdmin && workspaceId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Inviter par e-mail
              </Label>
              <p className="text-xs text-muted-foreground">
                Un e-mail Supabase est envoyé à la personne : elle pourra accepter l’invitation et
                définir son mot de passe.
              </p>
              <form onSubmit={handleInviteByEmail} className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collegue@entreprise.com"
                    className="flex-1"
                    autoComplete="off"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "member" | "admin")
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Administrateur</option>
                  </select>
                  <Button
                    type="submit"
                    disabled={inviteEmailLoading || !inviteEmail.trim()}
                    className="shrink-0"
                  >
                    {inviteEmailLoading ? "Envoi…" : "Inviter"}
                  </Button>
                </div>
                {inviteError ? (
                  <p className="text-sm text-destructive">{inviteError}</p>
                ) : null}
                {inviteSuccess ? (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {inviteSuccess}
                  </p>
                ) : null}
              </form>
            </div>
          )}

          {/* Delete org (owner only) */}
          {isOwner && workspaceId && (
            <div className="border-t pt-4">
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                Supprimer l&apos;organisation
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}
        title="Retirer ce membre ?"
        description={`${memberToRemove?.name ?? "Ce membre"} sera retiré de l'organisation.`}
        confirmLabel="Retirer"
        variant="destructive"
        onConfirm={() => {
          if (memberToRemove) {
            handleRemoveMember(memberToRemove.id);
            setMemberToRemove(null);
          }
        }}
      />

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;organisation</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Pour confirmer, saisissez exactement le nom de l&apos;organisation ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-destructive font-medium">
              Nom de l&apos;organisation : &quot;{workspace?.name}&quot;
            </Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={workspace?.name ?? ""}
              className="mt-2 border-destructive/50"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== workspace?.name || deleteLoading}
              onClick={handleDeleteOrg}
            >
              {deleteLoading ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
