"use client";

import { useState, useCallback } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  MessageSquare,
  LayoutGrid,
  PhoneCall,
  ExternalLink,
  UserPlus,
  Megaphone,
  Loader2,
  Sparkles,
  Link2,
  Pencil,
  Check,
  X,
  Workflow,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProspectStateStrip } from "@/components/prospect/prospect-state-strip";
import { CampaignModal } from "@/components/campaigns/campaign-modal";
import type { CampaignConfig } from "@/lib/campaigns/types";
import { WorkflowEnrollModal } from "@/components/workflows/workflow-enroll-modal";
import { ActivityFeed } from "@/components/design";
import type { ActivityFeedItem } from "@/components/design";
import type { Prospect } from "@/lib/types/prospects";
import { useWorkspace } from "@/lib/workspace";
import { normalizePlanIdForRoutes } from "@/lib/billing/effective-plan";
import { canAccessRoute, type PlanId } from "@/lib/config/plans-config";
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";

const INVITE_DEFAULT_MESSAGE = `Bonjour {{firstName}},
Je souhaite échanger avec vous sur {{company}}.
Cordialement`;

interface ProspectProfileContentProps {
  prospect: Prospect;
  linkedChatId?: string | null;
}

function formatDate(ts: string | null | undefined) {
  return ts
    ? new Date(ts).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
}

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  editing: boolean;
  placeholder?: string;
  type?: string;
}

function EditableField({ value, onSave, editing, placeholder, type = "text" }: EditableFieldProps) {
  const [local, setLocal] = useState(value);

  if (!editing) return <span>{value || "—"}</span>;

  return (
    <input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      placeholder={placeholder}
      className="w-full rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      autoFocus
    />
  );
}

export function ProspectProfileContent({
  prospect,
  linkedChatId,
}: ProspectProfileContentProps) {
  const { workspace } = useWorkspace();
  const routePlan = normalizePlanIdForRoutes(
    workspace?.plan,
    workspace?.subscription_status
  ) as PlanId;
  const canUseWorkflows = canAccessRoute(routePlan, "/workflows");

  const queryClient = useQueryClient();
  const activityRef = useRef<HTMLDivElement>(null);
  const [enriching, setEnriching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [linkingChat, setLinkingChat] = useState(false);
  const router = useRouter();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const { data: linkedInAccount } = useLinkedInAccount();
  const linkedinIsPremium = linkedInAccount?.linkedin_is_premium ?? false;

  const hasContact = prospect.email || prospect.phone || prospect.website || prospect.linkedin;
  const hasLinkedin = !!prospect.linkedin?.trim();
  const profilePictureUrl =
    (prospect.enrichment_metadata as { profile_picture_url?: string } | null)
      ?.profile_picture_url ?? null;

  const invalidateProspect = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
    queryClient.invalidateQueries({ queryKey: ["prospect-linked-chat", prospect.id] });
    queryClient.invalidateQueries({ queryKey: ["prospect-activity", prospect.id] });
    queryClient.invalidateQueries({ queryKey: ["prospects"] });
  }, [queryClient, prospect.id]);

  const updateMutation = useMutation({
    mutationFn: async (fields: Record<string, string | null>) => {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      invalidateProspect();
      toast.success("Prospect mis à jour");
    },
    onError: () => toast.error("Échec de la mise à jour"),
  });

  const saveField = useCallback(
    (field: string, value: string) => {
      updateMutation.mutate({ [field]: value || null });
    },
    [updateMutation]
  );

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/enrich`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      const data = json?.data ?? json;
      if (!res.ok) {
        toast.error(data?.error?.message ?? "Erreur lors de l'enrichissement");
        return;
      }
      toast.success("Prospect enrichi avec succès");
      invalidateProspect();
    } catch {
      toast.error("Erreur lors de l'enrichissement");
    } finally {
      setEnriching(false);
    }
  };

  const handleInviteDefault = async () => {
    setInviting(true);
    try {
      const res = await fetch("/api/unipile/campaigns/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prospect_ids: [prospect.id],
          message: INVITE_DEFAULT_MESSAGE,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Erreur lors de l'invitation");
        return;
      }
      const warnings = (json?.data?.warnings ?? []) as { prospect_id: string; code: string }[];
      if (warnings.length > 0) {
        toast.info(
          "Ce prospect a déjà une réponse LinkedIn enregistrée — l’invitation a quand même été envoyée."
        );
      }
      toast.success("Invitation envoyée");
      invalidateProspect();
    } catch {
      toast.error("Erreur lors de l'invitation");
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = () => {
    setCampaignConfig({
      channel: "linkedin",
      linkedInAction: linkedinIsPremium ? "invite_with_note" : "invite",
    });
    setShowCampaignModal(true);
  };

  const openContactModal = () => {
    setCampaignConfig({ channel: "linkedin", linkedInAction: "contact" });
    setShowCampaignModal(true);
  };

  const handleLinkExistingChat = async () => {
    setLinkingChat(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/link-existing-chat`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      const data = json?.data ?? json;
      if (!res.ok) {
        toast.error(data?.error?.message ?? "Erreur lors de la recherche");
        return;
      }
      if (data?.found && data?.chat_id) {
        toast.success("Conversation associée avec succès");
        invalidateProspect();
        window.location.href = `/messagerie?chat=${encodeURIComponent(data.chat_id)}`;
      } else {
        toast.info(
          data?.message ??
            "Aucune conversation trouvée. Utilisez « Démarrer conversation » pour envoyer un message."
        );
        invalidateProspect();
      }
    } catch {
      toast.error("Impossible d'associer la conversation");
    } finally {
      setLinkingChat(false);
    }
  };

  const handleCampaignModalClose = (open: boolean) => {
    if (!open) {
      setShowCampaignModal(false);
      setCampaignConfig(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={editing ? "default" : "outline"}
          size="sm"
          onClick={() => setEditing(!editing)}
        >
          {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          <span className="ml-2">{editing ? "Terminer" : "Modifier"}</span>
        </Button>
        {hasLinkedin && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleEnrich} disabled={enriching}>
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-2">Enrichir</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleInviteDefault} disabled={inviting}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span className="ml-2">Inviter</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openInviteModal}>
              <UserPlus className="h-4 w-4" />
              <span className="ml-2">Inviter avec message</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openContactModal}>
              <MessageSquare className="h-4 w-4" />
              <span className="ml-2">Démarrer conversation</span>
            </Button>
            {!linkedChatId && (
              <Button type="button" variant="outline" size="sm" onClick={handleLinkExistingChat} disabled={linkingChat}>
                {linkingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                <span className="ml-2">Associer la conversation existante</span>
              </Button>
            )}
          </>
        )}
        {linkedChatId && (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/messagerie?chat=${encodeURIComponent(linkedChatId)}`}
              className="inline-flex items-center"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="ml-2">Ouvrir la conversation</span>
            </Link>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/call-sessions/new?prospects=${prospect.id}`} className="inline-flex items-center">
            <PhoneCall className="h-4 w-4" />
            <span className="ml-2">Session d&apos;appels</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/campaigns" className="inline-flex items-center">
            <Megaphone className="h-4 w-4" />
            <span className="ml-2">Campagnes</span>
          </Link>
        </Button>
        {canUseWorkflows && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/workflows" className="inline-flex items-center">
              <Workflow className="h-4 w-4" />
              <span className="ml-2">Parcours WhatsApp</span>
            </Link>
          </Button>
        )}
        {hasLinkedin && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={
                prospect.linkedin!.startsWith("http")
                  ? prospect.linkedin!
                  : `https://${prospect.linkedin}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              <Linkedin className="h-4 w-4 shrink-0" />
              <span className="ml-2 truncate max-w-[200px]">
                {prospect.linkedin!.replace(/^https?:\/\/(www\.)?/, "")}
              </span>
              <ExternalLink className="ml-1.5 h-3 w-3 shrink-0" />
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={prospect.bdd_id ? `/crm?bdd_id=${prospect.bdd_id}` : "/crm"} className="inline-flex items-center">
            <LayoutGrid className="h-4 w-4" />
            <span className="ml-2">CRM</span>
          </Link>
        </Button>
      </div>

      <CampaignModal
        open={showCampaignModal}
        onOpenChange={handleCampaignModalClose}
        config={campaignConfig}
        prospects={[prospect]}
        onSuccess={() => {
          const wasContact = campaignConfig?.linkedInAction === 'contact';
          setShowCampaignModal(false);
          setCampaignConfig(null);
          invalidateProspect();
          if (wasContact) router.push('/messagerie');
        }}
        isPremium={linkedinIsPremium}
      />

      <WorkflowEnrollModal
        open={showWorkflowModal}
        onOpenChange={setShowWorkflowModal}
        prospects={[prospect]}
        onSuccess={() => {
          setShowWorkflowModal(false);
          invalidateProspect();
        }}
      />

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {profilePictureUrl ? (
                <img src={profilePictureUrl} alt="" className="h-16 w-16 object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <CardTitle className="text-xl">
                <EditableField value={prospect.full_name ?? ""} onSave={(v) => saveField("full_name", v)} editing={editing} placeholder="Nom complet" />
              </CardTitle>
              <div className="text-muted-foreground">
                <EditableField value={prospect.job_title ?? ""} onSave={(v) => saveField("job_title", v)} editing={editing} placeholder="Poste" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <EditableField value={prospect.company ?? ""} onSave={(v) => saveField("company", v)} editing={editing} placeholder="Entreprise" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* State strip */}
      <ProspectStateStrip
        prospect={prospect}
        onScrollToActivity={() => activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations de contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            {editing ? (
              <EditableField value={prospect.email ?? ""} onSave={(v) => saveField("email", v)} editing={editing} placeholder="Email" type="email" />
            ) : prospect.email ? (
              <a href={`mailto:${prospect.email}`} className="text-primary hover:underline">{prospect.email}</a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            {editing ? (
              <EditableField value={prospect.phone ?? ""} onSave={(v) => saveField("phone", v)} editing={editing} placeholder="Téléphone" type="tel" />
            ) : prospect.phone ? (
              <a href={`tel:${prospect.phone}`} className="text-primary hover:underline">{prospect.phone}</a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Linkedin className="h-4 w-4 shrink-0 text-muted-foreground" />
            {editing ? (
              <EditableField value={prospect.linkedin ?? ""} onSave={(v) => saveField("linkedin_url", v)} editing={editing} placeholder="URL LinkedIn" />
            ) : prospect.linkedin ? (
              <a
                href={prospect.linkedin.startsWith("http") ? prospect.linkedin : `https://${prospect.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Profil LinkedIn
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          {(prospect.website || editing) && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              {editing ? (
                <EditableField value={prospect.website ?? ""} onSave={(v) => saveField("website", v)} editing={editing} placeholder="Site web" />
              ) : prospect.website ? (
                <a
                  href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {prospect.website}
                </a>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contexte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Industrie</span>
              <div className="mt-0.5">
                <EditableField value={prospect.industry ?? ""} onSave={(v) => saveField("industry", v)} editing={editing} placeholder="Industrie" />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Taille</span>
              <div className="mt-0.5">
                <EditableField value={prospect.employees ?? ""} onSave={(v) => saveField("employees", v)} editing={editing} placeholder="Nb employés" />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Localisation</span>
              <div className="mt-0.5">
                <EditableField value={prospect.location ?? ""} onSave={(v) => saveField("location", v)} editing={editing} placeholder="Localisation" />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Budget</span>
              <div className="mt-0.5">
                <EditableField value={prospect.budget ?? ""} onSave={(v) => saveField("budget", v)} editing={editing} placeholder="Budget" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline et notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="font-medium">Statut : </span>
            {editing ? (
              <select
                defaultValue={prospect.status ?? "new"}
                onChange={(e) => saveField("status", e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="new">Nouveau</option>
                <option value="contacted">Contacté</option>
                <option value="qualified">Qualifié</option>
                <option value="rdv">RDV</option>
                <option value="proposal">Proposition</option>
                <option value="won">Signé</option>
                <option value="lost">Perdu</option>
              </select>
            ) : (
              <span className="capitalize">{prospect.status ?? "—"}</span>
            )}
          </div>
          <div>
            <span className="font-medium">Notes :</span>
            {editing ? (
              <textarea
                defaultValue={prospect.notes ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (prospect.notes ?? "")) saveField("notes", e.target.value);
                }}
                className="mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="Ajouter des notes..."
              />
            ) : prospect.notes ? (
              <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {prospect.notes}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Aucune note</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div ref={activityRef}>
        <ProspectOrganizationActivity prospectId={prospect.id} />
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métadonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Source :</span>
            <EditableField value={prospect.source ?? ""} onSave={(v) => saveField("source", v)} editing={editing} placeholder="Source" />
          </div>
          {prospect.created_at && <p>Créé le {formatDate(prospect.created_at)}</p>}
          {prospect.enriched_at && <p>Enrichi le {formatDate(prospect.enriched_at)}</p>}
        </CardContent>
      </Card>

      {/* Call session history */}
      <ProspectCallHistory prospectId={prospect.id} />
    </div>
  );
}

interface CallSessionEntry {
  id: string;
  call_session_id: string;
  call_duration_s: number;
  status: string;
  outcome: string | null;
  called_at: string | null;
  session_title?: string;
}

type ProspectActivityRow = {
  id: string;
  action: string;
  created_at: string;
  actor_name: string | null;
  title: string;
  description: string;
  target_url?: string;
};

function activityItemStatus(action: string): ActivityFeedItem["status"] {
  if (action === "workflow_step_failed") return "warning";
  if (
    action === "workflow_run_completed" ||
    action === "workflow_enrolled" ||
    action === "workflow_step_completed" ||
    action === "prospect_restored"
  ) {
    return "success";
  }
  return "default";
}

function ProspectOrganizationActivity({ prospectId }: { prospectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["prospect-activity", prospectId],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${prospectId}/activity?limit=50`, {
        credentials: "include",
      });
      if (!res.ok) return { items: [] as ProspectActivityRow[] };
      const json = await res.json();
      const payload = json.data ?? json;
      return payload as { items: ProspectActivityRow[] };
    },
    enabled: !!prospectId,
    refetchOnWindowFocus: true,
  });

  const items: ActivityFeedItem[] = (data?.items ?? []).map((row) => ({
    id: row.id,
    name: row.title,
    action: row.description,
    time: new Date(row.created_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: activityItemStatus(row.action),
    href: row.target_url,
    actorName: row.actor_name ?? undefined,
  }));

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ActivityFeed
      title="Activité de l’organisation"
      icon={Activity}
      items={items}
      emptyMessage="Aucune action enregistrée pour ce prospect (parcours WhatsApp, changements de statut, etc.)."
    />
  );
}

function ProspectCallHistory({ prospectId }: { prospectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["prospect-call-history", prospectId],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${prospectId}/call-history`, { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? json) as CallSessionEntry[];
    },
    enabled: !!prospectId,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PhoneCall className="h-4 w-4" />
          Historique d&apos;appels ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((entry) => {
            const dur = entry.call_duration_s;
            const durStr = dur > 0
              ? `${Math.floor(dur / 60)}m ${dur % 60}s`
              : "—";
            return (
              <Link
                key={entry.id}
                href={`/call-sessions/${entry.call_session_id}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent/50"
              >
                <div>
                  <p className="font-medium">{entry.session_title ?? "Session d'appels"}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.called_at
                      ? new Date(entry.called_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{durStr}</span>
                  {entry.outcome && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium capitalize">
                      {entry.outcome}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
