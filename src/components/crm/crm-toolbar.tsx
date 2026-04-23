"use client";

import { useState } from "react";
import {
  LayoutList,
  Plus,
  Upload,
  LayoutGrid,
  Table2,
  X,
  Filter,
  ChevronDown,
  List,
  UserPlus,
  MessageSquare,
  Megaphone,
  Phone,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useMemo } from "react";
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
import { ProspectCreateDialog } from "./prospect-create-dialog";
import { ProspectImportDialog } from "./prospect-import-dialog";
import { CampaignModal } from "@/components/campaigns/campaign-modal";
import type { CampaignConfig } from "@/lib/campaigns/types";
import type { BddItem, FilterState } from "./crm-table";

export type CrmView = "listes" | "prospects" | "corbeille" | "kanban";

const SOURCE_OPTIONS = [
  { value: "linkedin_extension", label: "LinkedIn" },
  { value: "linkedin", label: "LinkedIn (autre)" },
  { value: "csv", label: "Import CSV" },
  { value: "import", label: "Import" },
  { value: "manual", label: "Manuel" },
  { value: "website", label: "Site web" },
];

const STATUS_OPTIONS = [
  { value: "new", label: "Nouveau", color: "bg-blue-500" },
  { value: "contacted", label: "Contacté", color: "bg-yellow-500" },
  { value: "qualified", label: "Qualifié", color: "bg-green-500" },
  { value: "rdv", label: "RDV", color: "bg-purple-500" },
  { value: "proposal", label: "Proposition", color: "bg-indigo-500" },
  { value: "won", label: "Signé", color: "bg-emerald-500" },
  { value: "lost", label: "Perdu", color: "bg-red-500" },
];

async function fetchBddForDropdown(): Promise<{ items: BddItem[] }> {
  const res = await fetch("/api/bdd?pageSize=100", { credentials: "include" });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  const data = json.data ?? json;
  return { items: data.items ?? [] };
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

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BddRow, ListesFilterState } from "./crm-table";
import type { Prospect } from "@/lib/types/prospects";
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";

interface CrmToolbarProps {
  view: CrmView;
  onViewChange: (view: CrmView) => void;
  workspaceId: string | null;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  listesFilters: ListesFilterState;
  onListesFiltersChange: (f: ListesFilterState) => void;
  onReset: () => void;
  onListesReset: () => void;
  selectedProspects?: Prospect[];
  selectedListes?: BddRow[];
}

export function CrmToolbar({
  view,
  onViewChange,
  workspaceId,
  filters,
  onFiltersChange,
  listesFilters,
  onListesFiltersChange,
  onReset,
  onListesReset,
  selectedProspects = [],
  selectedListes = [],
}: CrmToolbarProps) {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig | null>(null);
  const { data: linkedInAccount } = useLinkedInAccount();
  const linkedinIsPremium = linkedInAccount?.linkedin_is_premium ?? false;

  const prospectsWithLinkedin = selectedProspects.filter((p) => p.linkedin?.trim());
  const prospectsWithPhone = selectedProspects.filter((p) => p.phone?.trim());
  const hasLinkedinSelection = prospectsWithLinkedin.length > 0;
  const hasListesSelection = selectedListes.length > 0;
  const hasAnySelection = selectedProspects.length > 0 || hasListesSelection;

  const openCampaignModal = (config: CampaignConfig) => {
    setCampaignConfig(config);
    setShowCampaignModal(true);
  };

  const closeCampaignModal = () => {
    setShowCampaignModal(false);
    setCampaignConfig(null);
  };
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFiltersOpen, setShowFiltersOpen] = useState(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const { data: bddData } = useQuery({
    queryKey: ["bdd-dropdown", workspaceId],
    queryFn: fetchBddForDropdown,
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

  const { data: membersData } = useQuery({
    queryKey: ["organization-members", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/organization/members", { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as { items: { id: string; name: string }[] };
    },
    enabled: !!workspaceId,
  });
  const members = membersData?.items ?? [];

  const hasProspectFilters =
    filters.status.length > 0 ||
    filters.source.length > 0 ||
    filters.tags.length > 0 ||
    filters.assignedTo ||
    filters.bddId;

  const hasListesFilters =
    listesFilters.source.length > 0 ||
    listesFilters.proprietaire ||
    listesFilters.dateFrom ||
    listesFilters.dateTo;

  const hasActiveFilters = view === "listes" ? hasListesFilters : hasProspectFilters;

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

  const toggleListesSource = (source: string) => {
    const newSource = listesFilters.source.includes(source)
      ? listesFilters.source.filter((s) => s !== source)
      : [...listesFilters.source, source];
    onListesFiltersChange({ ...listesFilters, source: newSource });
  };

  const selectionLabel = selectedProspects.length > 0
    ? `${selectedProspects.length} prospect(s) sélectionné(s)`
    : hasListesSelection
      ? `${selectedListes.length} liste(s) sélectionnée(s)`
      : null;

  return (
    <>
      <div className="border-b px-6 py-4 space-y-3">
        {/* Row 1: View tabs (left) | Filters + always-visible actions (right) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-1" role="group" aria-label="Vue CRM">
            <button
              type="button"
              onClick={() => onViewChange("listes")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "listes"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Listes
            </button>
            <button
              type="button"
              onClick={() => onViewChange("prospects")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "prospects"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              <Table2 className="h-4 w-4" />
              Prospects
            </button>
            <button
              type="button"
              onClick={() => onViewChange("kanban")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => onViewChange("corbeille")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "corbeille"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              Corbeille
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view === "prospects" && (
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
            )}
            <Popover open={showFiltersOpen} onOpenChange={setShowFiltersOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                    (view === "listes" && hasListesFilters) ||
                    (view !== "listes" && (filters.status.length > 0 || filters.source.length > 0))
                      ? "border-primary/50 bg-primary/5"
                      : ""
                  }`}
                >
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  Filtres
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] max-w-[calc(100vw-2rem)] p-3" align="start">
                <div className="space-y-4">
                  {view === "listes" ? (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Source</label>
                        <div className="flex flex-wrap gap-1">
                          {SOURCE_OPTIONS.map((source) => (
                            <button key={source.value} type="button" onClick={() => toggleListesSource(source.value)}
                              className={`rounded-md px-2 py-1 text-xs transition-colors ${listesFilters.source.includes(source.value) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>{source.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Auteur</label>
                        <div className="flex flex-wrap gap-1">
                          {members.map((m) => (
                            <button key={m.id} type="button" onClick={() => onListesFiltersChange({ ...listesFilters, proprietaire: listesFilters.proprietaire === m.id ? null : m.id })}
                              className={`rounded-md px-2 py-1 text-xs transition-colors ${listesFilters.proprietaire === m.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>{m.name}</button>
                          ))}
                          {members.length === 0 && <p className="text-xs text-muted-foreground">Aucun membre</p>}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Date de création</label>
                        <div className="flex min-w-0 flex-col gap-2 xs:flex-row">
                          <input type="date" value={listesFilters.dateFrom ?? ""} onChange={(e) => onListesFiltersChange({ ...listesFilters, dateFrom: e.target.value || null })} className="min-w-0 rounded border bg-background px-2 py-1 text-xs" />
                          <span className="hidden self-center text-muted-foreground xs:inline">→</span>
                          <input type="date" value={listesFilters.dateTo ?? ""} onChange={(e) => onListesFiltersChange({ ...listesFilters, dateTo: e.target.value || null })} className="min-w-0 rounded border bg-background px-2 py-1 text-xs" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Statut</label>
                        <div className="flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((status) => (
                            <button key={status.value} type="button" onClick={() => toggleStatus(status.value)}
                              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filters.status.includes(status.value) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />{status.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Source</label>
                        <div className="flex flex-wrap gap-1">
                          {SOURCE_OPTIONS.map((source) => (
                            <button key={source.value} type="button" onClick={() => toggleSource(source.value)}
                              className={`rounded-md px-2 py-1 text-xs transition-colors ${filters.source.includes(source.value) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>{source.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Assigné à</label>
                        <div className="flex flex-wrap gap-1">
                          {members.map((m) => (
                            <button key={m.id} type="button" onClick={() => onFiltersChange({ ...filters, assignedTo: filters.assignedTo === m.id ? null : m.id })}
                              className={`rounded-md px-2 py-1 text-xs transition-colors ${filters.assignedTo === m.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>{m.name}</button>
                          ))}
                          {members.length === 0 && <p className="text-xs text-muted-foreground">Aucun membre</p>}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Date de création</label>
                        <div className="flex min-w-0 flex-col gap-2 xs:flex-row">
                          <input type="date" value={filters.dateRange?.from ? filters.dateRange.from.toISOString().slice(0, 10) : ""} onChange={(e) => { const val = e.target.value; const from = val ? new Date(val) : null; const to = filters.dateRange?.to ?? null; onFiltersChange({ ...filters, dateRange: from ? { from, to: to ?? from } : null }); }} className="min-w-0 rounded border bg-background px-2 py-1 text-xs" />
                          <span className="hidden self-center text-muted-foreground xs:inline">→</span>
                          <input type="date" value={filters.dateRange?.to ? filters.dateRange.to.toISOString().slice(0, 10) : ""} onChange={(e) => { const val = e.target.value; const to = val ? new Date(val) : null; const from = filters.dateRange?.from ?? null; onFiltersChange({ ...filters, dateRange: to && from ? { from, to } : null }); }} className="min-w-0 rounded border bg-background px-2 py-1 text-xs" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <button onClick={view === "listes" ? onListesReset : onReset} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
                Réinitialiser
              </button>
            )}
            <button type="button" onClick={() => setShowImportDialog(true)} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" />
              Importer
            </button>
            <button type="button" onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nouveau prospect
            </button>

          </div>
        </div>

        {/* Row 2: Selection-specific actions (Inviter / Conversation) – only in prospects view */}
        {view === "prospects" && hasLinkedinSelection && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            <button
              type="button"
              onClick={() => openCampaignModal({ channel: "linkedin" })}
              className="flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
            >
              <UserPlus className="h-4 w-4" />
              Inviter ({prospectsWithLinkedin.length})
            </button>
            <Link
              href="/messagerie"
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <MessageSquare className="h-4 w-4" />
              Démarrer conversation
            </Link>
            {selectionLabel && (
              <span className="text-xs text-muted-foreground ml-auto">{selectionLabel}</span>
            )}
          </div>
        )}
      </div>

      <ProspectCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <ProspectImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
      <CampaignModal
        open={showCampaignModal}
        onOpenChange={(open) => !open && closeCampaignModal()}
        config={campaignConfig}
        prospects={prospectsWithLinkedin}
        onSuccess={closeCampaignModal}
        isPremium={linkedinIsPremium}
      />
    </>
  );
}
