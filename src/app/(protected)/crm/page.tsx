"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import { useWorkspace } from "../../../lib/workspace";
import {
  CrmTable,
  type BddRow,
  type ListesFilterState,
} from "../../../components/crm/crm-table";
import type { Prospect } from "../../../lib/types/prospects";
import { type FilterState } from "../../../components/crm/prospect-filters";
import { CrmToolbar } from "../../../components/crm/crm-toolbar";

/**
 * CRM Page - 3 vues : Listes, Prospects, Kanban
 */

const defaultProspectFilters: FilterState = {
  status: [],
  source: [],
  tags: [],
  assignedTo: null,
  dateRange: null,
  search: "",
  bddId: null,
};

const defaultListesFilters: ListesFilterState = {
  source: [],
  proprietaire: null,
  dateFrom: null,
  dateTo: null,
};

export default function CrmPage() {
  const { workspaceId } = useWorkspace();
  const [prospectFilters, setProspectFilters] = useState<FilterState>(defaultProspectFilters);
  const [listesFilters, setListesFilters] = useState<ListesFilterState>(defaultListesFilters);
  const [view, setView] = useState<"listes" | "prospects" | "kanban">("listes");
  const [selectedProspects, setSelectedProspects] = useState<Prospect[]>([]);
  const [selectedListes, setSelectedListes] = useState<BddRow[]>([]);
  const onSelectionChange = useCallback((prospects: Prospect[]) => {
    setSelectedProspects(prospects);
  }, []);
  const onListesSelectionChange = useCallback((listes: BddRow[]) => {
    setSelectedListes(listes);
  }, []);

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
  const memberNames = new Map((membersData?.items ?? []).map((m) => [m.id, m.name]));

  const handleSelectList = (bddId: string | null) => {
    setProspectFilters((prev) => ({ ...prev, bddId }));
    setView("prospects");
  };

  const handleViewChange = (newView: "listes" | "prospects" | "kanban") => {
    setView(newView);
    if (newView === "listes") {
      setProspectFilters((prev) => ({ ...prev, bddId: null }));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <CrmToolbar
        view={view}
        onViewChange={handleViewChange}
        workspaceId={workspaceId}
        filters={prospectFilters}
        onFiltersChange={setProspectFilters}
        listesFilters={listesFilters}
        onListesFiltersChange={setListesFilters}
        onReset={() => setProspectFilters(defaultProspectFilters)}
        onListesReset={() => setListesFilters(defaultListesFilters)}
        selectedProspects={selectedProspects}
        selectedListes={selectedListes}
      />

      {(view === "listes" || view === "prospects") && (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {view === "listes" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Vos listes</h2>
              <p className="text-sm text-muted-foreground">
                Cliquez sur une liste pour afficher ses prospects dans la vue Prospects.
              </p>
            </div>
          )}
          {view === "prospects" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Vos prospects</h2>
              <p className="text-sm text-muted-foreground">
                Gérez vos prospects et suivez l&apos;avancement de vos campagnes.
              </p>
            </div>
          )}
          {(view === "listes" || view === "prospects") && (
            <div className="flex-1 min-h-0">
              <CrmTable
                mode={view}
                workspaceId={workspaceId}
                prospectFilters={prospectFilters}
                listesFilters={listesFilters}
                onSelectList={handleSelectList}
                memberNames={memberNames}
                onSelectionChange={onSelectionChange}
                onListesSelectionChange={onListesSelectionChange}
              />
            </div>
          )}
        </div>
      )}

      {view === "kanban" && (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Vue Kanban</h2>
            <p className="text-sm text-muted-foreground">
              Visualisez vos prospects par statut. Bientôt disponible.
            </p>
          </div>
          <div className="flex flex-1 min-h-[400px] flex-col items-center justify-center rounded-lg border bg-card p-12">
            <LayoutGrid className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Bientôt disponible – Vue Kanban par statut.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
