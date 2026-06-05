"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Filter as FilterIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  type CampaignStatus,
  type Channel,
  type FilterState,
  type Period,
  type Creator,
} from "./data";
import { Avatar, StatusBadge } from "./primitives";
import { Checkbox } from "@/components/ui/checkbox";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

// WhatsApp is gated behind the `whatsapp` #FF — hide it from the canal filter.
const CHANNEL_OPTIONS: { id: Channel; label: string }[] = [
  { id: "linkedin", label: "LinkedIn" },
  ...(isFeatureEnabled("whatsapp")
    ? [{ id: "whatsapp" as Channel, label: "WhatsApp" }]
    : []),
  { id: "phone", label: "Téléphone" },
];

const STATUS_OPTIONS: { id: CampaignStatus; label: string }[] = [
  { id: "running", label: "En cours" },
  { id: "paused", label: "En pause" },
  { id: "completed", label: "Terminée" },
  { id: "failed", label: "Échouée" },
  { id: "draft", label: "Brouillon" },
  { id: "ready", label: "Prête" },
];

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "90", label: "90 jours" },
  { id: "all", label: "Tout" },
];

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onClose]);
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[34px] items-center gap-2 rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
        active
          ? "border-[#0052D9] bg-[#E8F0FD] text-[#003EA3]"
          : "border-input bg-background hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function MultiSelectDropdown<T extends string>({
  label,
  icon,
  options,
  selected,
  onChange,
  renderOption,
}: {
  label: string;
  icon?: React.ReactNode;
  options: { id: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
  renderOption?: (opt: { id: T; label: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));
  const summary =
    selected.length === 0
      ? "Tous"
      : selected.length === 1
        ? options.find((o) => o.id === selected[0])?.label
        : `${selected.length} sélectionnés`;
  const toggle = (id: T) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div ref={ref} className="relative">
      <FilterButton active={selected.length > 0} onClick={() => setOpen((o) => !o)}>
        {icon ? <span className="opacity-70">{icon}</span> : null}
        <span>{label}</span>
        <span className="text-xs font-medium text-muted-foreground">: {summary}</span>
        <ChevronDown className="size-3 opacity-60" />
      </FilterButton>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[200px] rounded-xl border bg-popover p-1 shadow-lg">
          {options.map((opt) => {
            const isSel = selected.includes(opt.id);
            return (
              <div
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] hover:bg-accent"
              >
                <Checkbox checked={isSel} />
                {renderOption ? renderOption(opt) : <span>{opt.label}</span>}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PeriodDropdown({
  value,
  onChange,
}: {
  value: Period;
  onChange: (next: Period) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));
  const current = PERIOD_OPTIONS.find((o) => o.id === value)!;
  const isActive = value !== "all";
  return (
    <div ref={ref} className="relative">
      <FilterButton active={isActive} onClick={() => setOpen((o) => !o)}>
        <CalendarDays className="size-3.5 opacity-70" />
        <span>Période</span>
        <span className="text-xs font-medium text-muted-foreground">: {current.label}</span>
        <ChevronDown className="size-3 opacity-60" />
      </FilterButton>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[180px] rounded-xl border bg-popover p-1 shadow-lg">
          {PERIOD_OPTIONS.map((opt) => (
            <div
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] hover:bg-accent ${
                opt.id === value ? "font-semibold text-[#0052D9]" : ""
              }`}
            >
              {opt.label}
              {opt.id === value ? <Check className="size-3.5" /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CreatorDropdown({
  members = [],
  selected,
  onChange,
}: {
  members?: Creator[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));
  const allIds = members.map((c) => c.id);
  const isAll = selected.length === 0 || selected.length === allIds.length;
  const isActive = !isAll;
  const summary = isAll
    ? "Tous"
    : selected.length === 1
      ? members.find((c) => c.id === selected[0])?.name
      : `${selected.length} sur ${allIds.length}`;
  const isChecked = (id: string) => isAll || selected.includes(id);
  const toggle = (id: string) => {
    const current = isAll ? [...allIds] : [...selected];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange(next.length === allIds.length ? [] : next);
  };
  const filtered = members.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div ref={ref} className="relative">
      <FilterButton active={isActive} onClick={() => setOpen((o) => !o)}>
        <span>Créateur</span>
        <span className="text-xs font-medium text-muted-foreground">: {summary}</span>
        <ChevronDown className="size-3 opacity-60" />
      </FilterButton>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[240px] rounded-xl border bg-popover p-1 shadow-lg">
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
          {filtered.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground">Aucun résultat</div>
          ) : null}
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => toggle(c.id)}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] hover:bg-accent"
            >
              <Checkbox checked={isChecked(c.id)} />
              <Avatar creator={c} size={20} />
              {c.name}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FiltersBar({
  filters,
  setFilters,
  totalCount,
  filteredCount,
  members = [],
}: {
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  totalCount: number;
  filteredCount: number;
  members?: Creator[];
}) {
  const hasActive =
    filters.channels.length > 0 ||
    filters.statuses.length > 0 ||
    filters.period !== "all" ||
    filters.creators.length > 0;
  const reset = () =>
    setFilters({ ...filters, channels: [], statuses: [], period: "all", creators: [] });
  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <FilterIcon className="size-3.5" />
        Filtres
      </span>
      <MultiSelectDropdown<Channel>
        label="Canal"
        icon={<SlidersHorizontal className="size-3.5" />}
        options={CHANNEL_OPTIONS}
        selected={filters.channels}
        onChange={(v) => setFilters({ ...filters, channels: v })}
      />
      <MultiSelectDropdown<CampaignStatus>
        label="Statut"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={(v) => setFilters({ ...filters, statuses: v })}
        renderOption={(opt) => <StatusBadge status={opt.id} size="sm" />}
      />
      <PeriodDropdown
        value={filters.period}
        onChange={(v) => setFilters({ ...filters, period: v })}
      />
      <CreatorDropdown
        members={members}
        selected={filters.creators}
        onChange={(v) => setFilters({ ...filters, creators: v })}
      />
      {hasActive ? (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Réinitialiser
        </button>
      ) : null}
      <div className="ml-auto text-[12.5px] text-muted-foreground tabular-nums">
        <strong className="font-semibold text-foreground">{filteredCount}</strong> résultats sur {totalCount}
      </div>
    </div>
  );
}
