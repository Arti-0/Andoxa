"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  Filter,
  X,
  Check,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM_SOURCE_FILTER_OPTIONS } from "./crm-source-filters";
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
  className,
}: CrmProspectToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const activeSortLabel =
    PROSPECT_SORT_OPTIONS.find((o) => o.id === sortBy)?.label ??
    "Dernière activité";

  const toggleSource = (value: string) => {
    onSourceFilterChange(
      sourceFilter.includes(value)
        ? sourceFilter.filter((v) => v !== value)
        : [...sourceFilter, value],
    );
  };

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

      {/* Search + source filters + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nom, entreprise, email, liste…"
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="relative" ref={filtersRef}>
          <button
            type="button"
            onClick={() => {
              setFiltersOpen((o) => !o);
              setSortOpen(false);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium",
              filtersOpen ? "bg-accent" : "bg-card",
            )}
          >
            <Filter className="h-3 w-3" />
            Source
            {sourceFilter.length > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {sourceFilter.length}
              </span>
            )}
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
          {filtersOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-lg border border-border bg-popover p-3 shadow-lg">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold">Source</span>
                <button
                  type="button"
                  onClick={() => onSourceFilterChange([])}
                  className="text-[11.5px] font-medium text-blue-700"
                >
                  Tout effacer
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {CRM_SOURCE_FILTER_OPTIONS.map((opt) => {
                  const active = sourceFilter.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSource(opt.value)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[11.5px]",
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-muted text-foreground/80 hover:bg-muted/70",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => {
              setSortOpen((o) => !o);
              setFiltersOpen(false);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium",
              sortOpen ? "bg-accent" : "bg-card",
            )}
          >
            Trier : {activeSortLabel}
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-lg border border-border bg-popover p-1.5 shadow-lg">
              {PROSPECT_SORT_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSortByChange(id);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12.5px]",
                    sortBy === id
                      ? "bg-accent font-semibold text-blue-700"
                      : "text-foreground hover:bg-accent/50",
                  )}
                >
                  {label}
                  {sortBy === id && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
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
