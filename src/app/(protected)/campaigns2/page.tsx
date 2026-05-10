"use client";

import { useMemo, useState } from "react";
import { Phone, Plus, RotateCcw, Search, Target, X } from "lucide-react";
import { toast } from "sonner";
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
  useCallSessions,
  useCampaignJobs,
  useCancelJob,
  useDeleteSession,
  useLaunchJob,
  useUpdateJobStatus,
} from "./queries";
import { KpiBar } from "./kpi-bar";
import { FiltersBar } from "./filters";
import { CampaignsTable, type Action, type SortBy } from "./campaigns-table";
import { SessionsGrid } from "./sessions-grid";
import { Timeline } from "./timeline";
import { BulkActionBar, type BulkAction } from "./bulk-action-bar";
import {
  CreateCampaignModal,
  type CreateCampaignPayload,
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

export default function Campaigns2Page() {
  const { data: campaigns = [] } = useCampaignJobs();
  const { data: sessions = [] } = useCallSessions();
  const updateStatus = useUpdateJobStatus();
  const launchJob = useLaunchJob();
  const cancelJob = useCancelJob();
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
      // No backend route yet — see BACKEND.md §1.3 (useDuplicateJob).
      toast.message("Duplication bientôt disponible");
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

  const handleBulk = (action: BulkAction) => {
    // Bulk routes don't exist yet — see BACKEND.md §1.6. We fan out individual
    // PATCH/cancel calls in the meantime so the UX still works for small batches.
    if (action === "delete") {
      setConfirm({
        title: `Supprimer ${selected.length} campagne${selected.length > 1 ? "s" : ""} ?`,
        message: "Cette action est irréversible.",
        onConfirm: () => {
          selected.forEach((id) => cancelJob.mutate(id));
          toast.success(`${selected.length} campagne${selected.length > 1 ? "s supprimées" : " supprimée"}`);
          setSelected([]);
          setConfirm(null);
        },
      });
    } else if (action === "pause") {
      selected.forEach((id) => {
        const c = campaigns.find((x) => x.id === id);
        if (c?.status === "running") updateStatus.mutate({ id, status: "paused" });
      });
      toast.success(`${selected.length} campagne${selected.length > 1 ? "s mises" : " mise"} en pause`);
      setSelected([]);
    } else if (action === "duplicate") {
      toast.message("Duplication bientôt disponible");
      setSelected([]);
    } else if (action === "export") {
      toast.message("Export bientôt disponible");
      setSelected([]);
    }
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

  // Both creation flows need the full wizard (prospect picker + config) to be
  // useful end-to-end — see BACKEND.md §4 and §5. Until then we close the
  // placeholder modal and explain. The sub-routes still demo the rest.
  const onCreateCampaign = (_data: CreateCampaignPayload) => {
    setCreateOpen(false);
    toast.message("Sélection des prospects à venir", {
      description: "Le wizard complet (cibles, message, planning) arrive bientôt.",
    });
  };
  const onDraftCampaign = onCreateCampaign;
  const onCreateSession = (_data: CreateSessionPayload) => {
    setBookingOpen(false);
    toast.message("Sélection des prospects à venir", {
      description: "Le wizard complet (cibles, planification) arrive bientôt.",
    });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#FAFAFB] dark:bg-background">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campagnes & Appels</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
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
        {isEmpty ? (
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
