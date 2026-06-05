"use client";

import { useState } from "react";
import { Search, X, Settings2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CrmFiltersLabel,
  CrmSourceDropdown,
  CrmSortDropdown,
} from "./crm-shared";
import {
  PROSPECT_SORT_OPTIONS,
  type ProspectSortKey,
} from "./crm-prospect-sort";

export interface StatusPillOption {
  key: string;
  label: string;
  count: number;
  color?: string;
}

interface CrmProspectToolbarProps {
  statusFilter: string | null;
  onStatusFilterChange: (key: string | null) => void;
  statusPills: StatusPillOption[];
  totalCount: number;
  onOpenPipelineSettings: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string[];
  onSourceFilterChange: (values: string[]) => void;
  sortBy: ProspectSortKey;
  onSortByChange: (key: ProspectSortKey) => void;
  /** True while a search/filter query is in flight — shows an inline spinner. */
  loading?: boolean;
  className?: string;
}

export function CrmProspectToolbar({
  statusFilter,
  onStatusFilterChange,
  statusPills,
  totalCount,
  onOpenPipelineSettings,
  search,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  sortBy,
  onSortByChange,
  loading = false,
  className,
}: CrmProspectToolbarProps) {
  const [openFilter, setOpenFilter] = useState<"source" | "sort" | null>(null);

  // Column-header clicks can set keys not in the dropdown (status/source);
  // map every key so "Trier : …" always reflects the real active sort.
  const SORT_LABELS: Record<ProspectSortKey, string> = {
    lastActivity: "Dernière activité",
    entry: "Date d'entrée pipeline",
    silence: "Silence",
    alpha: "Alphabétique",
    status: "Statut",
    source: "Source",
  };
  const activeSortLabel = SORT_LABELS[sortBy] ?? "Dernière activité";

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {/* Status quick filters */}
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StatusQuickPill
            label="Tous"
            count={totalCount}
            active={statusFilter === null}
            onClick={() => onStatusFilterChange(null)}
          />
          {statusPills.map((pill) => (
            <StatusQuickPill
              key={pill.key}
              label={pill.label}
              count={pill.count}
              color={pill.color}
              active={statusFilter === pill.key}
              onClick={() =>
                onStatusFilterChange(
                  statusFilter === pill.key ? null : pill.key,
                )
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onOpenPipelineSettings}
          title="Modifier le pipeline"
          aria-label="Modifier le pipeline"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Filtres bar — "Filtres" label + per-category dropdown pills on the
          left, search on the right (shared with Listes & Pipeline). */}
      <div className="flex flex-wrap items-center gap-2">
        <CrmFiltersLabel />

        <CrmSourceDropdown
          selected={sourceFilter}
          onChange={onSourceFilterChange}
          open={openFilter === "source"}
          onToggle={() =>
            setOpenFilter((o) => (o === "source" ? null : "source"))
          }
        />

        <CrmSortDropdown
          options={PROSPECT_SORT_OPTIONS}
          value={sortBy}
          currentLabel={activeSortLabel}
          onChange={(id) => {
            onSortByChange(id);
            setOpenFilter(null);
          }}
          open={openFilter === "sort"}
          onToggle={() => setOpenFilter((o) => (o === "sort" ? null : "sort"))}
        />

        {/* Search — right-aligned, campaign style */}
        <div className="relative ml-auto w-full min-w-[220px] sm:w-[300px]">
          {loading ? (
            <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-blue-600" />
          ) : (
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          )}
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nom, entreprise, email, liste…"
            className="h-[34px] w-full rounded-lg border border-input bg-background pl-8 pr-8 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-[#0052D9]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Click-outside backdrop for the filter dropdowns */}
      {openFilter && (
        <div
          onClick={() => setOpenFilter(null)}
          className="fixed inset-0 z-[5]"
        />
      )}
    </div>
  );
}

function StatusQuickPill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium",
        active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-border bg-card text-foreground/80 hover:bg-accent/50",
      )}
    >
      {color && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
      <span
        className={cn(
          "min-w-[18px] rounded-full px-1.5 text-center text-[11px]",
          active
            ? "bg-blue-600 text-white"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
