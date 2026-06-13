"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, Check, Copy, MoreVertical, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CampaignJobStatus } from "@/lib/campaigns/types";
import { formatDayMonthYear, formatRelativeDate } from "../data";
import {
  Avatar,
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
  creatorFromCampaign,
  useCampaignJobDetail,
  useCampaignTimeline,
  useCancelJob,
  useDuplicateJob,
  useLaunchJob,
  useOrgMembersForCampaigns,
  useRetryJobErrors,
  useSetJobWeekends,
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
  const retryErrors = useRetryJobErrors();
  const setWeekends = useSetJobWeekends();
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    variant?: "destructive" | "default";
  } | null>(null);

  // Timeline period — same keys as the campaigns-section KPI bar (7/30/90/all).
  const [timelinePeriod, setTimelinePeriod] = useState<CampaignPeriod>("30");
  // Day selected by clicking the chart — filters the prospects table below.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // NOTE: must be declared with the other hooks, BEFORE any early return below —
  // otherwise the loading→loaded transition changes the hook count and React
  // throws "Rendered more hooks than during the previous render" (the crash).
  const [duplicated, setDuplicated] = useState(false);
  const apiStatusNow = detail.data?.apiStatus;
  const timelineLive = apiStatusNow === "running" || apiStatusNow === "pending";
  const timeline = useCampaignTimeline(id, timelinePeriod, timelineLive);

  const busy =
    duplicateJob.isPending ||
    updateStatus.isPending ||
    launchJob.isPending ||
    cancelJob.isPending ||
    retryErrors.isPending;

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
  const isLive = apiStatus === "running" || apiStatus === "pending";

  // Owner chip: prefer the live org-members entry (carries the avatar URL); fall
  // back to the campaign's denormalised name/id (initials + colour, no photo).
  const owner =
    members.data?.find((m) => m.id === campaign.creator) ??
    creatorFromCampaign(campaign);

  // "Dernière action" — the most recent timeline event we have loaded. The
  // timeline is period-scoped and may still be loading, so this is best-effort:
  // when there's nothing yet, the segment is simply omitted.
  const lastActionAt = (timeline.data?.events ?? []).reduce<string | null>(
    (latest, e) => (e.at && (!latest || e.at > latest) ? e.at : latest),
    null,
  );

  // Retry-errored is only meaningful once the job has settled and some actions
  // failed (e.g. "Compte déconnecté"). It probes one, then re-queues the rest.
  const erroredCount = prospects.filter((p) => p.status === "error").length;
  const canRetryErrors =
    (apiStatus === "completed" || apiStatus === "failed") && erroredCount > 0;

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

  const onRetryErrors = () => {
    if (busy) return;
    setConfirm({
      title: "Réessayer les actions en erreur ?",
      message: `${erroredCount} action${erroredCount > 1 ? "s" : ""} en erreur ${
        erroredCount > 1 ? "seront remises" : "sera remise"
      } en file d'attente. L'envoi reprend au rythme habituel (heures ouvrées, cadence humanisée) — rien n'est envoyé immédiatement.`,
      confirmLabel: "Réessayer",
      variant: "default",
      onConfirm: () =>
        retryErrors.mutate(id, {
          onSuccess: (res) =>
            toast.success(res?.message ?? "Actions remises en file"),
        }),
    });
  };

  // Duplicate = open the creation wizard prefilled (handled on the list page),
  // not a direct row create. We route there with ?duplicate=<id>; the lock /
  // "Dupliqué ✓" state (declared up top with the other hooks) gives immediate
  // feedback before the nav.
  const onDuplicate = () => {
    if (busy || duplicated) return;
    setDuplicated(true);
    router.push(`/campaigns?duplicate=${id}`);
  };

  const onToggleWeekends = (checked: boolean) => {
    setWeekends.mutate(
      { id, sendOnWeekends: checked },
      {
        onSuccess: () =>
          toast.success(
            checked
              ? "Envois le week-end activés"
              : "Envois le week-end désactivés",
          ),
      },
    );
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 bg-[#FAFAFB] p-6 dark:bg-background lg:p-8">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          {/* Title + badges, inline on one row (per the detail-header design). */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
            <ChannelPill channel={campaign.channel} />
            <TypeBadge type={campaign.type} />
            <StatusBadge status={campaign.status} />
          </div>

          {/* Meta line: launch date · owner · prospect count · live · last action. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
            {campaign.launchedAt && (
              <span>
                {activityLabel(apiStatus)} le{" "}
                <span className="font-medium text-foreground">
                  {formatDayMonthYear(campaign.launchedAt)}
                </span>
              </span>
            )}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              par
              <Avatar creator={owner} size={18} />
              <span className="font-medium text-foreground">{owner.name}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className="font-medium text-foreground">{campaign.total}</span>{" "}
              prospects
            </span>
            {isLive && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <span
                    className="size-1.5 rounded-full bg-emerald-500"
                    style={{ animation: "pulse 1.6s ease-in-out infinite" }}
                  />
                  en direct
                </span>
              </>
            )}
            {lastActionAt && (
              <>
                <span aria-hidden>·</span>
                <span>dernière action {formatRelativeDate(lastActionAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions row, beneath the title/meta: primary launch/pause/resume,
            retry-errored (settled jobs only), and an overflow menu. */}
        <div className="flex flex-wrap items-center gap-2">
          {showLaunch && (
            <Button variant="default" disabled={busy} onClick={onLaunch}>
              <Play className="size-3.5" />
              Lancer
            </Button>
          )}
          {canPauseResume && apiStatus !== "paused" && (
            <Button variant="default" disabled={busy} onClick={onPauseResume}>
              <Pause className="size-3.5" />
              Mettre en pause
            </Button>
          )}
          {canPauseResume && apiStatus === "paused" && (
            <Button variant="default" disabled={busy} onClick={onPauseResume}>
              <Play className="size-3.5" />
              Reprendre
            </Button>
          )}
          {canRetryErrors && (
            <Button variant="outline" disabled={busy} onClick={onRetryErrors}>
              <RefreshCw
                className={`size-3.5 ${retryErrors.isPending ? "animate-spin" : ""}`}
              />
              Réessayer les erreurs ({erroredCount})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={busy}
                aria-label="Plus d'actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={busy || duplicated} onClick={onDuplicate}>
                {duplicated ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {duplicated ? "Dupliqué" : "Dupliquer"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: "Supprimer cette campagne ?",
                    message: `« ${campaign.name} » sera supprimée selon les règles actuelles de l'espace.`,
                    confirmLabel: "Supprimer",
                    variant: "destructive",
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
                <Trash2 className="size-3.5" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Weekend opt-in: LinkedIn pacing is weekdays-only by default; this
              lets the campaign also send Sat/Sun (still within 08–19 local). */}
          {campaign.channel === "linkedin" && (
            <label
              className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-muted-foreground"
              title="Autorise l'envoi le samedi et le dimanche (toujours entre 8h et 19h). Désactivé : envois en semaine uniquement."
            >
              <Switch
                checked={detail.data.sendOnWeekends}
                onCheckedChange={onToggleWeekends}
                disabled={setWeekends.isPending}
              />
              Envoyer le week-end
            </label>
          )}
        </div>
      </div>

      {/* Period selector — scopes the chart + activity feed below. */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setTimelinePeriod(o.id);
                // The selected day may fall outside the new range — reset it.
                setSelectedDate(null);
              }}
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
        selectedDate={selectedDate}
        onSelectDate={(d) =>
          setSelectedDate((prev) => (prev === d ? null : d))
        }
      />

      <CampaignMessageCard
        type={campaign.type}
        template={detail.data.messageTemplate}
        attachment={detail.data.attachment}
      />

      {prospects.length === 0 ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Prospects
          </h2>
          <p className="text-[13px] text-muted-foreground">Aucun prospect dans cette campagne.</p>
        </div>
      ) : (
        <CampaignProspectsTable
          rows={prospects}
          campaignName={campaign.name}
          twoStep={campaign.type === 'invitation_message'}
          dateFilter={selectedDate}
          onClearDateFilter={() => setSelectedDate(null)}
        />
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
        confirmLabel={confirm?.confirmLabel ?? "Confirmer"}
        variant={confirm?.variant ?? "default"}
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
