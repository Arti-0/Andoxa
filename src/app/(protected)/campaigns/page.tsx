"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Megaphone,
  Loader2,
  Link2,
  CheckCircle,
  UserPlus,
  MessageSquare,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace";
import { CampaignModal } from "@/components/crm/campaign-modal";
import type { Prospect } from "@/lib/types/prospects";

interface UnipileMeResponse {
  connected: boolean;
  account_id?: string;
}

interface ProspectsApiResponse {
  items: Prospect[];
  total: number;
}

/**
 * Page Campagnes LinkedIn – Hub Unipile (invitations et premiers messages)
 * Sélection des prospects et lancement des campagnes directement depuis cette page.
 */
export default function CampaignsPage() {
  const { workspaceId } = useWorkspace();
  const [unipileConnected, setUnipileConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignAction, setCampaignAction] = useState<"invite" | "contact" | null>(null);

  const fetchUnipileMe = useCallback(async () => {
    try {
      const res = await fetch("/api/unipile/me", { credentials: "include" });
      const data = (await res.json())?.data ?? (await res.json());
      const json = data as UnipileMeResponse;
      setUnipileConnected(json?.connected ?? false);
    } catch {
      setUnipileConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchUnipileMe();
  }, [fetchUnipileMe]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: prospectsData, isLoading: prospectsLoading } = useQuery({
    queryKey: ["campaign-prospects", workspaceId, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      const res = await fetch(`/api/prospects?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as ProspectsApiResponse;
    },
    enabled: !!workspaceId && unipileConnected === true,
  });

  const prospects = prospectsData?.items ?? [];
  const selectedProspects = prospects.filter((p) => selectedIds.has(p.id));
  const prospectsWithLinkedin = selectedProspects.filter((p) => p.linkedin?.trim());
  const hasLinkedinSelection = prospectsWithLinkedin.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    }
  };

  const handleConnectUnipile = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/unipile/connect", { method: "POST" });
      const json = await res.json();
      const data = json?.data ?? json;
      const url = (data as { url?: string })?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      const msg =
        (json?.error?.message as string) ?? "Erreur lors de la connexion";
      toast.error(msg);
    } catch {
      toast.error("Impossible de lancer la connexion Unipile");
    } finally {
      setConnecting(false);
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

  const handleCampaignSuccess = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Campagnes LinkedIn</h1>
        <p className="text-muted-foreground">
          Prospection via invitations et premiers messages
        </p>
      </div>

      {unipileConnected === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Vérification de la connexion...
        </div>
      ) : !unipileConnected ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              <CardTitle>Connexion requise</CardTitle>
            </div>
            <CardDescription>
              Connectez votre compte LinkedIn pour lancer des campagnes
              d&apos;invitation et de prospection.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              onClick={handleConnectUnipile}
              disabled={connecting}
              className="gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Connecter mon LinkedIn à Unipile
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() => fetchUnipileMe()}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Réessayer la vérification
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Compte LinkedIn connecté</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="default"
                className="gap-2"
                disabled={!hasLinkedinSelection}
                onClick={openInviteModal}
              >
                <UserPlus className="h-4 w-4" />
                Inviter ({prospectsWithLinkedin.length})
              </Button>
              <Button
                variant="default"
                className="gap-2"
                disabled={!hasLinkedinSelection}
                onClick={openContactModal}
              >
                <MessageSquare className="h-4 w-4" />
                Contacter ({prospectsWithLinkedin.length})
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/messagerie" className="gap-1">
                  Messagerie
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {!hasLinkedinSelection && selectedProspects.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Les prospects sélectionnés sans profil LinkedIn ne recevront pas
              d&apos;invitation. Seuls ceux avec une URL LinkedIn seront inclus.
            </p>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Sélectionner des prospects</CardTitle>
                  <CardDescription>
                    Cochez les prospects à qui envoyer une invitation ou un
                    message. Un profil LinkedIn est requis.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {prospectsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Chargement des prospects...
                </div>
              ) : prospects.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Megaphone className="mx-auto h-10 w-10 opacity-50" />
                  <p className="mt-2">Aucun prospect trouvé</p>
                  <p className="mt-1 text-xs">
                    Créez des prospects depuis le CRM pour lancer des campagnes
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-4">
                    <Link href="/crm">
                      Aller au CRM
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-muted/50">
                        <tr>
                          <th className="w-12 px-4 py-2 text-left">
                            <Checkbox
                              checked={
                                prospects.length > 0 &&
                                selectedIds.size === prospects.length
                              }
                              onCheckedChange={toggleSelectAll}
                              aria-label="Tout sélectionner"
                            />
                          </th>
                          <th className="px-4 py-2 text-left font-medium">Nom</th>
                          <th className="px-4 py-2 text-left font-medium">Entreprise</th>
                          <th className="px-4 py-2 text-left font-medium">LinkedIn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prospects.map((p) => (
                          <tr
                            key={p.id}
                            className="border-t hover:bg-muted/30"
                          >
                            <td className="px-4 py-2">
                              <Checkbox
                                checked={selectedIds.has(p.id)}
                                onCheckedChange={() => toggleSelect(p.id)}
                                aria-label={`Sélectionner ${p.full_name ?? p.id}`}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <span className="font-medium">
                                {p.full_name ?? "—"}
                              </span>
                              {p.job_title && (
                                <p className="text-xs text-muted-foreground">
                                  {p.job_title}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {p.company ?? "—"}
                            </td>
                            <td className="px-4 py-2">
                              {p.linkedin?.trim() ? (
                                <span className="text-green-600 dark:text-green-500">
                                  OK
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                    {prospectsData?.total ?? 0} prospect
                    {(prospectsData?.total ?? 0) > 1 ? "s" : ""} au total
                    {prospectsData?.total && prospectsData.total > 100 && (
                      <span>
                        {" "}
                        (100 affichés, utilisez la recherche pour filtrer)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <CampaignModal
        open={showCampaignModal}
        onOpenChange={(open) => {
          setShowCampaignModal(open);
          if (!open) setCampaignAction(null);
        }}
        action={campaignAction}
        prospects={prospectsWithLinkedin}
        onSuccess={handleCampaignSuccess}
      />
    </div>
  );
}
