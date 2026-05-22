"use client";

/**
 * CRM v2 — Listes tab.
 *
 * Visual reference: design/CRM/crm-tab-listes.jsx.
 *
 * Data wiring:
 *   • GET /api/bdd?... — paginated lists (id, name, source, proprietaire,
 *     created_at, prospects_count, phones_count).
 *   • DELETE /api/bdd/:id — list deletion (existing endpoint).
 *
 * Funnel stats per list (contacted / rdv / signed counts) and the
 * weekly delta arrow are stubbed to 0 here — they require an aggregate
 * endpoint that is documented in CRM_BACKEND_TODO.md.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  Filter,
  ChevronDown,
  Check,
  Upload,
  Megaphone,
  MoreVertical,
  ArrowRight,
  Trash2,
  Users,
  Pencil,
  Download,
  ArrowUp,
  Layers,
  List as ListIcon,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProspectImportDialog } from "@/components/crm/prospect-import-dialog";
import {
  NameAvatar,
  SectionTitle,
  Surface,
  StatusPill,
  getSourceConfig,
} from "./crm-shared";
import type { BddRow } from "./crm-table";

/* ============================================================
   Types
   ============================================================ */

interface BddApiResponse {
  items: BddRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

type Scope = "all" | "mine" | "team";
type SortBy = "recent" | "conversion" | "volume" | "alpha";

interface ListesFilterState {
  source: string[];
  proprietaire: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

// Mirror of the canonical source list (see docs/TAGS_AUDIT.md §3).
const SOURCE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "linkedin_extension", label: "LinkedIn" },
  { value: "csv", label: "Import CSV" },
  { value: "xlsx", label: "Import Excel" },
  { value: "manual", label: "Manuel" },
  { value: "booking", label: "Booking" },
];

interface ListesTabProps {
  workspaceId: string | null;
  currentUserId?: string | null;
  memberNames: Map<string, string>;
  memberAvatars?: Map<string, string | null>;
  onSelectList: (bddId: string) => void;
}

/* ============================================================
   Helpers
   ============================================================ */

function fr(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function relAgo(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (days === 0) return "aujourd’hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} ans`;
}

/** Funnel stats — read from the API (CRM-1). Stages are interpreted
 *  cumulatively: `contacted` includes everyone past `new`, `rdv`
 *  includes everyone past `qualified`, `signed` is `won`. */
function funnelStatsFor(list: BddRow): {
  count: number;
  contacted: number;
  rdv: number;
  signed: number;
  convRate: number;
  delta: number | null;
} {
  const count = list.prospects_count ?? 0;
  const contacted = list.contacted_count ?? 0;
  const rdv = list.rdv_count ?? 0;
  const signed = list.signed_count ?? 0;
  const convRate = count > 0 ? (signed / count) * 100 : 0;
  const delta =
    list.delta_7d && list.delta_7d > 0 ? list.delta_7d : null;
  return { count, contacted, rdv, signed, convRate, delta };
}

/* ============================================================
   Listes tab
   ============================================================ */

export function ListesTab({
  workspaceId,
  currentUserId,
  memberNames,
  memberAvatars,
  onSelectList,
}: ListesTabProps) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [openList, setOpenList] = useState<BddRow | null>(null);
  const [bddToDelete, setBddToDelete] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [filters, setFilters] = useState<ListesFilterState>({
    source: [],
    proprietaire: null,
    dateFrom: null,
    dateTo: null,
  });

  /* ---------- queries ---------- */
  const { data: bddData } = useQuery({
    queryKey: ["bdd", "listes-v2", workspaceId, search, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (filters.source.length > 0)
        params.set("source", filters.source.join(","));
      if (filters.proprietaire) params.set("proprietaire", filters.proprietaire);
      if (filters.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters.dateTo) params.set("date_to", filters.dateTo);
      const res = await fetch(`/api/bdd?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as BddApiResponse;
    },
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });

  const items = bddData?.items ?? [];

  /* ---------- mutations ---------- */
  const deleteBddMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bdd/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bdd"] });
      toast.success("Liste supprimée");
    },
    onError: () => toast.error("Impossible de supprimer la liste"),
  });

  const renameBddMutation = useMutation({
    mutationFn: async (vars: { id: string; name: string }) => {
      const res = await fetch(`/api/bdd/${vars.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: vars.name }),
      });
      if (res.status === 409) throw new Error("Une liste avec ce nom existe déjà");
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bdd"] });
      toast.success("Liste renommée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** CRM-list export — pulls every non-deleted prospect of the list and
   *  builds a CSV the browser downloads. No server endpoint needed. */
  const exportListAsCsv = async (id: string, name: string) => {
    const params = new URLSearchParams({
      bdd_id: id,
      page: "1",
      pageSize: "5000",
    });
    const res = await fetch(`/api/prospects?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Export impossible");
      return;
    }
    const json = await res.json();
    const items = ((json.data ?? json) as { items: unknown[] }).items as Array<{
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      job_title?: string | null;
      linkedin?: string | null;
      status?: string | null;
      created_at?: string | null;
    }>;
    const escape = (v: string | null | undefined) => {
      const s = (v ?? "").replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const headers = [
      "full_name",
      "email",
      "phone",
      "company",
      "job_title",
      "linkedin",
      "status",
      "created_at",
    ];
    const lines = [headers.join(",")];
    for (const p of items) {
      lines.push(
        headers
          .map((h) => escape(p[h as keyof typeof p] as string | null | undefined))
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^\w-]+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${items.length} prospect${items.length > 1 ? "s" : ""} exporté${items.length > 1 ? "s" : ""}`);
  };

  const handleRename = (id: string, current: string) => {
    const next =
      typeof window !== "undefined"
        ? window.prompt("Nouveau nom de la liste", current)
        : null;
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return;
    renameBddMutation.mutate({ id, name: trimmed });
  };

  /* ---------- derived ---------- */
  const filtered = useMemo(() => {
    let list = items.filter((l) => {
      if (scope === "mine" && l.proprietaire !== currentUserId) return false;
      if (scope === "team" && l.proprietaire === currentUserId) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (sortBy === "alpha") return a.name.localeCompare(b.name);
      if (sortBy === "volume")
        return (b.prospects_count ?? 0) - (a.prospects_count ?? 0);
      if (sortBy === "conversion") {
        const rateA =
          (a.signed_count ?? 0) / Math.max(1, a.prospects_count ?? 0);
        const rateB =
          (b.signed_count ?? 0) / Math.max(1, b.prospects_count ?? 0);
        return rateB - rateA;
      }
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [items, scope, sortBy, currentUserId]);

  const avgConv = useMemo(() => {
    if (items.length === 0) return 0;
    const rates = items.map((l) => funnelStatsFor(l).convRate);
    return rates.reduce((s, r) => s + r, 0) / rates.length;
  }, [items]);

  const totalLists = items.length;

  /* ---------- render ---------- */
  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:gap-6">
        <div className="min-w-0">
          <p className="m-0 text-[13px] text-muted-foreground">
            {totalLists} session{totalLists > 1 ? "s" : ""} de prospection · La
            plupart proviennent de l’extension Chrome Andoxa
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-background px-3 py-1.5 text-[13px] font-medium text-primary shadow-sm transition-colors hover:bg-accent dark:border-primary/45"
          onClick={() => setShowImport(true)}
        >
          <Upload className="h-3.5 w-3.5" />
          Importer un CSV
        </button>
      </div>

      {/* Action bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 sm:w-[360px] sm:max-w-full">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une liste…"
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Scope pills */}
        <div className="inline-flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
          {(
            [
              ["all", "Toutes"],
              ["mine", "Mes listes"],
              ["team", "Listes équipe"],
            ] as const
          ).map(([id, lbl]) => {
            const active = scope === id;
            return (
              <button
                key={id}
                onClick={() => setScope(id)}
                className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lbl}
              </button>
            );
          })}
        </div>

        {/* Filtres */}
        <div className="relative">
          <button
            onClick={() => {
              setFiltersOpen((o) => !o);
              setSortOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium ${
              filtersOpen ? "bg-accent" : "bg-card"
            }`}
          >
            <Filter className="h-3 w-3" />
            Filtres
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
          {filtersOpen && (
            <FiltersPopover
              filters={filters}
              onChange={setFilters}
              members={[...memberNames.entries()].map(([id, name]) => ({
                id,
                name,
              }))}
              onClose={() => setFiltersOpen(false)}
            />
          )}
        </div>

        <div className="flex-1" />

        {/* Tri */}
        <div className="relative">
          <button
            onClick={() => {
              setSortOpen((o) => !o);
              setFiltersOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium ${
              sortOpen ? "bg-accent" : "bg-card"
            }`}
          >
            <Layers className="h-3 w-3" />
            Trier
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-lg border border-border bg-popover p-1.5 shadow-lg">
              {(
                [
                  ["recent", "Plus récente"],
                  ["conversion", "Plus performante"],
                  ["volume", "Plus de prospects"],
                  ["alpha", "Alphabétique"],
                ] as const
              ).map(([id, label]) => (
                <div
                  key={id}
                  onClick={() => {
                    setSortBy(id);
                    setSortOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[12.5px] ${
                    sortBy === id
                      ? "bg-accent font-semibold text-blue-700"
                      : "text-foreground hover:bg-accent/50"
                  }`}
                >
                  {label}
                  {sortBy === id && <Check className="h-3 w-3" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[1080px] table-fixed border-collapse">
          <colgroup>
            <col />
            <col className="w-[130px]" />
            <col className="w-[90px]" />
            <col className="w-[280px]" />
            <col className="w-[90px]" />
            <col className="w-[110px]" />
            <col className="w-[90px]" />
            <col className="w-[220px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <Th>Liste</Th>
              <Th>Source</Th>
              <Th>Volume</Th>
              <Th>Funnel</Th>
              <Th>Conv.</Th>
              <Th>Auteur</Th>
              <Th>Date</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <ListRow
                key={l.id}
                l={l}
                avgConv={avgConv}
                memberNames={memberNames}
                memberAvatars={memberAvatars}
                menuOpen={menuId === l.id}
                setMenu={setMenuId}
                onOpen={() => setOpenList(l)}
                onSelect={() => onSelectList(l.id)}
                onAskDelete={() => setBddToDelete(l.id)}
                onRename={() => handleRename(l.id, l.name)}
                onExport={() => void exportListAsCsv(l.id, l.name)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="text-sm font-medium text-foreground">
            Aucune liste trouvée
          </div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">
            {search
              ? `Aucun résultat pour « ${search} »`
              : "Ajustez les filtres pour voir plus de listes"}
          </div>
        </div>
      )}

      {/* Side panel */}
      {openList && (
        <ListDetailPanel
          list={openList}
          onClose={() => setOpenList(null)}
          memberNames={memberNames}
          onOpenProspects={(id) => {
            setOpenList(null);
            onSelectList(id);
          }}
          onAskDelete={() => {
            setBddToDelete(openList.id);
            setOpenList(null);
          }}
        />
      )}

      {/* Click-outside backdrop for menus */}
      {(filtersOpen || sortOpen || menuId) && (
        <div
          onClick={() => {
            setFiltersOpen(false);
            setSortOpen(false);
            setMenuId(null);
          }}
          className="fixed inset-0 z-[5]"
        />
      )}

      <ConfirmDialog
        open={!!bddToDelete}
        onOpenChange={(open) => {
          if (!open) setBddToDelete(null);
        }}
        title="Supprimer cette liste ?"
        description="Les prospects associés seront conservés."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          if (bddToDelete) deleteBddMutation.mutate(bddToDelete);
          setBddToDelete(null);
        }}
      />
      <ProspectImportDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}

interface ListRowProps {
  l: BddRow;
  avgConv: number;
  memberNames: Map<string, string>;
  memberAvatars?: Map<string, string | null>;
  menuOpen: boolean;
  setMenu: (id: string | null) => void;
  onOpen: () => void;
  onSelect: () => void;
  onAskDelete: () => void;
  onRename: () => void;
  onExport: () => void;
}

function ListRow({
  l,
  avgConv,
  memberNames,
  memberAvatars,
  menuOpen,
  setMenu,
  onOpen,
  onSelect,
  onAskDelete,
  onRename,
  onExport,
}: ListRowProps) {
  const cfg = getSourceConfig(l.source);
  const SrcIcon = cfg.icon;
  const stats = funnelStatsFor(l);
  const perf =
    stats.convRate > avgConv * 1.1
      ? "good"
      : stats.convRate < avgConv * 0.9
        ? "low"
        : "avg";
  const perfLabel = perf === "good" ? "Bon" : perf === "low" ? "Faible" : "Moyen";
  const perfClass =
    perf === "good"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
      : perf === "low"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
        : "bg-muted text-muted-foreground";
  const perfArrow = perf === "good" ? "▲" : perf === "low" ? "▼" : "·";

  const segs = [
    { n: stats.count, label: "imp.", c: "bg-slate-300" },
    { n: stats.contacted, label: "cont.", c: "bg-blue-500" },
    { n: stats.rdv, label: "RDV", c: "bg-emerald-500" },
    { n: stats.signed, label: "signé", c: "bg-green-600" },
  ];
  const sumAll = segs.reduce((a, s) => a + s.n, 0) || 1;

  const authorName = l.proprietaire
    ? (memberNames.get(l.proprietaire) ?? l.proprietaire)
    : "—";

  return (
    <tr
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button,a,[data-stop]")) return;
        onOpen();
      }}
      className="h-20 cursor-pointer border-b border-border/60 hover:bg-muted/30"
    >
      {/* Liste */}
      <td className="px-3.5 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.tint}`}
          >
            <SrcIcon className={`h-4 w-4 ${cfg.iconColor}`} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold">{l.name}</div>
            {l.query ? (
              <div
                className="mt-0.5 truncate text-[11.5px] text-muted-foreground"
                title={l.query}
              >
                « {l.query} »
              </div>
            ) : (
              <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/60 italic">
                Pas de requête associée
              </div>
            )}
          </div>
        </div>
      </td>
      {/* Source */}
      <td className="px-3.5 py-3 align-middle">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${cfg.tint} ${cfg.iconColor}`}
        >
          <SrcIcon className="h-2.5 w-2.5" />
          {cfg.short}
        </span>
      </td>
      {/* Volume */}
      <td className="px-3.5 py-3 align-middle">
        <div className="text-[13.5px] font-semibold">{stats.count}</div>
        {stats.delta ? (
          <div className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
            <ArrowUp className="h-2 w-2" />+{stats.delta} cette sem.
          </div>
        ) : (
          <div className="mt-0.5 text-[11px] text-muted-foreground">prospects</div>
        )}
      </td>
      {/* Funnel */}
      <td className="px-3.5 py-3 align-middle">
        <div
          className="flex h-2 overflow-hidden rounded-md"
          title={`${stats.count} importés → ${stats.contacted} contactés → ${stats.rdv} RDV → ${stats.signed} signés`}
        >
          {segs.map((s, i) => (
            <div
              key={i}
              className={`${s.c} ${i < 3 ? "border-r border-card" : ""}`}
              style={{
                width: `${(s.n / sumAll) * 100}%`,
                minWidth: s.n > 0 ? 3 : 0,
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>
            <b className="font-semibold text-foreground">{stats.count}</b> imp.
          </span>
          <span className="text-border">·</span>
          <span>
            <b className="font-semibold text-foreground">{stats.contacted}</b> cont.
          </span>
          <span className="text-border">·</span>
          <span>
            <b className="font-semibold text-foreground">{stats.rdv}</b> RDV
          </span>
          <span className="text-border">·</span>
          <span>
            <b className="font-semibold text-foreground">{stats.signed}</b> signé
            {stats.signed > 1 ? "s" : ""}
          </span>
        </div>
      </td>
      {/* Conversion */}
      <td className="px-3.5 py-3 align-middle">
        <div className="text-[13.5px] font-semibold">
          {Math.round(stats.convRate)}%
        </div>
        <div
          className={`mt-0.5 inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[10.5px] font-medium ${perfClass}`}
        >
          <span>{perfArrow}</span>
          {perfLabel}
        </div>
      </td>
      {/* Auteur */}
      <td className="px-3.5 py-3 align-middle">
        <div className="flex items-center gap-2">
          <NameAvatar
            name={authorName}
            size={22}
            photo={
              l.proprietaire
                ? (memberAvatars?.get(l.proprietaire) ?? null)
                : null
            }
          />
          <span className="text-[12.5px] text-muted-foreground">
            {authorName.split(" ")[0]}
          </span>
        </div>
      </td>
      {/* Date */}
      <td className="px-3.5 py-3 align-middle">
        <div className="text-xs text-muted-foreground">
          {relAgo(l.created_at)}
        </div>
      </td>
      {/* Actions */}
      <td className="relative px-3.5 py-3 text-right align-middle">
        <div data-stop className="inline-flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-background px-2.5 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-accent dark:border-primary/45"
          >
            <Megaphone className="h-2.5 w-2.5" />
            Lancer une campagne
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenu(menuOpen ? null : l.id);
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
              menuOpen ? "bg-accent" : ""
            } text-muted-foreground hover:bg-accent`}
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3.5 top-12 z-25 w-[220px] rounded-xl border border-border bg-popover p-1 text-left shadow-lg"
          >
            <MenuItem
              icon={Users}
              onClick={() => {
                onSelect();
                setMenu(null);
              }}
            >
              Voir les prospects
            </MenuItem>
            <MenuItem
              icon={Pencil}
              onClick={() => {
                onRename();
                setMenu(null);
              }}
            >
              Renommer la liste
            </MenuItem>
            <MenuItem
              icon={Download}
              onClick={() => {
                onExport();
                setMenu(null);
              }}
            >
              Exporter en CSV
            </MenuItem>
            <div className="my-1 h-px bg-border" />
            <MenuItem
              icon={Trash2}
              onClick={onAskDelete}
              className="text-destructive"
            >
              Supprimer la liste
            </MenuItem>
          </div>
        )}
      </td>
    </tr>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] hover:bg-accent ${className}`}
    >
      <Icon className="h-3 w-3 opacity-70" />
      {children}
    </div>
  );
}

/* ============================================================
   Side panel
   ============================================================ */

function ListDetailPanel({
  list,
  onClose,
  memberNames,
  onOpenProspects,
  onAskDelete,
}: {
  list: BddRow;
  onClose: () => void;
  memberNames: Map<string, string>;
  onOpenProspects: (id: string) => void;
  onAskDelete: () => void;
}) {
  const cfg = getSourceConfig(list.source);
  const SrcIcon = cfg.icon;
  const stats = funnelStatsFor(list);
  const convRate = Math.round(stats.convRate);
  const authorName = list.proprietaire
    ? (memberNames.get(list.proprietaire) ?? list.proprietaire)
    : "—";

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-modal bg-black/30"
        style={{ animation: "andoxaFadeIn 180ms ease-out" }}
      />
      <div
        className="fixed bottom-0 right-0 top-0 z-modal flex w-full max-w-[100vw] flex-col bg-background shadow-2xl sm:w-[480px]"
        style={{ animation: "andoxaSlideIn 220ms cubic-bezier(.2,.8,.2,1)" }}
      >
        <style>{`
          @keyframes andoxaSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes andoxaFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        {/* Header */}
        <div className="border-b border-border bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cfg.tint}`}
            >
              <SrcIcon className={`h-[18px] w-[18px] ${cfg.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold tracking-tight">
                {list.name}
              </div>
              {list.query ? (
                <div
                  className="mt-0.5 text-[11.5px] text-muted-foreground"
                  title={list.query}
                >
                  « {list.query} »
                </div>
              ) : (
                <div className="mt-0.5 text-[11.5px] italic text-muted-foreground/60">
                  Pas de requête associée
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <SectionTitle>Performance</SectionTitle>
          <Surface padding="p-4" className="mb-4">
            <FunnelLarge stats={stats} />
            <div className="mt-3.5 grid grid-cols-4 gap-2">
              {[
                { label: "Importés", n: stats.count, c: "text-slate-500" },
                { label: "Contactés", n: stats.contacted, c: "text-blue-500" },
                { label: "RDV", n: stats.rdv, c: "text-emerald-500" },
                { label: "Signés", n: stats.signed, c: "text-green-600" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg bg-muted/50 px-2.5 py-2"
                >
                  <div
                    className={`text-lg font-semibold tracking-tight ${s.c}`}
                  >
                    {s.n}
                  </div>
                  <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex items-baseline justify-between border-t border-border pt-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Taux de conversion
                </div>
                <div className="text-[22px] font-semibold tracking-tight text-blue-700">
                  {convRate}%
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Cycle moyen :{" "}
                <b className="font-semibold text-foreground">
                  {list.avg_cycle_days != null
                    ? `${list.avg_cycle_days} jour${list.avg_cycle_days > 1 ? "s" : ""}`
                    : "—"}
                </b>
              </div>
            </div>
          </Surface>

          <SectionTitle>Métadonnées</SectionTitle>
          <Surface padding="p-1" className="mb-4">
            <Meta
              label="Source"
              value={
                <>
                  <SrcIcon className={`h-3 w-3 ${cfg.iconColor}`} /> {cfg.label}
                </>
              }
            />
            <Meta
              label="Auteur"
              value={
                <>
                  <NameAvatar name={authorName} size={16} /> {authorName}
                </>
              }
            />
            <Meta
              label="Créée"
              value={`${relAgo(list.created_at)} · ${fr(list.created_at)}`}
            />
            <Meta
              label="Volume"
              value={`${stats.count} prospect${stats.count > 1 ? "s" : ""}`}
            />
            <Meta
              label="Requête"
              value={
                list.query ? (
                  <span className="italic text-muted-foreground" title={list.query}>
                    « {list.query} »
                  </span>
                ) : (
                  <span className="italic text-muted-foreground/60">
                    Non renseignée
                  </span>
                )
              }
              last
            />
          </Surface>

          <SectionTitle>Top prospects</SectionTitle>
          <TopProspectsCard
            bddId={list.id}
            totalCount={stats.count}
            onOpenAll={() => onOpenProspects(list.id)}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-border bg-card p-4">
          <button
            onClick={() => onOpenProspects(list.id)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-[13.5px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Megaphone className="h-3 w-3" />
            Lancer une campagne sur cette liste
          </button>
          <div className="flex gap-1.5">
            <FooterBtn icon={Users} onClick={() => onOpenProspects(list.id)}>
              Voir les prospects
            </FooterBtn>
            <FooterBtn icon={Pencil}>Renommer</FooterBtn>
            <FooterBtn icon={Download}>Exporter</FooterBtn>
          </div>
          <button
            onClick={onAskDelete}
            className="inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-destructive"
          >
            <Trash2 className="h-2.5 w-2.5" />
            Supprimer la liste
          </button>
        </div>
      </div>
    </>
  );
}

/* CRM-4 — Top prospects fetched from /api/prospects?bdd_id=... */
function TopProspectsCard({
  bddId,
  totalCount,
  onOpenAll,
}: {
  bddId: string;
  totalCount: number;
  onOpenAll: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["bdd-top-prospects", bddId],
    queryFn: async () => {
      const params = new URLSearchParams({
        bdd_id: bddId,
        page: "1",
        pageSize: "5",
      });
      const res = await fetch(`/api/prospects?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as {
        items: Array<{
          id: string;
          full_name: string | null;
          company: string | null;
          status: string | null;
        }>;
      };
    },
    enabled: !!bddId,
    staleTime: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <Surface padding="p-0" className="mb-4 overflow-hidden">
      {isLoading ? (
        <div className="px-3 py-4 text-center text-[12.5px] text-muted-foreground">
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="px-3 py-4 text-center text-[12.5px] text-muted-foreground">
          Aucun prospect rattaché à cette liste.
        </div>
      ) : (
        items.map((p, i) => (
          <Link
            key={p.id}
            href={`/prospect/${p.id}`}
            className={`flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30 ${i < items.length - 1 ? "border-b border-border/60" : ""}`}
          >
            <NameAvatar name={p.full_name ?? "?"} size={26} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-foreground">
                {p.full_name ?? "Sans nom"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {p.company ?? "—"}
              </div>
            </div>
            <StatusPill status={p.status} />
          </Link>
        ))
      )}
      <div className="border-t border-border bg-muted/30 px-3 py-2.5">
        <button
          onClick={onOpenAll}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"
        >
          Voir tous les {totalCount} prospects{" "}
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </Surface>
  );
}

function FooterBtn({
  icon: Icon,
  children,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground/80 hover:bg-accent"
    >
      <Icon className="h-2.5 w-2.5" />
      {children}
    </button>
  );
}

function FunnelLarge({
  stats,
}: {
  stats: { count: number; contacted: number; rdv: number; signed: number };
}) {
  const segs = [
    { n: stats.count, label: "Importés", c: "bg-slate-300" },
    { n: stats.contacted, label: "Contactés", c: "bg-blue-500" },
    { n: stats.rdv, label: "RDV", c: "bg-emerald-500" },
    { n: stats.signed, label: "Signés", c: "bg-green-600" },
  ];
  const max = Math.max(...segs.map((s) => s.n), 1);
  return (
    <div className="flex flex-col gap-2">
      {segs.map((s, i) => {
        const prev = i === 0 ? null : segs[i - 1].n;
        const ratio = prev ? Math.round((s.n / prev) * 100) : 100;
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-[70px] text-[11.5px] font-medium text-muted-foreground">
              {s.label}
            </div>
            <div className="relative h-[18px] flex-1 overflow-hidden rounded bg-muted">
              <div
                className={`h-full rounded ${s.c} transition-[width] duration-300`}
                style={{ width: `${(s.n / max) * 100}%` }}
              />
            </div>
            <div className="w-[50px] text-right text-xs font-semibold">
              {s.n}
            </div>
            <div className="w-[38px] text-right text-[10.5px] text-muted-foreground">
              {i === 0 ? "" : `${ratio}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Meta({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] ${
        !last ? "border-b border-border/60" : ""
      }`}
    >
      <div className="w-[90px] text-[11.5px] text-muted-foreground">{label}</div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
        {value}
      </div>
    </div>
  );
}

function FiltersPopover({
  filters,
  onChange,
  members,
  onClose,
}: {
  filters: ListesFilterState;
  onChange: (next: ListesFilterState) => void;
  members: { id: string; name: string }[];
  onClose: () => void;
}) {
  const toggleSource = (value: string) => {
    onChange({
      ...filters,
      source: filters.source.includes(value)
        ? filters.source.filter((s) => s !== value)
        : [...filters.source, value],
    });
  };
  const reset = () =>
    onChange({ source: [], proprietaire: null, dateFrom: null, dateTo: null });

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 top-[calc(100%+6px)] z-30 w-[340px] rounded-lg border border-border bg-popover p-3 shadow-lg"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold">Filtres</span>
        <button
          onClick={reset}
          className="text-[11.5px] font-medium text-blue-700"
        >
          Tout effacer
        </button>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11.5px] font-medium text-muted-foreground">
          Source
        </div>
        <div className="flex flex-wrap gap-1">
          {SOURCE_FILTER_OPTIONS.map((opt) => {
            const active = filters.source.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleSource(opt.value)}
                className={`rounded-md px-2 py-1 text-[11.5px] ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-foreground/80 hover:bg-muted/70"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11.5px] font-medium text-muted-foreground">
          Auteur
        </div>
        <div className="flex flex-wrap gap-1">
          {members.length === 0 && (
            <p className="text-[11.5px] text-muted-foreground">Aucun membre</p>
          )}
          {members.map((m) => {
            const active = filters.proprietaire === m.id;
            return (
              <button
                key={m.id}
                onClick={() =>
                  onChange({
                    ...filters,
                    proprietaire: active ? null : m.id,
                  })
                }
                className={`rounded-md px-2 py-1 text-[11.5px] ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-foreground/80 hover:bg-muted/70"
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-1.5">
        <div className="mb-1 text-[11.5px] font-medium text-muted-foreground">
          Date de création
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) =>
              onChange({ ...filters, dateFrom: e.target.value || null })
            }
            className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1 text-[11.5px]"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) =>
              onChange({ ...filters, dateTo: e.target.value || null })
            }
            className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1 text-[11.5px]"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={onClose}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Empty state — first-run experience for users without lists.
   ============================================================ */

export function ListesEmpty() {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-6">
        <div>
          <p className="m-0 text-[13px] text-muted-foreground">
            Aucune liste pour le moment
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
          <div className="mb-1 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ListIcon className="h-9 w-9" strokeWidth={1.6} />
          </div>
          <div className="text-[22px] font-semibold tracking-tight">
            Créez votre première liste
          </div>
          <p className="m-0 mt-1 max-w-[480px] text-sm leading-relaxed text-muted-foreground">
            Andoxa fonctionne avec une extension Chrome qui s’intègre à
            LinkedIn. Importez vos premiers prospects et la liste sera créée
            automatiquement.
          </p>
        </div>
      </div>
    </div>
  );
}

