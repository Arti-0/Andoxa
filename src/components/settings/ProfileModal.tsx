"use client";

import { useState, useEffect } from "react";
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
import { Loader2, ExternalLink, Linkedin, Sparkles } from "lucide-react";

interface LinkedinProfileData {
  linkedin_url: string | null;
  full_name: string | null;
  avatar_url: string | null;
  enriched: {
    first_name?: string | null;
    last_name?: string | null;
    headline?: string | null;
    location?: string | null;
    profile_picture_url?: string | null;
    public_identifier?: string | null;
    summary?: string | null;
  } | null;
}

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string | null;
  email: string | null;
  linkedinUrl?: string | null;
  onSuccess?: () => void;
}

export function ProfileModal({
  open,
  onOpenChange,
  fullName,
  email,
  linkedinUrl,
  onSuccess,
}: ProfileModalProps) {
  const [name, setName] = useState(fullName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedinData, setLinkedinData] = useState<LinkedinProfileData | null>(
    null
  );
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (open) {
      setName(fullName ?? "");
      setError(null);
      setLinkedinLoading(true);
      fetch("/api/profile/linkedin", { credentials: "include" })
        .then((res) => res.json())
        .then((json) => {
          const data = json?.data ?? json;
          setLinkedinData(data as LinkedinProfileData);
        })
        .catch(() => setLinkedinData(null))
        .finally(() => setLinkedinLoading(false));
    }
  }, [open, fullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ full_name: name.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/linkedin/enrich", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message ?? "Erreur lors de l'enrichissement";
        throw new Error(msg);
      }
      const data = json?.data ?? json;
      const enriched = (data as { enriched?: LinkedinProfileData["enriched"] })
        .enriched;
      const linkedinFromEnrich =
        enriched?.public_identifier
          ? `https://www.linkedin.com/in/${enriched.public_identifier}`
          : null;
      setLinkedinData((prev) => ({
        linkedin_url: linkedinFromEnrich ?? prev?.linkedin_url ?? null,
        enriched: enriched ?? prev?.enriched ?? null,
        full_name: prev?.full_name ?? null,
        avatar_url: prev?.avatar_url ?? null,
      }));
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'enrichissement"
      );
    } finally {
      setEnriching(false);
    }
  };

  const displayName =
    linkedinData?.enriched?.first_name || linkedinData?.enriched?.last_name
      ? `${linkedinData.enriched.first_name ?? ""} ${linkedinData.enriched.last_name ?? ""}`.trim()
      : linkedinData?.full_name ?? fullName ?? null;
  const displayHeadline = linkedinData?.enriched?.headline ?? null;
  const displayAvatar =
    linkedinData?.enriched?.profile_picture_url ??
    linkedinData?.avatar_url ??
    null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email ?? ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  L&apos;email est lié à votre compte et ne peut pas être
                  modifié ici.
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                <Label>Profil LinkedIn</Label>
              </div>
              {linkedinLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement du profil...
                </div>
              ) : linkedinData?.linkedin_url || linkedinData?.enriched ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    {displayAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayAvatar}
                        alt="Photo de profil"
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Linkedin className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {displayName && (
                        <p className="font-medium">{displayName}</p>
                      )}
                      {displayHeadline && (
                        <p className="text-sm text-muted-foreground">
                          {displayHeadline}
                        </p>
                      )}
                      {linkedinData?.linkedin_url && (
                        <a
                          href={
                            linkedinData.linkedin_url.startsWith("http")
                              ? linkedinData.linkedin_url
                              : `https://www.linkedin.com/in/${linkedinData.linkedin_url.replace(/^.*\/in\//i, "").replace(/\/?$/, "")}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Voir mon profil LinkedIn
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 self-start"
                    onClick={handleEnrich}
                    disabled={enriching}
                  >
                    {enriching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Actualiser le profil
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Connectez votre compte LinkedIn (page Installation ou
                  Campagnes) pour afficher votre profil ici.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
