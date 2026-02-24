"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CampaignModal } from "@/components/crm/campaign-modal";
import type { Prospect } from "@/lib/types/prospects";

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

export function ProspectProfileContent({
  prospect,
  linkedChatId,
}: ProspectProfileContentProps) {
  const queryClient = useQueryClient();
  const [enriching, setEnriching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [linkingChat, setLinkingChat] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignAction, setCampaignAction] = useState<
    "invite" | "contact" | null
  >(null);

  const hasContact =
    prospect.email || prospect.phone || prospect.website || prospect.linkedin;
  const hasLinkedin = !!prospect.linkedin?.trim();
  const profilePictureUrl =
    (prospect.enrichment_metadata as { profile_picture_url?: string } | null)
      ?.profile_picture_url ?? null;

  const invalidateProspect = () => {
    queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
    queryClient.invalidateQueries({ queryKey: ["prospect-linked-chat", prospect.id] });
    queryClient.invalidateQueries({ queryKey: ["prospects"] });
  };

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
      toast.success("Invitation envoyée");
      invalidateProspect();
    } catch {
      toast.error("Erreur lors de l'invitation");
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = () => {
    setCampaignAction("invite");
    setShowCampaignModal(true);
  };

  const openContactModal = () => {
    setCampaignAction("contact");
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
      setCampaignAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Barre d'actions */}
      <div className="flex flex-wrap gap-2">
        {hasLinkedin && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnrich}
              disabled={enriching}
            >
              {enriching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-2">Enrichir</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleInviteDefault}
              disabled={inviting}
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span className="ml-2">Inviter</span>
            </Button>
            <Button variant="outline" size="sm" onClick={openInviteModal}>
              <UserPlus className="h-4 w-4" />
              <span className="ml-2">Inviter avec message</span>
            </Button>
            <Button variant="outline" size="sm" onClick={openContactModal}>
              <MessageSquare className="h-4 w-4" />
              <span className="ml-2">Démarrer conversation</span>
            </Button>
            {!linkedChatId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLinkExistingChat}
                disabled={linkingChat}
              >
                {linkingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                <span className="ml-2">Associer la conversation existante</span>
              </Button>
            )}
          </>
        )}
        {linkedChatId && (
          <Link
            href={`/messagerie?chat=${encodeURIComponent(linkedChatId)}`}
            className="inline-flex items-center gap-2"
          >
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4" />
              <span className="ml-2">Ouvrir la conversation</span>
            </Button>
          </Link>
        )}
        <Link href={`/call-sessions/new?prospects=${prospect.id}`}>
          <Button variant="outline" size="sm">
            <PhoneCall className="h-4 w-4" />
            <span className="ml-2">Démarrer session d&apos;appels</span>
          </Button>
        </Link>
        <Link href="/campaigns">
          <Button variant="outline" size="sm">
            <Megaphone className="h-4 w-4" />
            <span className="ml-2">Voir campagnes</span>
          </Button>
        </Link>
        {hasLinkedin && (
          <a
            href={
              prospect.linkedin!.startsWith("http")
                ? prospect.linkedin!
                : `https://${prospect.linkedin}`
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Linkedin className="h-4 w-4" />
              <span className="ml-2">Profil LinkedIn</span>
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
          </a>
        )}
        <Link href="/crm">
          <Button variant="outline" size="sm">
            <LayoutGrid className="h-4 w-4" />
            <span className="ml-2">CRM</span>
          </Button>
        </Link>
      </div>

      <CampaignModal
        open={showCampaignModal}
        onOpenChange={handleCampaignModalClose}
        action={campaignAction}
        prospects={[prospect]}
        onSuccess={() => {
          setShowCampaignModal(false);
          setCampaignAction(null);
          invalidateProspect();
        }}
      />

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt=""
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">
                {prospect.full_name ?? "Sans nom"}
              </CardTitle>
              {prospect.job_title && (
                <p className="mt-1 text-muted-foreground">
                  {prospect.job_title}
                </p>
              )}
              {prospect.company && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {prospect.company}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contact */}
      {hasContact && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations de contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prospect.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${prospect.email}`}
                  className="text-primary hover:underline"
                >
                  {prospect.email}
                </a>
              </div>
            )}
            {prospect.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`tel:${prospect.phone}`}
                  className="text-primary hover:underline"
                >
                  {prospect.phone}
                </a>
              </div>
            )}
            {prospect.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={
                    prospect.website.startsWith("http")
                      ? prospect.website
                      : `https://${prospect.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {prospect.website}
                </a>
              </div>
            )}
            {prospect.linkedin && (
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={
                    prospect.linkedin.startsWith("http")
                      ? prospect.linkedin
                      : `https://${prospect.linkedin}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Profil LinkedIn
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Context */}
      {(prospect.industry ||
        prospect.employees ||
        prospect.location ||
        prospect.budget) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {prospect.industry && (
              <p>
                <span className="font-medium">Industrie :</span>{" "}
                {prospect.industry}
              </p>
            )}
            {prospect.employees && (
              <p>
                <span className="font-medium">Taille :</span>{" "}
                {prospect.employees}
              </p>
            )}
            {prospect.location && (
              <p>
                <span className="font-medium">Localisation :</span>{" "}
                {prospect.location}
              </p>
            )}
            {prospect.budget && (
              <p>
                <span className="font-medium">Budget :</span> {prospect.budget}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pipeline & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline et notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prospect.status && (
            <p>
              <span className="font-medium">Statut :</span>{" "}
              <span className="capitalize">{prospect.status}</span>
            </p>
          )}
          {prospect.notes && (
            <div>
              <span className="font-medium">Notes :</span>
              <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {prospect.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métadonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {prospect.source && <p>Source : {prospect.source}</p>}
          {prospect.created_at && (
            <p>Créé le {formatDate(prospect.created_at)}</p>
          )}
          {prospect.enriched_at && (
            <p>Enrichi le {formatDate(prospect.enriched_at)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
