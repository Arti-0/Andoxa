"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Loader2, Phone, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace";
import { EmptyState } from "@/components/design";
import type { Prospect } from "@/lib/types/prospects";
import {
  CrmTable,
  type BddRow,
  type FilterState,
  type ListesFilterState,
} from "@/components/crm/crm-table";
import { CampaignModal } from "@/components/campaigns/campaign-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CampaignJob {
  id: string;
  type: "invite" | "contact";
  status: string;
  total_count: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  created_at: string;
  message_template?: string | null;
  batch_size?: number | null;
  delay_ms?: number | null;
}

interface CallSession {
  id: string;
  title: string | null;
  status: string;
  total_duration_s: number;
  created_at: string;
  ended_at: string | null;
}

type CampaignRowType = "campaign" | "call_session";

interface UnifiedRow {
  type: CampaignRowType;
  id: string;
  date: string;
  status: string;
  prospectCount: number;
  label: string;
  href: string;
  messageSnippet?: string | null;
  sendMode?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  running: "En cours",
  paused: "Pause",
  completed: "Terminée",
  failed: "Échouée",
  active: "En cours",
};

function formatMessageSnippet(s: string | null | undefined, max = 72): string {
  if (!s?.trim()) return "—";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function formatCampaignSendMode(job: {
  total_count: number;
  batch_size?: number | null;
  delay_ms?: number | null;
}): string {
  const batch = job.batch_size ?? 10;
  const delayMin = Math.round((job.delay_ms ?? 120000) / 60000);
  if (job.total_count > batch) {
    return `Lots de ${batch} · ${delayMin} min entre lots`;
  }
  return "Envoi direct";
}

export default function CampaignsPage() {
  const { workspaceId } = useWorkspace();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "campaigns" | "sessions">("all");

  const defaultProspectFilters: FilterState = {
    status: [],
    source: [],
    tags: [],
    assignedTo: null,
    dateRange: null,
    search: "",
    bddId: null,
  };
  const defaultListesFilters: ListesFilterState = {
    source: [],
    proprietaire: null,
    dateFrom: null,
    dateTo: null,
  };

  type ListPickerMode = "campaign" | "call_session";
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [listPickerMode, setListPickerMode] = useState<ListPickerMode>("campaign");
  const [selectedListes, setSelectedListes] = useState<BddRow[]>([]);
  const [campaignAction, setCampaignAction] = useState<"invite" | "contact" | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignProspects, setCampaignProspects] = useState<Prospect[]>([]);
  const [campaignListName, setCampaignListName] = useState<string | null>(null);
  const [preparingCampaign, setPreparingCampaign] = useState(false);
  const [preparingCallSession, setPreparingCallSession] = useState(false);

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["campaign-jobs", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/jobs", { credentials: "include" });
      if (!res.ok) return [] as CampaignJob[];
      const json = await res.json();
      const raw = json.data?.items ?? json.data ?? json.items ?? [];
      return (Array.isArray(raw) ? raw : []) as CampaignJob[];
    },
    enabled: !!workspaceId,
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["call-sessions", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/call-sessions?pageSize=50", { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const d = json.data ?? json;
      return d as { items: CallSession[]; total: number };
    },
    enabled: !!workspaceId,
  });

  const jobs = Array.isArray(jobsData) ? jobsData : [];
  const sessions = sessionsData?.items ?? [];
  const isLoading = jobsLoading || sessionsLoading;

  const rows = useMemo((): UnifiedRow[] => {
    const list: UnifiedRow[] = [];
    for (const j of jobs) {
      list.push({
        type: "campaign",
        id: j.id,
        date: j.created_at,
        status: j.status,
        prospectCount: j.total_count,
        label: j.type === "invite" ? "Invitation LinkedIn" : "Message LinkedIn",
        href: `/campaigns/${j.id}`,
        messageSnippet: formatMessageSnippet(j.message_template ?? null),
        sendMode: formatCampaignSendMode(j),
      });
    }
    for (const s of sessions) {
      list.push({
        type: "call_session",
        id: s.id,
        date: s.created_at,
        status: s.status,
        prospectCount: 0, // API may not return count; we could add it later
        label: s.title ?? "Session d'appels",
        href: `/call-sessions/${s.id}`,
      });
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [jobs, sessions]);

  const { data: membersData } = useQuery({
    queryKey: ["organization-members", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/organization/members", { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as { items: { id: string; name: string; avatar_url: string | null }[] };
    },
    enabled: !!workspaceId,
  });

  const memberNames = useMemo(
    () => new Map((membersData?.items ?? []).map((m) => [m.id, m.name])),
    [membersData]
  );
  const memberAvatars = useMemo(
    () => new Map((membersData?.items ?? []).map((m) => [m.id, m.avatar_url ?? null])),
    [membersData]
  );

  const fetchProspectsForBdd = useCallback(async (bddId: string) => {
    const pageSize = 100;
    let page = 1;
    const acc: Prospect[] = [];
    const MAX_TOTAL = 2000;
    while (true) {
      const res = await fetch(
        `/api/prospects?page=${page}&pageSize=${pageSize}&bdd_id=${encodeURIComponent(bddId)}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const json = await res.json();
      const data = json?.data ?? json;
      const items = (data?.items ?? []) as Prospect[];
      acc.push(...items);

      const hasMore = Boolean(data?.hasMore);
      if (!hasMore || items.length === 0) break;
      if (acc.length >= MAX_TOTAL) {
        acc.splice(MAX_TOTAL);
        break;
      }
      page++;
    }
    return acc;
  }, []);

  const startCampaignFromSelection = useCallback(
    async (action: "invite" | "contact") => {
      if (selectedListes.length === 0) {
        toast.error("Sélectionnez une liste d&apos;abord.");
        return;
      }

      // Per design: on démarre à partir d&apos;une seule liste (la première sélectionnée).
      const bddId = selectedListes[0]?.id;
      if (!bddId) return;

      setPreparingCampaign(true);
      try {
        const prospects = await fetchProspectsForBdd(bddId);
        if (prospects.length === 0) {
          toast.error("Aucun prospect trouvé pour cette liste.");
          return;
        }
        setCampaignProspects(prospects);
        setCampaignListName(selectedListes[0]?.name ?? null);
        setCampaignAction(action);
        setShowCampaignModal(true);
        setListPickerOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de préparer la campagne");
      } finally {
        setPreparingCampaign(false);
      }
    },
    [fetchProspectsForBdd, selectedListes]
  );

  const startCallSessionFromSelection = useCallback(async () => {
    if (selectedListes.length === 0) {
      toast.error("Sélectionnez une liste d&apos;abord.");
      return;
    }

    const bddIds = selectedListes.map((l) => l.id);
    setPreparingCallSession(true);
    try {
      const res = await fetch("/api/call-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bdd_ids: bddIds }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const err = json?.error;
        const details = err?.details as { errors?: Record<string, string> } | undefined;
        const msg =
          details?.errors?.prospect_ids ?? err?.message ?? "Impossible de créer la session";
        toast.error(msg);
        return;
      }

      const data = await res.json();
      const session = data?.data ?? data;
      if (session?.id) {
        setListPickerOpen(false);
        router.push(`/call-sessions/${session.id}`);
      } else {
        toast.error("Réponse invalide du serveur");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau lors de la création de la session");
    } finally {
      setPreparingCallSession(false);
    }
  }, [router, selectedListes]);

  const filteredRows = useMemo(() => {
    if (filter === "campaigns") return rows.filter((r) => r.type === "campaign");
    if (filter === "sessions") return rows.filter((r) => r.type === "call_session");
    return rows;
  }, [rows, filter]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setFilter("campaigns")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "campaigns" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Campagnes
          </button>
          <button
            type="button"
            onClick={() => setFilter("sessions")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "sessions" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            Sessions d&apos;appels
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="inline-flex items-center gap-2 rounded-lg border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            onClick={() => {
              setListPickerMode("campaign");
              setListPickerOpen(true);
            }}
          >
            <Megaphone className="h-4 w-4" />
            Démarrer une campagne
          </Button>

          <Button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setListPickerMode("call_session");
              setListPickerOpen(true);
            }}
          >
            <Phone className="h-4 w-4" />
            Session d&apos;appels
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement...
        </div>
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={filter === "sessions" ? Phone : Megaphone}
          title={filter === "all" ? "Aucune campagne ni session" : filter === "campaigns" ? "Aucune campagne" : "Aucune session d'appels"}
          description={
            filter === "sessions"
              ? "Sélectionnez des prospects avec un numéro de téléphone dans le CRM pour démarrer une session."
              : "Vos campagnes LinkedIn et sessions d'appels apparaîtront ici."
          }
          action={
            filter === "sessions"
              ? {
                  label: "Démarrer une session",
                  onClick: () => {
                    setListPickerMode("call_session");
                    setListPickerOpen(true);
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b-2 border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium min-w-[140px]">Message (extrait)</th>
                <th className="px-4 py-3 text-left font-medium">Canal / envoi</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Cibles</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={`${row.type}-${row.id}`}
                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(row.href)}
                >
                  <td className="px-4 py-3">
                    {row.type === "campaign" ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Megaphone className="h-3.5 w-3.5" />
                        Campagne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        Session
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {row.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[220px] text-muted-foreground">
                    <span className="line-clamp-2 text-xs" title={row.type === "campaign" ? row.messageSnippet ?? "" : ""}>
                      {row.type === "campaign" ? row.messageSnippet : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.type === "campaign" ? (
                      <>
                        <span className="font-medium text-foreground">LinkedIn</span>
                        <span className="mx-1">·</span>
                        {row.sendMode}
                      </>
                    ) : (
                      <span className="font-medium text-foreground">Téléphone</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "completed" || row.status === "Terminée"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : row.status === "active" || row.status === "running"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : row.status === "failed"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {row.type === "campaign" ? row.prospectCount : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={listPickerOpen} onOpenChange={setListPickerOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {listPickerMode === "call_session"
                ? "Sélectionner une liste pour une session"
                : "Sélectionner une liste"}
            </DialogTitle>
            <DialogDescription>
              {listPickerMode === "call_session"
                ? "Choisissez une liste. Une session d'appels sera créée pour les prospects de la liste avec un numéro."
                : "Choisissez une liste dans votre CRM. Ensuite, vous pourrez envoyer une invitation ou contacter vos prospects."}
            </DialogDescription>
          </DialogHeader>

          <div className="h-[70vh] w-full">
            <CrmTable
              mode="listes"
              workspaceId={workspaceId}
              prospectFilters={defaultProspectFilters}
              listesFilters={defaultListesFilters}
              onSelectList={() => {}}
              memberNames={memberNames}
              memberAvatars={memberAvatars}
              onListesSelectionChange={(listes) => setSelectedListes(listes.slice(0, 1))}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t">
            <div className="mr-auto text-xs text-muted-foreground">
              {selectedListes.length > 0
                ? `${selectedListes.length} liste(s) sélectionnée(s)`
                : "Aucune liste sélectionnée"}
            </div>

            {listPickerMode === "campaign" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={preparingCampaign || selectedListes.length === 0}
                  onClick={() => void startCampaignFromSelection("contact")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact LinkedIn
                </Button>
                <Button
                  type="button"
                  disabled={preparingCampaign || selectedListes.length === 0}
                  onClick={() => void startCampaignFromSelection("invite")}
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  Invitation LinkedIn
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={preparingCallSession || selectedListes.length === 0}
                onClick={() => void startCallSessionFromSelection()}
              >
                <Phone className="h-4 w-4 mr-2" />
                {preparingCallSession ? "Création…" : "Démarrer l'appel"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CampaignModal
        open={showCampaignModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCampaignModal(false);
            setCampaignAction(null);
            setCampaignProspects([]);
            setCampaignListName(null);
          }
        }}
        action={campaignAction}
        prospects={campaignProspects}
        listName={campaignListName}
        onSuccess={() => {
          setShowCampaignModal(false);
          setCampaignAction(null);
          setCampaignProspects([]);
          setCampaignListName(null);
        }}
      />
    </div>
  );
}
