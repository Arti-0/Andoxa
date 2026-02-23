"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  MessageSquare,
  Phone,
  Loader2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace";

interface Campaign {
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
  sent_at: string | null;
}

/**
 * Campaigns Page
 * Gestion des campagnes – statut et flux vers Messagerie
 */
export default function CampaignsPage() {
  const { workspaceId } = useWorkspace();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/campaigns?page=1&pageSize=50", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as { items: Campaign[]; total: number };
    },
    enabled: !!workspaceId,
  });

  const campaigns = data?.items ?? [];

  const statusLabel = (s: string | null) => {
    switch (s) {
      case "draft":
        return "Brouillon";
      case "scheduled":
        return "Programmée";
      case "sending":
        return "En cours";
      case "sent":
        return "Envoyée";
      default:
        return s ?? "—";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campagnes</h1>
          <p className="text-muted-foreground">
            Gérez vos campagnes et suivez leur statut
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/messagerie"
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            <MessageSquare className="h-4 w-4" />
            Démarrer conversation
          </Link>
          <button
            type="button"
            onClick={() => router.push("/call-sessions/new")}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            <Phone className="h-4 w-4" />
            Démarrer session d&apos;appels
          </button>
          <Link
            href="/crm"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nouvelle campagne
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Megaphone className="mx-auto h-10 w-10 opacity-50" />
            <p className="mt-2 text-sm">Aucune campagne</p>
            <p className="mt-1 text-xs">
              Créez une campagne depuis le CRM en sélectionnant des prospects
            </p>
            <Link
              href="/crm"
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Aller au CRM
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabel(c.status)}
                    {c.sent_at && (
                      <>
                        {" · "}
                        Envoyée le{" "}
                        {new Date(c.sent_at).toLocaleDateString("fr-FR")}
                      </>
                    )}
                  </p>
                </div>
                <Link
                  href={`/crm?campaign=${c.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Voir
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
