"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, Plus, RotateCcw, Search, Target, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  DEFAULT_FILTERS,
  computePerf,
  type Campaign,
  type FilterState,
  type Item,
} from "./data";
import {
  postJson,
  useCallSessions,
  useCampaignJobs,
  useCampaignJobsBulk,
  useCancelJob,
  useDeleteSession,
  useDuplicateJob,
  useLaunchJob,
  useUpdateJobStatus,
  type CampaignJobBulkOperation,
} from "./queries";
import { KpiBar } from "./kpi-bar";
import { FiltersBar } from "./filters";
import { CampaignsTable, CampaignsTableSkeleton, type Action, type SortBy } from "./campaigns-table";
import { SessionsGrid } from "./sessions-grid";
import { Timeline } from "./timeline";
import { BulkActionBar, type BulkAction } from "./bulk-action-bar";
import {
  CreateCampaignModal,
  type CreateCampaignPayload,
  type LinkedInCampaignType,
} from "./create-campaign-modal";
import {
  CallSessionModal,
  type CreateSessionPayload,
} from "./call-session-modal";

type Tab = "campaigns" | "sessions" | "all";

const PERIOD_MS: Record<string, number> = {
  "7": 7 * 86400000,
  "30": 30 * 86400000,
  "90": 90 * 86400000,
};
const NOW_REF = new Date("2026-05-06T12:00:00").getTime();

function mapLinkedInCampaignType(
  t: LinkedInCampaignType,
): "invite" | "invite_with_note" | "contact" {
  switch (t) {
    case "invitation_only":
      return "invite";
    case "message_only":
      return "contact";
    case "invitation_message":
    default:
      return "invite_with_note";
  }
}

function unwrapCreatedEntityId(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const p = payload as { data?: { id?: string }; id?: string };
  return p.data?.id ?? p.id;
}

export default function CampaignsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  const {
    data: campaigns = [],
    isPlaceholderData: campaignsPlaceholder,
  } = useCampaignJobs();
  const {
    data: sessions = [],
    isPlaceholderData: sessionsPlaceholder,
  } = useCallSessions();
  // While the first response hasn't arrived (placeholderData = []), treat the
  // page as "loading" rather than "empty" so we never flash the
  // "Aucune campagne pour l'instant" misinformation.
  const isInitialLoading = campaignsPlaceholder || sessionsPlaceholder;
  const updateStatus = useUpdateJobStatus();
  const launchJob = useLaunchJob();
  const cancelJob = useCancelJob();
  const duplicateJob = useDuplicateJob();
  const bulkJobs = useCampaignJobsBulk();
  const deleteSession = useDeleteSession();
  const [tab, setTab] = useState<Tab>("campaigns");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>({ field: "launchedAt", dir: "desc" });
  const [createOpen, setCreateOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [flashedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const filterFn = (item: Item): boolean => {
    if (filters.search) {
      if (!item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    }
    if (filters.channels.length > 0 && !filters.channels.includes(item.channel)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false;
    if (filters.creators.length > 0 && !filters.creators.includes(item.creator)) return false;
    if (filters.period !== "all") {
      const d = item.kind === "campaign" ? item.launchedAt : item.date;
      if (!d) return false;
      if (NOW_REF - new Date(d).getTime() > PERIOD_MS[filters.period]) return false;
    }
    return true;
  };

  const filteredCampaigns = useMemo(() => {
    const out = campaigns.filter(filterFn);
    return [...out].sort((a, b) => {
      const f = sortBy.field;
      let av: number | string | null;
      let bv: number | string | null;
      switch (f) {
        case "progress":
          av = a.processed / (a.total || 1);
          bv = b.processed / (b.total || 1);
          break;
        case "performance": {
          const pa = computePerf(a);
          const pb = computePerf(b);
          av = pa ? pa.rate : -1;
          bv = pb ? pb.rate : -1;
          break;
        }
        case "launchedAt":
          av = a.launchedAt ? new Date(a.launchedAt).getTime() : 0;
          bv = b.launchedAt ? new Date(b.launchedAt).getTime() : 0;
          break;
        default:
          av = (a as unknown as Record<string, string>)[f] ?? "";
          bv = (b as unknown as Record<string, string>)[f] ?? "";
      }
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortBy.dir === "asc" ? -1 : 1;
      if (av > bv) return sortBy.dir === "asc" ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, filters, sortBy]);

  const filteredSessions = useMemo(
    () =>
      sessions.filter(filterFn).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, filters],
  );

  const allItems: Item[] = useMemo(
    () =>
      [...filteredCampaigns, ...filteredSessions].sort((a, b) => {
        const av = new Date(a.kind === "campaign" ? a.launchedAt ?? 0 : a.date).getTime();
        const bv = new Date(b.kind === "campaign" ? b.launchedAt ?? 0 : b.date).getTime();
        return bv - av;
      }),
    [filteredCampaigns, filteredSessions],
  );

  const counts = {
    campaigns: filteredCampaigns.length,
    sessions: filteredSessions.length,
    all: filteredCampaigns.length + filteredSessions.length,
  };
  const totalCount = campaigns.length + sessions.length;

  const handleAction = (action: Action, item: Campaign) => {
    if (action === "pause") {
      updateStatus.mutate(
        { id: item.id, status: "paused" },
        { onSuccess: () => toast.success(`« ${item.name} » mise en pause`) },
      );
    } else if (action === "resume") {
      updateStatus.mutate(
        { id: item.id, status: "running" },
        { onSuccess: () => toast.success(`« ${item.name} » reprise`) },
      );
    } else if (action === "launch") {
      launchJob.mutate(item.id, {
        onSuccess: () => toast.success(`« ${item.name} » lancée`),
      });
    } else if (action === "duplicate") {
      duplicateJob.mutate(item.id, {
        onSuccess: () => toast.success(`« ${item.name} » dupliquée`),
      });
    } else if (action === "delete") {
      setConfirm({
        title: "Supprimer cette campagne ?",
        message: `« ${item.name} » sera définitivement supprimée. Cette action est irréversible.`,
        onConfirm: () => {
          cancelJob.mutate(item.id, {
            onSuccess: () => toast.success(`« ${item.name} » supprimée`),
          });
          setConfirm(null);
        },
      });
    }
  };

  const runCampaignBulk = (operations: CampaignJobBulkOperation[]) => {
    if (operations.length === 0) {
      toast.message("Aucune campagne sélectionnée n'est éligible pour cette action.");
      setSelected([]);
      return;
    }
    bulkJobs.mutate(operations, {
      onSuccess: (payload) => {
        const failures = payload.results.filter((r) => !r.ok);
        const okCount = payload.results.filter((r) => r.ok).length;
        if (failures.length && okCount === 0) {
          toast.error(failures[0]?.error ?? "Action groupée impossible");
        } else if (failures.length) {
          toast.warning(`${okCount}/${payload.results.length} traitées`, {
            description:
              failures
                .map((f) => f.error)
                .filter(Boolean)
                .slice(0, 3)
                .join(" · ") || undefined,
          });
        } else {
          const op = operations[0]?.op;
          if (op === "duplicate") {
            toast.success(okCount === 1 ? "Campagne dupliquée" : `${okCount} campagnes dupliquées`);
          } else if (op === "delete") {
            toast.success(okCount === 1 ? "Campagne supprimée" : `${okCount} campagnes supprimées`);
          } else if (op === "set_status") {
            toast.success("Campagnes mises en pause");
          }
        }
        void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      },
      onSettled: () => {
        setSelected([]);
      },
    });
  };

  const handleBulk = (action: BulkAction) => {
    if (action === "delete") {
      setConfirm({
        title: `Supprimer ${selected.length} campagne${selected.length > 1 ? "s" : ""} ?`,
        message: "Cette action applique les mêmes règles que la suppression ligne à ligne.",
        onConfirm: () => {
          runCampaignBulk(selected.map((id) => ({ op: "delete", id }) as CampaignJobBulkOperation));
          setConfirm(null);
        },
      });
      return;
    }
    if (action === "pause") {
      const ops = selected
        .filter((id) => campaigns.find((x) => x.id === id)?.status === "running")
        .map((id) => ({ op: "set_status" as const, id, status: "paused" as const }));
      runCampaignBulk(ops);
      return;
    }
    if (action === "duplicate") {
      runCampaignBulk(selected.map((id) => ({ op: "duplicate" as const, id }) as CampaignJobBulkOperation));
      return;
    }
    toast.message("Export bientôt disponible");
    setSelected([]);
  };

  const isEmpty = totalCount === 0;
  const isFilteredEmpty = !isEmpty && counts.all === 0;
  const filtersActive =
    filters.channels.length > 0 ||
    filters.statuses.length > 0 ||
    filters.period !== "all" ||
    filters.creators.length > 0 ||
    filters.search.length > 0;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "campaigns", label: "Campagnes", count: counts.campaigns },
    { id: "sessions", label: "Sessions d'appels", count: counts.sessions },
    { id: "all", label: "Tous", count: counts.all },
  ];

  /**
   * Builds the API payload from the wizard data. `bdd_id` + refinement
   * booleans let the server resolve the prospect list — the client only
   * passes booleans, never raw ids.
   */
  const buildCampaignPayload = (data: CreateCampaignPayload, launchNow: boolean) => ({
    type: mapLinkedInCampaignType(data.type),
    name: data.name.trim(),
    bdd_id: data.bdd_id,
    refine_exclude_contacted: data.refine_exclude_contacted,
    refine_only_with_phone: data.refine_only_with_phone,
    refine_exclude_active: data.refine_exclude_active,
    message_template:
      data.type === "invitation_only" ? data.invitation_note : data.message,
    launch_now: launchNow,
  });

  const onDraftCampaign = async (data: CreateCampaignPayload) => {
    try {
      const payload = await postJson(
        "/api/campaigns/jobs",
        buildCampaignPayload(data, false),
      );
      const createdId = unwrapCreatedEntityId(payload);
      toast.success("Brouillon enregistré", { description: "Vous pouvez ajuster avant de lancer." });
      setCreateOpen(false);
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      if (createdId) router.push(`/campaigns/${createdId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer la campagne");
    }
  };

  const onCreateCampaign = async (data: CreateCampaignPayload) => {
    try {
      const payload = await postJson(
        "/api/campaigns/jobs",
        buildCampaignPayload(data, true),
      );
      const createdId = unwrapCreatedEntityId(payload);

      // The API returns a `skipped` array when prospects were filtered out
      // (already in an active workflow / campaign). Surface it so the user
      // doesn't wonder why the count is lower than expected.
      const payloadRecord = payload as Record<string, unknown> | null;
      const inner =
        payloadRecord && typeof payloadRecord === "object" && "data" in payloadRecord
          ? (payloadRecord["data"] as Record<string, unknown> | undefined)
          : payloadRecord;
      const skipped = Array.isArray(
        (inner as Record<string, unknown> | undefined)?.["skipped"],
      )
        ? ((inner as { skipped: { reason?: string }[] }).skipped)
        : [];

      if (skipped.length > 0) {
        const byReason = new Map<string, number>();
        for (const s of skipped) {
          const r = s.reason ?? "other";
          byReason.set(r, (byReason.get(r) ?? 0) + 1);
        }
        const reasonLabel: Record<string, string> = {
          in_active_workflow: "déjà dans un parcours",
          in_active_campaign: "déjà dans une campagne active",
        };
        const description = [...byReason.entries()]
          .map(([r, n]) => `${n} ${reasonLabel[r] ?? r}`)
          .join(" · ");
        toast.success("Campagne lancée", {
          description: `${skipped.length} prospect(s) ignoré(s) : ${description}`,
        });
      } else {
        toast.success("Campagne lancée");
      }

      setCreateOpen(false);
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      if (createdId) router.push(`/campaigns/${createdId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de lancer la campagne");
    }
  };

  const onCreateSession = async (data: CreateSessionPayload) => {
    try {
      let scheduled_at: string | undefined;
      if (data.scheduleMode === "later") {
        if (!data.scheduleDate || !data.scheduleTime) {
          toast.error("Merci de choisir une date et une heure.");
          return;
        }
        scheduled_at = new Date(`${data.scheduleDate}T${data.scheduleTime}:00`).toISOString();
      }

      // bdd_ids[] when the wizard selected a list — server resolves prospects.
      // Advanced settings (call order, wa follow-up, notify team, duration)
      // are persisted under the session's metadata for the detail page to
      // read; the call-sessions table doesn't have dedicated columns yet.
      const payload = await postJson("/api/call-sessions", {
        title: data.name.trim(),
        description: data.description,
        bdd_ids: data.bdd_id ? [data.bdd_id] : undefined,
        schedule_mode: data.scheduleMode,
        scheduled_at,
        metadata: {
          call_order: data.callOrder ?? "list",
          wa_followup: data.waFollowup ?? true,
          notify_team: data.notifyTeam ?? false,
          duration_minutes: data.durationMinutes ?? 60,
          refine_exclude_contacted: data.refine_exclude_contacted ?? false,
          refine_exclude_active: data.refine_exclude_active ?? true,
        },
      });

      const createdId = unwrapCreatedEntityId(payload);
      toast.success(
        data.scheduleMode === "now" ? "Session démarrée" : "Session planifiée",
      );
      setBookingOpen(false);
      void qc.invalidateQueries({ queryKey: ["campaigns", "sessions", workspaceId] });
      if (createdId) router.push(`/campaigns/sessions/${createdId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer la session");
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#FAFAFB] dark:bg-background">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 lg:px-8">
        <div className="min-w-0 max-w-xl lg:max-w-2xl">
          <p className="m-0 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Pilotez votre prospection LinkedIn, WhatsApp et téléphone depuis un seul hub.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBookingOpen(true)}>
            <Phone className="size-3.5" />
            Nouvelle session d&apos;appels
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Créer une campagne
          </Button>
        </div>
      </div>

      <div className="px-6 pt-5 lg:px-8">
        <KpiBar period={filters.period} creators={filters.creators} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6 lg:px-8">
        <div className="flex items-center gap-0.5 border-b">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13.5px] transition-colors ${
                  active ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-px text-[11.5px] font-semibold tabular-nums ${
                    active ? "bg-[#E8F0FD] text-[#003EA3]" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
                {active ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-foreground" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="relative pb-2 sm:min-w-[280px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Rechercher une campagne…"
            className="h-[34px] pl-8"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => setFilters({ ...filters, search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-6 lg:px-8">
        <FiltersBar
          filters={filters}
          setFilters={setFilters}
          totalCount={totalCount}
          filteredCount={counts.all}
        />
      </div>

      <div className="flex-1 px-6 pb-20 pt-1 lg:px-8">
        {isInitialLoading ? (
          <CampaignsTableSkeleton />
        ) : isEmpty ? (
          <div className="rounded-xl border bg-card px-6 py-20 text-center">
            <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-[#E8F0FD] text-[#0052D9]">
              <Target className="size-7" />
            </div>
            <div className="text-lg font-semibold tracking-tight">Aucune campagne pour l&apos;instant</div>
            <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-muted-foreground">
              Lancez votre première séquence d&apos;outreach LinkedIn ou WhatsApp, ou démarrez une session d&apos;appels téléphoniques.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                Créer une campagne
              </Button>
              <Button variant="outline" onClick={() => setBookingOpen(true)}>
                <Phone className="size-3.5" />
                Lancer une session d&apos;appels
              </Button>
            </div>
          </div>
        ) : isFilteredEmpty ? (
          <div className="rounded-xl border bg-card px-6 py-16 text-center">
            <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Search className="size-6" />
            </div>
            <div className="text-base font-semibold">Aucun résultat pour ces filtres</div>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              Essayez d&apos;élargir vos critères ou réinitialisez tous les filtres.
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              <RotateCcw className="size-3.5" />
              Réinitialiser les filtres
            </Button>
          </div>
        ) : tab === "campaigns" ? (
          filteredCampaigns.length > 0 ? (
            <CampaignsTable
              items={filteredCampaigns}
              selected={selected}
              setSelected={setSelected}
              onAction={handleAction}
              sortBy={sortBy}
              setSortBy={setSortBy}
              flashedId={flashedId}
            />
          ) : (
            <FilteredEmpty onReset={() => setFilters(DEFAULT_FILTERS)} active={filtersActive} />
          )
        ) : tab === "sessions" ? (
          filteredSessions.length > 0 ? (
            <SessionsGrid
              sessions={filteredSessions}
              onAction={(a, s) => {
                if (a === "delete") {
                  deleteSession.mutate(s.id, {
                    onSuccess: () => toast.success("Session supprimée"),
                  });
                }
              }}
            />
          ) : (
            <FilteredEmpty onReset={() => setFilters(DEFAULT_FILTERS)} active={filtersActive} />
          )
        ) : (
          <Timeline items={allItems} />
        )}
      </div>

      <BulkActionBar
        count={tab === "campaigns" ? selected.length : 0}
        onAction={handleBulk}
        onClear={() => setSelected([])}
      />

      <CreateCampaignModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreateCampaign}
        onDraft={onDraftCampaign}
      />

      <CallSessionModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onCreate={onCreateSession}
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

function FilteredEmpty({ onReset, active }: { onReset: () => void; active: boolean }) {
  return (
    <div className="rounded-xl border bg-card px-6 py-16 text-center">
      <div className="text-base font-semibold">Aucun résultat</div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {active ? "Aucun élément ne correspond aux filtres actuels." : "Aucun élément à afficher."}
      </p>
      {active ? (
        <Button variant="outline" className="mt-4" onClick={onReset}>
          <RotateCcw className="size-3.5" />
          Réinitialiser les filtres
        </Button>
      ) : null}
    </div>
  );
}
