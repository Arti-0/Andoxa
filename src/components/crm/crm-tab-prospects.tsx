"use client";

/**
 * CRM v2 — Prospects tab.
 *
 * Visual reference: design/CRM/crm-tab-prospects.jsx.
 *
 * Data wiring:
 *   • GET /api/prospects?... — paginated prospects.
 *   • GET /api/bdd?pageSize=200 — resolve bdd_id → list name.
 *   • DELETE /api/prospects/:id — moves to corbeille.
 *   • POST /api/unipile/prospects/invite — LinkedIn invite (existing).
 *
 * Stubs (see CRM_BACKEND_TODO.md):
 *   • last activity label (silence vs. reply, "il y a X jours")
 *   • active workflow + step on the prospect row
 *   • channel list (`convs`) — currently inferred from linked_chat_id
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Plus,
  MoreVertical,
  Layers,
  List as ListIcon,
  Play,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProspectCreateDialog } from "@/components/crm/prospect-create-dialog";
import { ProspectImportDialog } from "@/components/crm/prospect-import-dialog";
import {
  FloatingSelectionBar,
  floatingSelectionToolbarButtonClass,
} from "@/components/ui/floating-selection-bar";
import { cn } from "@/lib/utils";
import {
  useProspectActions,
  type ProspectMenuItem,
} from "./use-prospect-actions";
import {
  NameAvatar,
  StatusPill,
  SourcePill,
  ChannelTooltipDot,
  silenceTier,
  silenceTierClasses,
  prospectPhotoFromEnrichment,
  useDynamicStatusConfig,
} from "./crm-shared";
import { type Prospect } from "@/lib/types/prospects";
import { useProspectStatuses } from "@/lib/prospects/statuses";
import { CrmProspectToolbar } from "./crm-prospect-toolbar";
import { PipelineSettingsModal } from "./pipeline-settings-modal";
import {
  sortProspects,
  PROSPECT_SORT_DEFAULT_DIR,
  type ProspectSortKey,
  type SortDir,
} from "./crm-prospect-sort";
import { extractCleanRole } from "@/lib/utils/extract-role";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

/**
 * #FF: workflows — the CRM "Workflow" column (and its grid track) is hidden
 * until workflows are enterprise-ready. Constant resolved once at module load,
 * so gating costs nothing at render time.
 */
const SHOW_WORKFLOWS = isFeatureEnabled("workflows");

/**
 * Grid column template for the compact prospect rows. The Workflow track
 * (160px) is only present when the workflows flag is on, keeping the layout
 * tight when the column is hidden.
 */
const COMPACT_GRID_COLS = SHOW_WORKFLOWS
  ? "grid-cols-[42px_1fr_130px_100px_150px_160px_70px_40px]"
  : "grid-cols-[42px_1fr_130px_100px_150px_70px_40px]";

/* ============================================================
   Types
   ============================================================ */

interface ProspectsApiResponse {
  items: Prospect[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface ProspectsTabProps {
  workspaceId: string | null;
  bddFilter: string | null;
  setBddFilter: (id: string | null) => void;
}

/* ============================================================
   Helpers — derive display fields from real Prospect rows.
   ============================================================ */

/** Server-side last_activity (CRM-6) with a sane fallback. */
function lastActivityLabel(p: Prospect): string {
  return p.last_activity?.label ?? "—";
}

/** Server-side channel inventory (CRM-8) with a fallback for older clients. */
function channelKindsFor(p: Prospect): string[] {
  if (p.convs && p.convs.length > 0) return p.convs;
  return p.linked_chat_id ? ["linkedin"] : [];
}

function prospectPhoto(p: Prospect): string | null {
  return prospectPhotoFromEnrichment(p);
}

/* ============================================================
   Prospects tab
   ============================================================ */

export function ProspectsTab({
  workspaceId,
  bddFilter,
  setBddFilter,
}: ProspectsTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ProspectSortKey>("lastActivity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [view, setView] = useState<"table" | "compact">("table");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const rowActions = useProspectActions("prospects-v2");

  const { pipelineOrder, cfgByKey } = useDynamicStatusConfig();
  const { statuses: statusOptions } = useProspectStatuses();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  /** Lightweight bdd lookup for the "Ajouter à une liste" bulk picker. */
  const { data: bddOptions } = useQuery({
    queryKey: ["bdd-bulk-options", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/bdd?page=1&pageSize=100", {
        credentials: "include",
      });
      if (!res.ok) return { items: [] as { id: string; name: string }[] };
      const json = await res.json();
      return (json.data ?? json) as { items: { id: string; name: string }[] };
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });

  /* ---------- queries ---------- */
  const { data: funnelData } = useQuery({
    queryKey: ["prospects-funnel", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/prospects/funnel", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as {
        stages: { status: string; count: number }[];
      };
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const { data: prospectsData, isFetching: prospectsFetching } = useQuery({
    queryKey: [
      "prospects-v2",
      workspaceId,
      bddFilter,
      debouncedSearch,
      sourceFilter,
      statusFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "150" });
      if (bddFilter) params.set("bdd_id", bddFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sourceFilter.length > 0)
        params.set("source", sourceFilter.join(","));
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/prospects?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as ProspectsApiResponse;
    },
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });

  /* `bdd_name` is now baked into each prospect row by /api/prospects (CRM-11),
   *  so we only need a small lookup for the active list-filter banner.
   *  We piggy-back on the prospects we already fetched — when the result is
   *  empty (e.g. fresh navigation with a list_id that has no prospects yet)
   *  we fall back to a single bdd row fetch.
   */
  const { data: bddSingle } = useQuery({
    queryKey: ["bdd-single", bddFilter],
    queryFn: async () => {
      if (!bddFilter) return null;
      const res = await fetch(`/api/bdd/${bddFilter}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? json) as { id: string; name: string };
    },
    enabled: !!bddFilter,
    staleTime: 60_000,
  });

  /* ---------- mutations ---------- */
  /** CRM-10 — generic bulk action against /api/prospects/bulk. */
  const bulkMutation = useMutation({
    mutationFn: async (payload: {
      action: "status" | "bdd" | "delete";
      value?: string | null;
    }) => {
      const res = await fetch("/api/prospects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...payload, ids: [...selected] }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as { updated: number };
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["prospects-v2"] });
      const verb =
        vars.action === "delete"
          ? "supprimés"
          : vars.action === "bdd"
            ? "déplacés vers une liste"
            : "mis à jour";
      toast.success(`${res.updated} prospect${res.updated > 1 ? "s" : ""} ${verb}`);
      setSelected(new Set());
    },
    onError: () => toast.error("Action en masse impossible"),
  });

  /* ---------- derived ---------- */
  const allProspects = prospectsData?.items ?? [];
  const totalProspects = prospectsData?.total ?? allProspects.length;

  const funnelByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of funnelData?.stages ?? []) {
      map.set(s.status, s.count);
    }
    return map;
  }, [funnelData]);

  const statusPills = useMemo(() => {
    const useLocalCounts = !!bddFilter || !!debouncedSearch || sourceFilter.length > 0;
    return pipelineOrder.map((key) => ({
      key,
      label: cfgByKey.get(key)?.label ?? key,
      count: useLocalCounts
        ? allProspects.filter((p) => p.status === key).length
        : (funnelByStatus.get(key) ?? 0),
      color: cfgByKey.get(key)?.hex,
    }));
  }, [
    pipelineOrder,
    cfgByKey,
    funnelByStatus,
    bddFilter,
    debouncedSearch,
    sourceFilter,
    allProspects,
  ]);

  const totalAllStatuses = useMemo(() => {
    if (bddFilter || debouncedSearch || sourceFilter.length > 0) {
      return totalProspects;
    }
    let sum = 0;
    for (const c of funnelByStatus.values()) sum += c;
    return sum;
  }, [
    funnelByStatus,
    bddFilter,
    debouncedSearch,
    sourceFilter,
    totalProspects,
  ]);

  // Pipeline order → index map so the "Statut" column sorts by pipeline order.
  const statusOrder = useMemo(
    () => new Map(pipelineOrder.map((k, i) => [k, i])),
    [pipelineOrder],
  );

  const rows = useMemo(
    () => sortProspects(allProspects, sortBy, sortDir, statusOrder),
    [allProspects, sortBy, sortDir, statusOrder],
  );

  // Column-header click: toggle direction if it's the active column, otherwise
  // switch to that column at its natural default direction. Sorting is fully
  // client-side here (the list is capped at ~150 rows), so this is instant.
  const handleHeaderSort = (key: ProspectSortKey) => {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(PROSPECT_SORT_DEFAULT_DIR[key]);
    }
  };

  // Dropdown selection: switch column at its default direction.
  const handleSortByChange = (key: ProspectSortKey) => {
    setSortBy(key);
    setSortDir(PROSPECT_SORT_DEFAULT_DIR[key]);
  };

  const enCours = totalAllStatuses
    - (funnelByStatus.get("won") ?? 0)
    - (funnelByStatus.get("lost") ?? 0);
  const signed = funnelByStatus.get("won") ?? 0;
  const lost = funnelByStatus.get("lost") ?? 0;

  const selectedList = bddFilter
    ? (bddSingle?.name ??
      allProspects.find((p) => p.bdd_id === bddFilter)?.bdd_name ??
      null)
    : null;

  /* ---------- handlers ---------- */
  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  };
  const toggleAll = () => {
    setSelected((s) =>
      s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  };
  const handleSourceClick = (_src: string, list: string | null) => {
    if (!list) return;
    // The clicked prospect carries bdd_id directly via `bdd_name` enrichment;
    // we look it back up among the rows currently rendered. This avoids an
    // extra round trip when the user clicks a list pill from a row.
    const found = allProspects.find((p) => p.bdd_name === list);
    if (found?.bdd_id) setBddFilter(found.bdd_id);
  };

  /* ---------- render ---------- */
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:gap-6">
        <div className="min-w-0">
          <p className="m-0 text-[13px] text-muted-foreground">
            {totalProspects} prospects ·{" "}
            <span className="font-medium text-blue-700">{enCours} en cours</span>{" "}
            · {signed} signé{signed > 1 ? "s" : ""} · {lost} perdus
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5">
            {(
              [
                ["table", "Tableau", ListIcon],
                ["compact", "Compact", Layers],
              ] as const
            ).map(([id, label, Icon]) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-background px-3 py-1.5 text-[13px] font-medium text-primary shadow-sm transition-colors hover:bg-accent dark:border-primary/45"
          >
            <Upload className="h-3.5 w-3.5" />
            Importer
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau prospect
          </button>
        </div>
      </div>

      {/* List filter banner */}
      {selectedList && (
        <div className="mb-3.5 flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5">
          <Layers className="h-3.5 w-3.5 text-blue-700" />
          <span className="text-[13px]">
            Filtré sur la liste <b>« {selectedList} »</b> · {rows.length}{" "}
            prospect{rows.length > 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setBddFilter(null)}
            className="rounded-md border border-blue-200 bg-card px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
          >
            Effacer le filtre
          </button>
        </div>
      )}

      <CrmProspectToolbar
        className="mb-3.5"
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusPills={statusPills}
        totalCount={totalAllStatuses || totalProspects}
        onOpenPipelineSettings={() => setShowPipelineSettings(true)}
        search={search}
        onSearchChange={setSearch}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        loading={prospectsFetching || search.trim() !== debouncedSearch}
      />

      <FloatingSelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
      >
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={floatingSelectionToolbarButtonClass(false)}
            >
              Ajouter à une liste
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="z-tooltip max-h-[300px] w-[260px] overflow-y-auto p-1"
          >
            <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ajouter à la liste
            </div>
            {(bddOptions?.items ?? []).length === 0 ? (
              <div className="px-2 py-2 text-[12.5px] text-muted-foreground">
                Aucune liste
              </div>
            ) : (
              (bddOptions?.items ?? []).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    bulkMutation.mutate({ action: "bdd", value: b.id })
                  }
                  className="block w-full truncate rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-accent"
                >
                  {b.name}
                </button>
              ))
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={floatingSelectionToolbarButtonClass(false)}
            >
              Changer le statut
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="z-tooltip max-h-[300px] w-[200px] overflow-y-auto p-1"
          >
            <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Déplacer vers
            </div>
            {statusOptions
              .filter((s) => !s.is_archived)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    bulkMutation.mutate({ action: "status", value: s.key })
                  }
                  className="flex w-full items-center gap-2 truncate rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-accent"
                >
                  <span
                    className="size-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => setBulkConfirmDelete(true)}
          className={floatingSelectionToolbarButtonClass(true)}
        >
          Supprimer
        </button>
      </FloatingSelectionBar>

      <ConfirmDialog
        open={bulkConfirmDelete}
        onOpenChange={(open) => {
          if (!open) setBulkConfirmDelete(false);
        }}
        title={`Supprimer ${selected.size} prospect${selected.size > 1 ? "s" : ""} ?`}
        description="Ils seront déplacés dans la corbeille et conservés 30 jours."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          setBulkConfirmDelete(false);
          bulkMutation.mutate({ action: "delete" });
        }}
      />

      {/* Table or Compact view */}
      {view === "table" ? (
        <TableView
          rows={rows}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          hoverRow={hoverRow}
          setHoverRow={setHoverRow}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onOpen={(p) => router.push(`/prospect/${p.id}`)}
          menuItems={rowActions.menu}
          onSourceClick={handleSourceClick}
          sortBy={sortBy}
          sortDir={sortDir}
          onHeaderSort={handleHeaderSort}
        />
      ) : (
        <CompactView
          rows={rows}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          hoverRow={hoverRow}
          setHoverRow={setHoverRow}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onOpen={(p) => router.push(`/prospect/${p.id}`)}
          menuItems={rowActions.menu}
          onSourceClick={handleSourceClick}
          sortBy={sortBy}
          sortDir={sortDir}
          onHeaderSort={handleHeaderSort}
        />
      )}

      <ProspectCreateDialog open={showCreate} onOpenChange={setShowCreate} />
      <ProspectImportDialog open={showImport} onOpenChange={setShowImport} />
      <PipelineSettingsModal
        open={showPipelineSettings}
        onOpenChange={(open) => {
          setShowPipelineSettings(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["prospect-statuses"] });
            queryClient.invalidateQueries({ queryKey: ["prospects-funnel"] });
            queryClient.invalidateQueries({ queryKey: ["prospects-v2"] });
          }
        }}
      />
      {rowActions.dialogs}
    </div>
  );
}


/* ============================================================
   Table view (default, dense rows)
   ============================================================ */

interface ViewProps {
  rows: Prospect[];
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  toggleAll: () => void;
  hoverRow: string | null;
  setHoverRow: (id: string | null) => void;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  onOpen: (p: Prospect) => void;
  menuItems: (p: Prospect) => ProspectMenuItem[];
  onSourceClick: (src: string, list: string | null) => void;
  sortBy: ProspectSortKey;
  sortDir: SortDir;
  onHeaderSort: (key: ProspectSortKey) => void;
}

function TableView({
  rows,
  selected,
  toggleSelect,
  toggleAll,
  hoverRow,
  setHoverRow,
  openMenu,
  setOpenMenu,
  onOpen,
  menuItems,
  onSourceClick,
  sortBy,
  sortDir,
  onHeaderSort,
}: ViewProps) {
  const allSelected =
    rows.length > 0 && rows.every((p) => selected.has(p.id));
  const someSelected =
    rows.length > 0 && !allSelected && rows.some((p) => selected.has(p.id));

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-xl border bg-card">
      <table className="w-full table-fixed border-collapse text-[13.5px]">
        <thead>
          <tr>
            <th className="h-[38px] w-[42px] border-b bg-muted/40 pl-3.5 align-middle">
              <Checkbox
                checked={
                  rows.length === 0
                    ? false
                    : allSelected
                      ? true
                      : someSelected
                        ? "indeterminate"
                        : false
                }
                onCheckedChange={() => toggleAll()}
              />
            </th>
            <SortableTh sortKey="alpha" sortBy={sortBy} sortDir={sortDir} onSort={onHeaderSort}>
              Prospect
            </SortableTh>
            <SortableTh className="w-[118px]" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={onHeaderSort}>
              Statut pipeline
            </SortableTh>
            <SortableTh className="w-[108px]" sortKey="source" sortBy={sortBy} sortDir={sortDir} onSort={onHeaderSort}>
              Source
            </SortableTh>
            <SortableTh className="w-[132px]" sortKey="lastActivity" sortBy={sortBy} sortDir={sortDir} onSort={onHeaderSort}>
              Dernière activité
            </SortableTh>
            {SHOW_WORKFLOWS && <ProTh className="w-[148px]">Workflow</ProTh>}
            <ProTh className="w-[72px]">Canaux</ProTh>
            <ProTh className="w-[108px]" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <ProspectRow
              key={p.id}
              p={p}
              rowCount={rows.length}
              rowIndex={i}
              selected={selected.has(p.id)}
              toggle={() => toggleSelect(p.id)}
              hovered={hoverRow === p.id}
              onHover={(h) => setHoverRow(h ? p.id : null)}
              menuOpen={openMenu === p.id}
              setMenu={(open) => setOpenMenu(open ? p.id : null)}
              listName={p.bdd_name ?? null}
              onOpen={() => onOpen(p)}
              menuItems={menuItems(p)}
              onSourceClick={onSourceClick}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Aucun prospect.
        </div>
      )}
      <div className="flex items-center justify-between border-t px-6 py-2.5 text-xs text-muted-foreground">
        <span>{rows.length} prospects · Page 1 sur 1</span>
        <div />
      </div>
    </div>
  );
}

function ProTh({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "h-[38px] border-b bg-muted/40 px-3.5 text-left align-middle text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Clickable header that sorts the (client-side) prospect list asc/desc. */
function SortableTh({
  children,
  sortKey,
  sortBy,
  sortDir,
  onSort,
  className = "",
}: {
  children: React.ReactNode;
  sortKey: ProspectSortKey;
  sortBy: ProspectSortKey;
  sortDir: SortDir;
  onSort: (key: ProspectSortKey) => void;
  className?: string;
}) {
  const active = sortBy === sortKey;
  return (
    <th
      className={cn(
        "h-[38px] border-b bg-muted/40 px-3.5 text-left align-middle",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-mx-1 inline-flex select-none items-center gap-1 rounded px-1 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

interface RowProps {
  p: Prospect;
  rowCount: number;
  rowIndex: number;
  selected: boolean;
  toggle: () => void;
  hovered: boolean;
  onHover: (h: boolean) => void;
  menuOpen: boolean;
  setMenu: (open: boolean) => void;
  listName: string | null;
  onOpen: () => void;
  menuItems: ProspectMenuItem[];
  onSourceClick: (src: string, list: string | null) => void;
}

function ProspectRow({
  p,
  rowCount,
  rowIndex,
  selected,
  toggle,
  hovered,
  onHover,
  menuOpen,
  setMenu,
  listName,
  onOpen,
  menuItems,
  onSourceClick,
}: RowProps) {
  const activityLabel = lastActivityLabel(p);
  const tier = silenceTier(activityLabel);
  const tCls = silenceTierClasses(tier);
  const channels = channelKindsFor(p);
  const rowEdge = rowIndex !== rowCount - 1;

  return (
    <tr
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button,a,[data-stop]"))
          return;
        onOpen();
      }}
      className={cn(
        "cursor-pointer transition-colors",
        rowEdge && "border-b",
        selected
          ? "bg-[#E8F0FD] dark:bg-blue-950/55"
          : "hover:bg-muted/40",
      )}
    >
      {/* Dedicated selection column. The td gets an explicit width so the
          click-to-open handler on the row never fires when a user nudges the
          checkbox by a pixel — the "miss zone" between the checkbox and the
          next cell used to open the prospect detail. */}
      <td
        className="w-10 py-3.5 pl-3.5 pr-2"
        onClick={(e) => e.stopPropagation()}
      >
        <label
          className="flex h-9 w-9 cursor-pointer items-center justify-center -m-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => toggle()}
          />
        </label>
      </td>
      <td className="max-w-0 p-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <NameAvatar
            name={p.full_name ?? "?"}
            size={34}
            photo={prospectPhoto(p)}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {p.full_name ?? "Sans nom"}
            </div>
            <div
              className="mt-0.5 truncate text-xs text-muted-foreground"
              title={
                [p.job_title, p.company].filter(Boolean).join(" · ") ||
                undefined
              }
            >
              {p.job_title ? extractCleanRole(p.job_title) : "—"}
              {p.company ? ` · ${p.company}` : ""}
            </div>
          </div>
        </div>
      </td>
      <td className="max-w-0 p-3.5">
        <StatusPill status={p.status} />
      </td>
      <td className="max-w-0 p-3.5">
        <SourcePill
          source={p.source}
          list={listName}
          importedAt={p.created_at}
          onClick={onSourceClick}
        />
      </td>
      <td className="max-w-0 overflow-hidden p-3.5">
        {tier ? (
          <span
            className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-md px-2 py-0.5 text-[12.5px] font-medium ${tCls.bg} ${tCls.text}`}
            title={activityLabel}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tCls.dot}`} />
            <span className="truncate">{activityLabel}</span>
          </span>
        ) : (
          <span
            className="block truncate text-[12.5px] text-muted-foreground"
            title={activityLabel}
          >
            {activityLabel}
          </span>
        )}
      </td>
      {SHOW_WORKFLOWS && (
        <td className="max-w-0 overflow-hidden p-3.5">
          {p.workflow ? (
            <span
              data-stop
              className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md bg-violet-50 px-2 py-0.5 text-[12px] font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
              title={`${p.workflow.name} · ${p.workflow.step}/${p.workflow.total}`}
            >
              <Play className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">
                {p.workflow.name} · {p.workflow.step}/{p.workflow.total}
              </span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </td>
      )}
      <td className="w-[72px] p-3.5">
        <div data-stop className="flex gap-1">
          {channels.length === 0 ? (
            <span className="text-xs text-muted-foreground/50">—</span>
          ) : (
            channels.map((c) => <ChannelTooltipDot key={c} kind={c} size={22} />)
          )}
        </div>
      </td>
      <td className="relative w-[108px] p-3.5 text-right align-middle">
        <div data-stop className="inline-flex items-center justify-end gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenu(!menuOpen);
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
              menuOpen ? "bg-accent" : ""
            } text-muted-foreground hover:bg-accent`}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
        {menuOpen && (
          <RowMenu items={menuItems} close={() => setMenu(false)} />
        )}
      </td>
    </tr>
  );
}


function RowMenu({
  items,
  close,
}: {
  items: ProspectMenuItem[];
  close: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-3 top-10 z-25 w-[220px] rounded-xl border border-border bg-popover p-1 shadow-lg"
    >
      {items.map((it, i, arr) => (
        <div key={it.label}>
          {it.destructive && i > 0 && !arr[i - 1].destructive && (
            <div className="my-1 h-px bg-border" />
          )}
          <button
            type="button"
            onClick={() => {
              if (!it.disabled) {
                it.onClick();
                close();
              }
            }}
            disabled={it.disabled}
            className={`block w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent ${
              it.destructive ? "text-destructive" : ""
            } ${it.disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {it.label}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Compact view — denser, single-line rows
   ============================================================ */

function CompactView({
  rows,
  selected,
  toggleSelect,
  toggleAll,
  hoverRow: _hoverRow,
  setHoverRow,
  openMenu,
  setOpenMenu,
  onOpen,
  menuItems,
  onSourceClick,
}: ViewProps) {
  const allSelected =
    rows.length > 0 && rows.every((p) => selected.has(p.id));
  const someSelected =
    rows.length > 0 && !allSelected && rows.some((p) => selected.has(p.id));

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="min-w-[820px]">
      <div
        className={cn(
          "grid h-[38px] items-center gap-3 border-b bg-muted/40 px-3.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground",
          COMPACT_GRID_COLS,
        )}
      >
        <Checkbox
          checked={
            rows.length === 0
              ? false
              : allSelected
                ? true
                : someSelected
                  ? "indeterminate"
                  : false
          }
          onCheckedChange={() => toggleAll()}
        />
        <span>Prospect</span>
        <span>Statut</span>
        <span>Source</span>
        <span>Activité</span>
        {SHOW_WORKFLOWS && <span>Workflow</span>}
        <span>Canaux</span>
        <span />
      </div>
      {rows.map((p, i) => {
        const activityLabel = lastActivityLabel(p);
        const tier = silenceTier(activityLabel);
        const tCls = silenceTierClasses(tier);
        const channels = channelKindsFor(p);
        const listName = p.bdd_name ?? null;
        const isSel = selected.has(p.id);
        const rowEdge = i !== rows.length - 1;
        return (
          <div
            key={p.id}
            onMouseEnter={() => setHoverRow(p.id)}
            onMouseLeave={() => setHoverRow(null)}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button,a,[data-stop]"))
                return;
              onOpen(p);
            }}
            className={cn(
              "grid cursor-pointer items-center gap-3 px-3.5 py-2 text-[13.5px] transition-colors",
              COMPACT_GRID_COLS,
              rowEdge && "border-b",
              isSel
                ? "bg-[#E8F0FD] dark:bg-blue-950/55"
                : "hover:bg-muted/40",
            )}
          >
            <div
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSel}
                onCheckedChange={() => toggleSelect(p.id)}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <NameAvatar
                name={p.full_name ?? "?"}
                size={24}
                photo={prospectPhoto(p)}
              />
              <span className="whitespace-nowrap font-medium">
                {p.full_name ?? "Sans nom"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-[11.5px] text-muted-foreground">
                {p.company ?? "Sans société"}
              </span>
            </div>
            <StatusPill status={p.status} />
            <SourcePill
              source={p.source}
              list={listName}
              importedAt={p.created_at}
              onClick={onSourceClick}
            />
            <span
              className={`inline-flex items-center gap-1.5 text-[11.5px] ${tier ? `font-medium ${tCls.text}` : "text-muted-foreground"}`}
            >
              {tier && <span className={`h-1 w-1 rounded-full ${tCls.dot}`} />}
              {activityLabel}
            </span>
            {SHOW_WORKFLOWS && (
              <span
                className={`truncate text-[11.5px] ${p.workflow ? "font-medium text-violet-700 dark:text-violet-300" : "text-muted-foreground/50"}`}
                title={
                  p.workflow
                    ? `${p.workflow.name} · ${p.workflow.step}/${p.workflow.total}`
                    : undefined
                }
              >
                {p.workflow
                  ? `${p.workflow.name} · ${p.workflow.step}/${p.workflow.total}`
                  : "—"}
              </span>
            )}
            <div data-stop className="flex gap-0.5">
              {channels.length === 0 ? (
                <span className="text-[11px] text-muted-foreground/50">—</span>
              ) : (
                channels.map((c) => (
                  <ChannelTooltipDot key={c} kind={c} size={18} />
                ))
              )}
            </div>
            <div data-stop className="relative flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(openMenu === p.id ? null : p.id);
                }}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                  openMenu === p.id ? "bg-accent" : ""
                } text-muted-foreground hover:bg-accent`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {openMenu === p.id && (
                <RowMenu
                  items={menuItems(p)}
                  close={() => setOpenMenu(null)}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="border-t border-border px-3.5 py-2 text-[11.5px] text-muted-foreground">
        {rows.length} prospects · Vue compact
      </div>
      </div>
    </div>
  );
}

/* ============================================================
   First-run empty state
   ============================================================ */

export function ProspectsEmpty() {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-6">
        <div>
          <p className="m-0 text-[13px] text-muted-foreground">
            Aucun prospect pour le moment
          </p>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 pb-14 pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[540px] w-[540px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(0,82,217,0.10), rgba(0,82,217,0) 65%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <div className="mb-2.5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0a66c2] text-2xl font-extrabold text-white shadow-lg">
              in
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-2xl font-extrabold text-white shadow-lg">
              A
            </div>
          </div>
          <div className="text-[24px] font-semibold tracking-tight">
            Bienvenue dans Andoxa
          </div>
          <p className="m-0 mt-1 max-w-[480px] text-sm leading-relaxed text-muted-foreground">
            Andoxa importe vos prospects directement depuis LinkedIn grâce à
            notre extension Chrome. Installez-la pour démarrer en un clic.
          </p>
          <div className="mt-9 grid w-full max-w-[760px] grid-cols-3 gap-3.5">
            {[
              {
                n: "1",
                title: "Installez l'extension",
                body: "Ajoutez Andoxa à Chrome — 30 secondes.",
              },
              {
                n: "2",
                title: "Ouvrez LinkedIn",
                body: "Lancez une recherche ou ouvrez un profil.",
              },
              {
                n: "3",
                title: "Cliquez sur Andoxa",
                body: "Choisissez une liste et nous enrichissons le prospect automatiquement.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    {s.n}
                  </span>
                  <span className="text-[13px] font-semibold">{s.title}</span>
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  {s.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

