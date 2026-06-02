"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CampaignJobStatus } from "@/lib/campaigns/types";
import { formatRelativeDate } from "../data";
import {
  ChannelPill,
  StatusBadge,
  TypeBadge,
} from "../primitives";
import {
  CampaignKpiFunnel,
  CampaignChart,
  CampaignMessageCard,
  CampaignProspectsTable,
  CampaignActivity,
} from "./detail-sections";
import {
  useCampaignJobDetail,
  useCampaignTimeline,
  useCancelJob,
  useDuplicateJob,
  useLaunchJob,
  useOrgMembersForCampaigns,
  useUpdateJobStatus,
} from "../queries";

type CampaignPeriod = "7" | "30" | "90" | "all";
const PERIOD_OPTIONS: { id: CampaignPeriod; label: string }[] = [
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "90", label: "90 jours" },
  { id: "all", label: "Tout" },
];

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

  // Timeline period — same keys as the campaigns-section KPI bar (7/30/90/all).
  const [timelinePeriod, setTimelinePeriod] = useState<CampaignPeriod>("30");
  const apiStatusNow = detail.data?.apiStatus;
  const timelineLive = apiStatusNow === "running" || apiStatusNow === "pending";
  const timeline = useCampaignTimeline(id, timelinePeriod, timelineLive);

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

  // Duplicate = open the creation wizard prefilled (handled on the list page),
  // not a direct row create. We route there with ?duplicate=<id>; the lock /
  // "Dupliqué ✓" state below gives immediate feedback before the nav.
  const [duplicated, setDuplicated] = useState(false);
  const onDuplicate = () => {
    if (busy || duplicated) return;
    setDuplicated(true);
    router.push(`/campaigns?duplicate=${id}`);
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
          <Button
            variant="outline"
            disabled={busy || duplicated}
            onClick={onDuplicate}
          >
            {duplicated ? (
              <>
                <Check className="size-3.5" />
                Dupliqué
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Dupliquer
              </>
            )}
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

      {/* Period selector — scopes the chart + activity feed below. */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setTimelinePeriod(o.id)}
              className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                timelinePeriod === o.id
                  ? "bg-[#E8F0FD] text-[#003EA3]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <CampaignKpiFunnel campaign={campaign} isLive={apiStatus === "running" || apiStatus === "pending"} />

      <CampaignChart
        type={campaign.type}
        series={timeline.data?.series ?? []}
        loading={timeline.isPending}
      />

      <CampaignMessageCard type={campaign.type} template={detail.data.messageTemplate} />

      {prospects.length === 0 ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Prospects
          </h2>
          <p className="text-[13px] text-muted-foreground">Aucun prospect dans cette campagne.</p>
        </div>
      ) : (
        <CampaignProspectsTable rows={prospects} campaignName={campaign.name} />
      )}

      <CampaignActivity
        events={timeline.data?.events ?? []}
        loading={timeline.isPending}
      />

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

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}
