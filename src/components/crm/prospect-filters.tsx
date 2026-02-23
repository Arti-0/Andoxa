"use client";

import { Search, X, Filter, ChevronDown, List } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { BddItem } from "./bdd-list";

export interface FilterState {
  status: string[];
  source: string[];
  tags: string[];
  assignedTo: string | null;
  dateRange: { from: Date; to: Date } | null;
  search: string;
  bddId: string | null;
}

interface ProspectFiltersProps {
  workspaceId: string | null;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "Nouveau", color: "bg-blue-500" },
  { value: "contacted", label: "Contacté", color: "bg-yellow-500" },
  { value: "qualified", label: "Qualifié", color: "bg-green-500" },
  { value: "lost", label: "Perdu", color: "bg-red-500" },
  { value: "won", label: "Gagné", color: "bg-emerald-500" },
];

const SOURCE_OPTIONS = [
  { value: "linkedin_extension", label: "LinkedIn" },
  { value: "linkedin", label: "LinkedIn (autre)" },
  { value: "csv", label: "Import CSV" },
  { value: "import", label: "Import" },
  { value: "manual", label: "Manuel" },
  { value: "website", label: "Site web" },
];

const DEBOUNCE_MS = 300;

const SOURCE_LABELS: Record<string, string> = {
  linkedin_extension: "LinkedIn",
  linkedin: "LinkedIn",
  csv: "Import CSV",
  import: "Import",
  manual: "Manuel",
  website: "Site web",
};

async function fetchBdd(): Promise<{ items: BddItem[] }> {
  const res = await fetch("/api/bdd", { credentials: "include" });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return { items: json.items ?? [] };
}

function groupBddByRecency(items: BddItem[]): {
  recent: BddItem[];
  thisMonth: BddItem[];
  older: BddItem[];
} {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const recent: BddItem[] = [];
  const thisMonth: BddItem[] = [];
  const older: BddItem[] = [];

  for (const item of items) {
    const created = item.created_at ? new Date(item.created_at) : null;
    if (!created) {
      older.push(item);
      continue;
    }
    if (created >= sevenDaysAgo) recent.push(item);
    else if (created >= startOfMonth) thisMonth.push(item);
    else older.push(item);
  }

  return { recent, thisMonth, older };
}

export function ProspectFilters({
  workspaceId,
  filters,
  onFiltersChange,
  onReset,
}: ProspectFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Sync searchInput when filters.search changes externally (e.g. on reset)
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounce: update parent only after 300ms without typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const latest = filtersRef.current;
      if (searchInput !== latest.search) {
        onFiltersChange({ ...latest, search: searchInput });
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, onFiltersChange]);

  const { data: bddData } = useQuery({
    queryKey: ["bdd", workspaceId],
    queryFn: fetchBdd,
    enabled: !!workspaceId,
  });

  const bddItems = bddData?.items ?? [];
  const groupedBdd = useMemo(() => groupBddByRecency(bddItems), [bddItems]);

  const selectedListName = useMemo(() => {
    if (!filters.bddId) return null;
    const found = bddItems.find((i) => i.id === filters.bddId);
    return found?.name ?? null;
  }, [filters.bddId, bddItems]);

  const handleSelectList = (bddId: string | null) => {
    const newId = filters.bddId === bddId ? null : bddId;
    onFiltersChange({ ...filters, bddId: newId });
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.source.length > 0 ||
    filters.tags.length > 0 ||
    filters.assignedTo ||
    filters.bddId ||
    searchInput;

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const toggleSource = (source: string) => {
    const newSource = filters.source.includes(source)
      ? filters.source.filter((s) => s !== source)
      : [...filters.source, source];
    onFiltersChange({ ...filters, source: newSource });
  };

  return (
    <div className="space-y-4">
      {/* Search + Quick filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, entreprise..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Liste dropdown (point d'ancrage) */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                filters.bddId ? "border-primary/50 bg-primary/5" : ""
              }`}
            >
              <List className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[180px] truncate">
                {selectedListName ?? "Liste"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Rechercher une liste..." />
              <CommandList>
                <CommandEmpty>Aucune liste trouvée</CommandEmpty>
                <CommandGroup heading="Toutes les listes">
                  <CommandItem
                    onSelect={() => handleSelectList(null)}
                    className={!filters.bddId ? "bg-accent" : ""}
                  >
                    Tous les prospects
                  </CommandItem>
                </CommandGroup>
                {groupedBdd.recent.length > 0 && (
                  <CommandGroup heading="Récentes (7 derniers jours)">
                    {groupedBdd.recent.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleSelectList(item.id)}
                        className={filters.bddId === item.id ? "bg-accent" : ""}
                      >
                        <span className="truncate">{item.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {groupedBdd.thisMonth.length > 0 && (
                  <CommandGroup heading="Ce mois">
                    {groupedBdd.thisMonth.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleSelectList(item.id)}
                        className={filters.bddId === item.id ? "bg-accent" : ""}
                      >
                        <span className="truncate">{item.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {groupedBdd.older.length > 0 && (
                  <CommandGroup heading="Plus anciennes">
                    {groupedBdd.older.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleSelectList(item.id)}
                        className={filters.bddId === item.id ? "bg-accent" : ""}
                      >
                        <span className="truncate">{item.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Status filters */}
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status.value}
              onClick={() => toggleStatus(status.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.status.includes(status.value)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${status.color}`} />
              {status.label}
            </button>
          ))}
        </div>

        {/* Advanced filters toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
            showAdvanced ? "bg-accent" : "hover:bg-accent"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtres
        </button>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Source */}
            <div>
              <label className="mb-2 block text-sm font-medium">Source</label>
              <div className="flex flex-wrap gap-1">
                {SOURCE_OPTIONS.map((source) => (
                  <button
                    key={source.value}
                    onClick={() => toggleSource(source.value)}
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${
                      filters.source.includes(source.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-sm font-medium">Tags</label>
              <p className="text-xs text-muted-foreground">
                TODO: Tag selector
              </p>
            </div>

            {/* Assigned To */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Assigné à
              </label>
              <p className="text-xs text-muted-foreground">
                TODO: Team member selector
              </p>
            </div>

            {/* Date Range */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Date de création
              </label>
              <p className="text-xs text-muted-foreground">
                TODO: Date range picker
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
