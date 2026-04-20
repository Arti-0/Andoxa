"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  RefreshCw,
  FileText,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { CampaignJobType } from "@/lib/campaigns/types";
import { campaignLabel, configFromJobType } from "@/lib/campaigns/types";

interface JobProspect {
  id: string;
  prospect_id: string;
  prospect_name?: string;
  status: string;
  error: string | null;
  processed_at: string | null;
}

interface CampaignJob {
  id: string;
  type: CampaignJobType;
  status: string;
  total_count: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  batch_size: number;
  delay_ms: number;
  message_template: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  prospects: JobProspect[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Brouillon", color: "text-zinc-500", icon: FileText },
  pending: { label: "En attente", color: "text-muted-foreground", icon: Clock },
  running: { label: "En cours", color: "text-blue-600", icon: RefreshCw },
  paused: { label: "En pause", color: "text-amber-600", icon: Pause },
  completed: { label: "Terminé", color: "text-green-600", icon: CheckCircle2 },
  failed: { label: "Échoué", color: "text-red-600", icon: AlertCircle },
};

const PROSPECT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-muted text-muted-foreground" },
  processing: { label: "En cours", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  success: { label: "Envoyé", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  error: { label: "Erreur", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  skipped: { label: "Ignoré", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ["campaign-job", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/jobs/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as CampaignJob;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? 5000 : false;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/campaigns/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaign-job", id] });
      router.refresh();
    },
    onError: () => toast.error("Échec de la mise à jour du statut"),
  });

  const nameMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/campaigns/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["campaign-job", id] }),
    onError: () => toast.error("Impossible de renommer la campagne"),
  });

  const commitNameEdit = () => {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (!trimmed) return;
    const current = (job?.metadata?.name as string | undefined) ?? "";
    if (trimmed === current) return;
    nameMutation.mutate(trimmed);
  };

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/jobs/${id}/process`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return json.data ?? json;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["campaign-job", id] });
      router.refresh();
      if (data.rateLimited) {
        toast.warning(
          "Limite LinkedIn atteinte (429). Les prospects restants restent en attente — réessayez plus tard ou laissez le traitement automatique reprendre."
        );
      }
      if (data.remaining) {
        toast.info(
          `Étape traitée : ${data.success} succès, ${data.errors} erreurs. Il reste des destinataires.`
        );
      } else {
        toast.success("Campagne terminée !");
      }
    },
    onError: () => toast.error("Erreur lors du traitement"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Campagne introuvable</p>
      </div>
    );
  }

  const progress = job.total_count > 0 ? Math.round((job.processed_count / job.total_count) * 100) : 0;
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;

  const handleLaunchDraft = async () => {
    const res = await fetch(`/api/campaigns/jobs/${id}/launch`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j?.error?.message ?? "Impossible de lancer la campagne");
      return;
    }
    toast.success("Campagne lancée !");
    void queryClient.invalidateQueries({ queryKey: ["campaign-job", id] });
    router.refresh();
  };

  const handleStartOrResume = () => {
    void (async () => {
      try {
        await statusMutation.mutateAsync("running");
        await processMutation.mutateAsync();
      } catch {
        /* toasts déjà gérés par les mutations */
      }
    })();
  };

  const batchSize = job.batch_size || 10;
  const prospects = job.prospects ?? [];
  const batches = Array.from(
    { length: Math.ceil(prospects.length / batchSize) },
    (_, i) => {
      const start = i * batchSize;
      const batchProspects = prospects.slice(start, start + batchSize);
      const success = batchProspects.filter((p) => p.status === "success").length;
      const error = batchProspects.filter((p) => p.status === "error").length;
      const pending = batchProspects.filter((p) => p.status === "pending").length;
      const skipped = batchProspects.filter((p) => p.status === "skipped").length;
      const done = pending === 0;
      return {
        index: i + 1,
        total: batchProspects.length,
        success,
        error,
        pending,
        skipped,
        done,
        prospects: batchProspects,
      };
    }
  );

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="rounded p-1 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNameEdit();
                  if (e.key === "Escape") setEditingName(false);
                }}
                onBlur={commitNameEdit}
                className="text-xl font-bold rounded border bg-background px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); commitNameEdit(); }} className="text-green-600 hover:text-green-700">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setEditingName(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {(job.metadata?.name as string | undefined) ?? campaignLabel(configFromJobType(job.type))}
              </h1>
              <button
                type="button"
                onClick={() => { setNameDraft((job.metadata?.name as string | undefined) ?? ""); setEditingName(true); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                aria-label="Renommer la campagne"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Créée le{" "}
            {new Date(job.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 font-medium ${cfg.color}`}>
          <Icon className="h-4 w-4" />
          {cfg.label}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ce qui est envoyé</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <span className="text-muted-foreground">À qui : </span>
              <span className="font-medium">{job.total_count} prospect(s) ciblé(s)</span>
            </li>
            <li>
              <span className="text-muted-foreground">Type d’action : </span>
              <span className="font-medium">
                {job.type === "invite"
                  ? "Demande de connexion LinkedIn (sans note)"
                  : job.type === "invite_with_note"
                    ? "Demande de connexion LinkedIn avec note personnalisée"
                    : job.type === "contact"
                      ? "Premier message dans une conversation LinkedIn"
                      : "Message WhatsApp direct"}
              </span>
            </li>
            <li>
              <span className="text-muted-foreground">Canal : </span>
              <span className="font-medium">
                {job.type === "whatsapp"
                  ? "WhatsApp (compte relié à Andoxa)"
                  : "LinkedIn (compte relié à Andoxa)"}
              </span>
            </li>
            <li>
              <span className="text-muted-foreground">Rythme : </span>
              <span className="font-medium">
                {job.status === "draft"
                  ? "Brouillon — l’envoi démarre après lancement"
                  : job.total_count > batchSize
                    ? "Envoi échelonné"
                    : "Envoi en une fois"}
              </span>
            </li>
          </ul>
          {job.message_template?.trim() ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Texte (avec variables)
              </p>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-xs">
                {job.message_template}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun modèle de texte enregistré pour ce job.</p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-1 text-2xl font-bold">{job.total_count}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" />
            <p className="mt-1 text-2xl font-bold">{job.success_count}</p>
            <p className="text-xs text-muted-foreground">Envoyés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertCircle className="mx-auto h-5 w-5 text-red-500" />
            <p className="mt-1 text-2xl font-bold">{job.error_count}</p>
            <p className="text-xs text-muted-foreground">Erreurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-1 text-2xl font-bold">{job.total_count - job.processed_count}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progression</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Envoi découpé en étapes (affichage sans détail technique) */}
      {batches.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Avancement par étape</p>
          <div className="flex flex-wrap gap-2">
            {batches.map((b) => (
              <div
                key={b.index}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  b.done
                    ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30"
                    : "border-muted bg-muted/30"
                }`}
              >
                <span className="font-medium">Étape {b.index} :</span>{" "}
                {b.done ? (
                  <span>
                    {b.success} envoyés
                    {(b.error > 0 || b.skipped > 0) && (
                      <>
                        {" "}
                        {b.error > 0 && <span className="text-red-600">{b.error} erreurs</span>}
                        {b.error > 0 && b.skipped > 0 && ", "}
                        {b.skipped > 0 && <span className="text-amber-600">{b.skipped} ignorés</span>}
                      </>
                    )}
                  </span>
                ) : (
                  <span>
                    {b.success + b.error + b.skipped}/{b.total} traités
                    {b.pending > 0 && (
                      <span className="text-muted-foreground"> ({b.pending} en attente)</span>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {job.status === "draft" && (
          <Button type="button" onClick={() => void handleLaunchDraft()}>
            <Play className="mr-2 h-4 w-4" />
            Lancer la campagne
          </Button>
        )}
        {(job.status === "pending" || job.status === "paused") && (
          <Button
            type="button"
            onClick={handleStartOrResume}
            disabled={statusMutation.isPending || processMutation.isPending}
          >
            <Play className="mr-2 h-4 w-4" />
            {job.status === "pending" ? "Démarrer" : "Reprendre"}
          </Button>
        )}
        {job.status === "running" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => statusMutation.mutate("paused")}
            disabled={statusMutation.isPending}
          >
            <Pause className="mr-2 h-4 w-4" />
            Mettre en pause
          </Button>
        )}
        {["pending", "running", "paused"].includes(job.status) && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => statusMutation.mutate("failed")}
            disabled={statusMutation.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Annuler
          </Button>
        )}
        {job.status === "running" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
          >
            {processMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Traiter l’étape suivante
          </Button>
        )}
      </div>

      {/* Prospect list */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3">
          <h3 className="text-base font-semibold">Prospects ({job.prospects?.length ?? 0})</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                {batches.length > 1 && (
                  <th className="px-4 py-3 text-left font-medium w-16">Étape</th>
                )}
                <th className="px-4 py-3 text-left font-medium">Prospect</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Erreur</th>
                <th className="px-4 py-3 text-left font-medium">Traité</th>
              </tr>
            </thead>
            <tbody>
              {(job.prospects ?? []).map((p, idx) => {
                const batchNum = batches.length > 1 ? Math.floor(idx / batchSize) + 1 : null;
                const pCfg = PROSPECT_STATUS[p.status] ?? PROSPECT_STATUS.pending;
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                    {batchNum !== null && (
                      <td className="px-4 py-3 text-muted-foreground text-xs font-medium">
                        {batchNum}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link href={`/prospect/${p.prospect_id}`} className="text-sm font-medium hover:underline">
                        {p.prospect_name ?? p.prospect_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pCfg.color}`}>
                        {pCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600">{p.error ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.processed_at
                        ? new Date(p.processed_at).toLocaleTimeString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
