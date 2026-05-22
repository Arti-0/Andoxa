"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CampaignJobStatus } from "@/lib/campaigns/types";
import { computePerf, formatRelativeDate } from "../data";
import {
  Avatar,
  ChannelPill,
  ProgressBar,
  StatusBadge,
  TypeBadge,
} from "../primitives";
import {
  useCampaignJobDetail,
  useCancelJob,
  useDuplicateJob,
  useLaunchJob,
  useOrgMembersForCampaigns,
  useUpdateJobStatus,
} from "../queries";

function formatProspectProcessedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default function Campaign2DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const members = useOrgMembersForCampaigns();
  const detail = useCampaignJobDetail(id);
  const updateStatus = useUpdateJobStatus();
  const launchJob = useLaunchJob();
  const duplicateJob = useDuplicateJob();
  const cancelJob = useCancelJob();
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const creatorChip = useMemo(() => {
    const cId = detail.data?.campaign.creator;
    if (!cId) return undefined;
    return members.data?.find((m) => m.id === cId);
  }, [detail.data?.campaign.creator, members.data]);

  const perf = detail.data?.campaign ? computePerf(detail.data.campaign) : null;
  const busy =
    duplicateJob.isPending ||
    updateStatus.isPending ||
    launchJob.isPending ||
    cancelJob.isPending;

  if (detail.isPending || (members.isLoading && !detail.data)) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-5 bg-[#FAFAFB] p-6 dark:bg-background lg:p-8">
        <SkeletonLine className="h-4 w-40" />
        <SkeletonLine className="h-9 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonLine className="h-28" />
          <SkeletonLine className="h-28" />
          <SkeletonLine className="h-28" />
        </div>
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="flex flex-col gap-3 p-8">
        <BackLink />
        <p className="text-muted-foreground">
          Impossible de charger cette campagne.{" "}
          <button
            type="button"
            className="text-primary underline underline-offset-2"
            onClick={() => void detail.refetch()}
          >
            Réessayer
          </button>
        </p>
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="flex flex-col gap-3 p-8">
        <BackLink />
        <p className="text-muted-foreground">Campagne introuvable.</p>
      </div>
    );
  }

  const { campaign, prospects, apiStatus } = detail.data;

  const canPauseResume =
    apiStatus === "running" || apiStatus === "paused" || apiStatus === "pending";
  const showLaunch = apiStatus === "draft";

  const onPauseResume = () => {
    if (busy) return;
    if (apiStatus === "paused") {
      updateStatus.mutate(
        { id, status: "running" },
        { onSuccess: () => toast.success(`« ${campaign.name} » reprise`) },
      );
      return;
    }
    if (apiStatus === "running" || apiStatus === "pending") {
      updateStatus.mutate(
        { id, status: "paused" },
        { onSuccess: () => toast.success(`« ${campaign.name} » en pause`) },
      );
    }
  };

  const onLaunch = () => {
    if (busy) return;
    launchJob.mutate(id, {
      onSuccess: () => toast.success(`« ${campaign.name} » lancée`),
    });
  };

  const onDuplicate = async () => {
    if (busy) return;
    try {
      const raw = await duplicateJob.mutateAsync(id);
      const nid = (raw as { data?: { id?: string } })?.data?.id;
      toast.success(`« ${campaign.name} » dupliquée`);
      if (nid) router.push(`/campaigns/${nid}`);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 bg-[#FAFAFB] p-6 dark:bg-background lg:p-8">
      <div>
        <BackLink />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <ChannelPill channel={campaign.channel} />
            <TypeBadge type={campaign.type} />
            <span className="text-[12.5px] text-muted-foreground">
              · {activityLabel(apiStatus)} {formatRelativeDate(campaign.launchedAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {showLaunch && (
            <Button variant="default" disabled={busy} onClick={onLaunch}>
              Lancer
            </Button>
          )}
          {canPauseResume && apiStatus !== "paused" && (
            <Button variant="outline" disabled={busy} onClick={onPauseResume}>
              Mettre en pause
            </Button>
          )}
          {canPauseResume && apiStatus === "paused" && (
            <Button variant="outline" disabled={busy} onClick={onPauseResume}>
              Reprendre
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={onDuplicate}>
            Dupliquer
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              setConfirm({
                title: "Supprimer cette campagne ?",
                message: `« ${campaign.name} » sera supprimée selon les règles actuelles de l'espace.`,
                onConfirm: () =>
                  cancelJob.mutate(id, {
                    onSuccess: () => {
                      toast.success(`« ${campaign.name} » supprimée`);
                      router.push("/campaigns");
                    },
                  }),
              })
            }
          >
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Prospects ciblés" value={campaign.total} sub="dans la liste" />
        <Card
          label="Traités"
          value={`${campaign.processed}/${campaign.total}`}
          sub={`${Math.round((campaign.processed / Math.max(1, campaign.total)) * 100)}% complété`}
        />
        <Card
          label="Performance"
          value={perf ? `${perf.rate.toFixed(0)}%` : "—"}
          sub={perf ? perf.label : "en attente"}
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Progression
        </h2>
        <ProgressBar value={campaign.processed} max={Math.max(1, campaign.total)} height={8} />
        <div className="mt-2 flex justify-between text-[12.5px] text-muted-foreground tabular-nums">
          <span>{campaign.processed} traités</span>
          <span>{Math.max(0, campaign.total - campaign.processed)} restants</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Créateur
        </h2>
        <div className="flex items-center gap-3">
          <Avatar creator={creatorChip} size={32} />
          <div>
            <div className="text-[14px] font-semibold">{campaign.creatorName}</div>
            <div className="text-[12px] text-muted-foreground">Auteur de la campagne</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 overflow-x-auto">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Prospects
        </h2>
        {prospects.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Aucun prospect dans cette campagne.</p>
        ) : (
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead>
              <tr className="border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-3 font-semibold">Prospect</th>
                <th className="pb-3 pr-3 font-semibold">Statut</th>
                <th className="pb-3 pr-3 font-semibold">Traitée le</th>
                <th className="pb-3 font-semibold">Erreur</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-3 align-top font-medium">{p.prospect_name}</td>
                  <td className="py-3 pr-3 align-top capitalize text-muted-foreground">{p.status}</td>
                  <td className="py-3 pr-3 align-top tabular-nums text-muted-foreground">
                    {formatProspectProcessedAt(p.processed_at)}
                  </td>
                  <td className="py-3 align-top text-destructive">
                    {p.error ? (
                      <span className="line-clamp-2" title={p.error}>
                        {p.error}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => {
          if (!o) setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        description={confirm?.message ?? ""}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => confirm?.onConfirm()}
      />
    </div>
  );
}

function activityLabel(api: CampaignJobStatus): string {
  switch (api) {
    case "draft":
      return "Créée";
    case "completed":
      return "Terminée";
    case "failed":
      return "Échouée";
    default:
      return "Lancée";
  }
}

function BackLink() {
  return (
    <Link
      href="/campaigns"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Retour aux campagnes
    </Link>
  );
}

function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[12px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}
