"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
import {
  getUserOrganizations,
  type Organization,
} from "@/lib/organizations/utils-client";

interface OrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitch?: () => void;
}

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
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  useEffect(() => {
    if (open) {
      loadOrgs();
      setLinkedinUrl("");
      setInviteError(null);
      setDeleteConfirm("");
      setShowDeleteConfirm(false);
    }
  }, [open, loadOrgs]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !linkedinUrl.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organization_id: workspaceId,
          linkedin_url: linkedinUrl.trim(),
          role: "member",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setLinkedinUrl("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Erreur lors de l'invitation");
    } finally {
      setInviteLoading(false);
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
      refresh?.();
      onOpenChange(false);
      window.location.reload();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Organisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Organisation actuelle</Label>
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
                            <span className="ml-2 text-xs text-muted-foreground">
                              (supprimée)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isActive ? "Actif" : (org.plan === "free" ? "Gratuit" : org.plan) || "Gratuit"}
                        </p>
                      </div>
                      {!isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSwitch(org.id)}
                        >
                          Activer
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inviter par LinkedIn (owner only) */}
          {isOwner && workspaceId && (
            <div className="space-y-2">
              <Label>Inviter un membre</Label>
              <p className="text-xs text-muted-foreground">
                Saisissez le lien LinkedIn complet du profil à inviter.
              </p>
              <form onSubmit={handleInvite} className="flex gap-2">
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/..."
                />
                <Button type="submit" disabled={inviteLoading}>
                  {inviteLoading ? "…" : "Inviter"}
                </Button>
              </form>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
            </div>
          )}

          {/* Supprimer l'organisation (owner only) */}
          {isOwner && workspaceId && !showDeleteConfirm && (
            <div className="border-t pt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Supprimer l&apos;organisation
              </Button>
            </div>
          )}
          {isOwner && workspaceId && showDeleteConfirm && (
            <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <Label className="text-destructive">
                Confirmer la suppression de &quot;{workspace?.name}&quot;
              </Label>
              <p className="text-xs text-muted-foreground">
                Saisissez le nom de l&apos;organisation pour confirmer. Les données
                seront conservées 30 jours pour export.
              </p>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={workspace?.name ?? ""}
                className="border-destructive/50"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirm("");
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteConfirm !== workspace?.name || deleteLoading}
                  onClick={handleDeleteOrg}
                >
                  {deleteLoading ? "Suppression…" : "Supprimer"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
