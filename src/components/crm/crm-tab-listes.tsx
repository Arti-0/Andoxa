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

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  CalendarDays,
  ChevronDown,
  Upload,
  Megaphone,
  MoreVertical,
  ArrowRight,
  Trash2,
  Users,
  Pencil,
  Download,
  Phone,
  Loader2,
  List as ListIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ProspectImportDialog } from "@/components/crm/prospect-import-dialog";
import {
  NameAvatar,
  SectionTitle,
  Surface,
  StatusPill,
  getSourceConfig,
  CrmFilterButton,
  CrmFiltersLabel,
  CrmSourceDropdown,
  CrmSortDropdown,
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

type SortBy = "recent" | "conversion" | "volume" | "alpha";

const LISTES_SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: "recent", label: "Plus récente" },
  { id: "conversion", label: "Plus performante" },
  { id: "volume", label: "Plus de prospects" },
  { id: "alpha", label: "Alphabétique" },
];

interface ListesFilterState {
  source: string[];
  /** Author filter — multi-select, applied client-side over the loaded rows. */
  proprietaires: string[];
  dateFrom: string | null;
  dateTo: string | null;
}

interface ListesTabProps {
  workspaceId: string | null;
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

/**
 * Renders a list's origin mark: the real brand logo (LinkedIn / CSV / Andoxa
 * for manual …) when the source config provides one, else the lucide fallback.
 */
function SourceMark({
  source,
  size = 16,
}: {
  source: string | null | undefined;
  size?: number;
}) {
  const cfg = getSourceConfig(source);
  if (cfg.Logo) return <cfg.Logo size={size} className="shrink-0" />;
  const Icon = cfg.icon;
  return <Icon className={cfg.iconColor} style={{ width: size, height: size }} />;
}

/* ============================================================
   Listes tab
   ============================================================ */

export function ListesTab({
  workspaceId,
  memberNames,
  memberAvatars,
  onSelectList,
}: ListesTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Launch a campaign / call session on a list — deep-links to /campaigns with
  // the list preselected so we reuse the existing creation wizards instead of
  // duplicating their multi-step submit logic.
  const launchCampaign = (bddId: string) =>
    router.push(`/campaigns?new=campaign&bdd=${bddId}`);
  const launchCallSession = (bddId: string) =>
    router.push(`/campaigns?tab=sessions&new=session&bdd=${bddId}`);
  const [search, setSearch] = useState("");
  // Which filter dropdown is open (one at a time). Mirrors the campaign page:
  // an unclickable "Filtres" label followed by per-category dropdown pills.
  const [openFilter, setOpenFilter] = useState<
    "source" | "auteur" | "date" | "sort" | null
  >(null);
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [openList, setOpenList] = useState<BddRow | null>(null);
  const [bddToDelete, setBddToDelete] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<BddRow | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [filters, setFilters] = useState<ListesFilterState>({
    source: [],
    proprietaires: [],
    dateFrom: null,
    dateTo: null,
  });

  /* ---------- queries ---------- */
  // Author is filtered client-side, so it's excluded from the query key.
  const { data: bddData, isFetching: bddFetching } = useQuery({
    queryKey: [
      "bdd",
      "listes-v2",
      workspaceId,
      search,
      filters.source,
      filters.dateFrom,
      filters.dateTo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (filters.source.length > 0)
        params.set("source", filters.source.join(","));
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

  const handleRename = (list: BddRow) => setRenameTarget(list);

  /* ---------- derived ---------- */
  const filtered = useMemo(() => {
    const authors = filters.proprietaires;
    let list = items.filter((l) => {
      if (authors.length > 0 && !authors.includes(l.proprietaire ?? "")) {
        return false;
      }
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
  }, [items, sortBy, filters.proprietaires]);

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
          Importer une liste
        </button>
      </div>

      {/* Action bar — campaign-style: filters grouped left, search right. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Unclickable "Filtres" label, then one dropdown per category. */}
        <CrmFiltersLabel />

        <CrmSourceDropdown
          selected={filters.source}
          onChange={(v) => setFilters({ ...filters, source: v })}
          open={openFilter === "source"}
          onToggle={() =>
            setOpenFilter((o) => (o === "source" ? null : "source"))
          }
        />

        <AuteurFilterDropdown
          members={[...memberNames.entries()].map(([id, name]) => ({
            id,
            name,
            avatar: memberAvatars?.get(id) ?? null,
          }))}
          selected={filters.proprietaires}
          onChange={(v) => setFilters({ ...filters, proprietaires: v })}
          open={openFilter === "auteur"}
          onToggle={() =>
            setOpenFilter((o) => (o === "auteur" ? null : "auteur"))
          }
        />

        <DateFilterDropdown
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(from, to) =>
            setFilters({ ...filters, dateFrom: from, dateTo: to })
          }
          open={openFilter === "date"}
          onToggle={() => setOpenFilter((o) => (o === "date" ? null : "date"))}
        />

        <CrmSortDropdown
          options={LISTES_SORT_OPTIONS}
          value={sortBy}
          onChange={(id) => {
            setSortBy(id);
            setOpenFilter(null);
          }}
          open={openFilter === "sort"}
          onToggle={() => setOpenFilter((o) => (o === "sort" ? null : "sort"))}
        />

        {/* Search — right-aligned, campaign style */}
        <div className="relative ml-auto w-full min-w-[220px] sm:w-[300px]">
          {bddFetching ? (
            <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-blue-600" />
          ) : (
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          )}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une liste…"
            className="h-[34px] w-full rounded-lg border border-input bg-background pl-8 pr-8 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-[#0052D9]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
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
                onLaunchCampaign={() => launchCampaign(l.id)}
                onLaunchCallSession={() => launchCallSession(l.id)}
                onAskDelete={() => setBddToDelete(l.id)}
                onRename={() => handleRename(l)}
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
          onLaunchCampaign={() => launchCampaign(openList.id)}
          onLaunchCallSession={() => launchCallSession(openList.id)}
          onRename={() => {
            const target = openList;
            setOpenList(null);
            handleRename(target);
          }}
          onExport={() => void exportListAsCsv(openList.id, openList.name)}
          onAskDelete={() => {
            setBddToDelete(openList.id);
            setOpenList(null);
          }}
        />
      )}

      {/* Click-outside backdrop for menus */}
      {(openFilter || menuId) && (
        <div
          onClick={() => {
            setOpenFilter(null);
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
      {/* Listes view keeps the manual-add path (per product decision). */}
      <ProspectImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        showManual
      />

      <RenameListDialog
        list={renameTarget}
        onClose={() => setRenameTarget(null)}
        onConfirm={(id, name) => {
          renameBddMutation.mutate({ id, name });
          setRenameTarget(null);
        }}
      />
    </div>
  );
}

/** Focused rename dialog for lists — replaces window.prompt. */
function RenameListDialog({
  list,
  onClose,
  onConfirm,
}: {
  list: BddRow | null;
  onClose: () => void;
  onConfirm: (id: string, name: string) => void;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (list) setValue(list.name);
  }, [list]);

  const submit = () => {
    const trimmed = value.trim();
    if (!list || !trimmed || trimmed === list.name) {
      onClose();
      return;
    }
    onConfirm(list.id, trimmed);
  };

  if (!list) return null;
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-modal bg-black/30" />
      <div className="fixed left-1/2 top-1/2 z-modal w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-5 shadow-2xl">
        <div className="text-[15px] font-semibold">Renommer la liste</div>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Choisissez un nouveau nom pour cette liste.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onClose();
          }}
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] outline-none focus:border-blue-500"
          placeholder="Nom de la liste"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-accent"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
          >
            Renommer
          </button>
        </div>
      </div>
    </>
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
  onLaunchCampaign: () => void;
  onLaunchCallSession: () => void;
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
  onLaunchCampaign,
  onLaunchCallSession,
  onAskDelete,
  onRename,
  onExport,
}: ListRowProps) {
  const cfg = getSourceConfig(l.source);
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
            <SourceMark source={l.source} size={18} />
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
          <SourceMark source={l.source} size={12} />
          {cfg.short}
        </span>
      </td>
      {/* Volume */}
      <td className="px-3.5 py-3 align-middle">
        <div className="text-[13.5px] font-semibold">{stats.count}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          prospect{stats.count > 1 ? "s" : ""}
        </div>
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
              onLaunchCampaign();
            }}
            title="Lancer une campagne sur cette liste"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-background px-2.5 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-accent dark:border-primary/45"
          >
            <Megaphone className="h-2.5 w-2.5" />
            Lancer une campagne
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLaunchCallSession();
            }}
            title="Démarrer une session d'appels sur cette liste"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm hover:bg-accent"
          >
            <Phone className="h-3 w-3" />
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
  onLaunchCampaign,
  onLaunchCallSession,
  onRename,
  onExport,
  onAskDelete,
}: {
  list: BddRow;
  onClose: () => void;
  memberNames: Map<string, string>;
  onOpenProspects: (id: string) => void;
  onLaunchCampaign: () => void;
  onLaunchCallSession: () => void;
  onRename: () => void;
  onExport: () => void;
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
              <SourceMark source={list.source} size={20} />
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
                  <SourceMark source={list.source} size={13} /> {cfg.label}
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
            onClick={onLaunchCampaign}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-[13.5px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Megaphone className="h-3 w-3" />
            Lancer une campagne sur cette liste
          </button>
          <button
            onClick={onLaunchCallSession}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent"
          >
            <Phone className="h-3 w-3" />
            Démarrer une session d&apos;appels
          </button>
          <div className="flex gap-1.5">
            <FooterBtn icon={Users} onClick={() => onOpenProspects(list.id)}>
              Voir les prospects
            </FooterBtn>
            <FooterBtn icon={Pencil} onClick={onRename}>
              Renommer
            </FooterBtn>
            <FooterBtn icon={Download} onClick={onExport}>
              Exporter
            </FooterBtn>
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

/* ------------------------------------------------------------------
   Per-category filter dropdowns — each is a campaign-style pill that
   opens its own dropdown. `open`/`onToggle` are driven by the parent's
   single `openFilter` state so only one is ever open at a time.
   ------------------------------------------------------------------ */

/**
 * Author filter — mirrors the campaigns CreatorDropdown: always-visible search,
 * real profile pictures, multi-select checkbox rows and a "Tout cocher" reset.
 * An empty selection means "all authors" (no filter).
 */
function AuteurFilterDropdown({
  members,
  selected,
  onChange,
  open,
  onToggle,
}: {
  members: { id: string; name: string; avatar: string | null }[];
  selected: string[];
  onChange: (next: string[]) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const [query, setQuery] = useState("");
  const allIds = members.map((m) => m.id);
  const isAll = selected.length === 0 || selected.length === allIds.length;
  const summary = isAll
    ? "Tous"
    : selected.length === 1
      ? (members.find((m) => m.id === selected[0])?.name ?? "1 sélectionné")
      : `${selected.length} sur ${allIds.length}`;
  // `isAll` shows every row checked; toggling from there starts a fresh subset.
  const isChecked = (id: string) => isAll || selected.includes(id);
  const toggle = (id: string) => {
    const base = isAll ? [...allIds] : [...selected];
    const next = base.includes(id)
      ? base.filter((x) => x !== id)
      : [...base, id];
    onChange(next.length === allIds.length ? [] : next);
  };
  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="relative">
      <CrmFilterButton active={!isAll} onClick={onToggle}>
        <span>Auteur</span>
        <span className="text-xs font-medium text-muted-foreground">
          : {summary}
        </span>
        <ChevronDown className="size-3 opacity-60" />
      </CrmFilterButton>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-[240px] rounded-xl border bg-popover p-1 shadow-lg"
        >
          <div className="relative px-2 pb-1 pt-1.5">
            <Search className="absolute left-4 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="h-7 w-full rounded-md border border-input bg-background pl-6 pr-2 text-xs outline-none focus:border-[#0052D9]"
            />
          </div>
          <div className="border-b px-2.5 pb-1.5 pt-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11.5px] font-semibold text-[#0052D9]"
            >
              Tout cocher
            </button>
          </div>
          {members.length === 0 && (
            <div className="px-2.5 py-2 text-center text-[12.5px] text-muted-foreground">
              Aucun membre
            </div>
          )}
          {members.length > 0 && filtered.length === 0 && (
            <div className="py-3 text-center text-xs text-muted-foreground">
              Aucun résultat
            </div>
          )}
          {filtered.map((m) => (
            <div
              key={m.id}
              onClick={() => toggle(m.id)}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] hover:bg-accent"
            >
              <Checkbox checked={isChecked(m.id)} />
              <NameAvatar name={m.name} size={20} photo={m.avatar} />
              <span className="truncate">{m.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DateFilterDropdown({
  dateFrom,
  dateTo,
  onChange,
  open,
  onToggle,
}: {
  dateFrom: string | null;
  dateTo: string | null;
  onChange: (from: string | null, to: string | null) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const summary =
    dateFrom && dateTo
      ? `${fr(dateFrom)} → ${fr(dateTo)}`
      : dateFrom
        ? `depuis ${fr(dateFrom)}`
        : dateTo
          ? `jusqu’au ${fr(dateTo)}`
          : "Toutes";
  return (
    <div className="relative">
      <CrmFilterButton active={!!dateFrom || !!dateTo} onClick={onToggle}>
        <CalendarDays className="size-3.5 opacity-70" />
        <span>Date</span>
        <span className="text-xs font-medium text-muted-foreground">
          : {summary}
        </span>
        <ChevronDown className="size-3 opacity-60" />
      </CrmFilterButton>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-[260px] rounded-xl border bg-popover p-2.5 shadow-lg"
        >
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Date de création
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => onChange(e.target.value || null, dateTo)}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-[12px] outline-none transition-colors focus:border-[#0052D9]"
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => onChange(dateFrom, e.target.value || null)}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-[12px] outline-none transition-colors focus:border-[#0052D9]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="mt-2 text-[11.5px] font-medium text-[#0052D9]"
            >
              Effacer
            </button>
          )}
        </div>
      )}
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

