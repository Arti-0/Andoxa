"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "../../../lib/workspace";
import {
  CrmTable,
  type BddRow,
  type ListesFilterState,
} from "../../../components/crm/crm-table";
import { CrmKanban } from "../../../components/crm/crm-kanban";
import type { Prospect } from "../../../lib/types/prospects";
import { type FilterState } from "../../../components/crm/crm-table";
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
  const [view, setView] = useState<"listes" | "prospects" | "corbeille" | "kanban">("listes");
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
      return (json.data ?? json) as {
        items: { id: string; name: string; avatar_url: string | null }[];
      };
    },
    enabled: !!workspaceId,
  });
  const memberNames = new Map((membersData?.items ?? []).map((m) => [m.id, m.name]));
  const memberAvatars = new Map(
    (membersData?.items ?? []).map((m) => [m.id, m.avatar_url ?? null])
  );

  const handleSelectList = (bddId: string | null) => {
    setProspectFilters((prev) => ({ ...prev, bddId }));
    setView("prospects");
  };

  const handleViewChange = (newView: "listes" | "prospects" | "corbeille" | "kanban") => {
    setView(newView);
    setSelectedProspects([]);
    setSelectedListes([]);
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

      {(view === "listes" || view === "prospects" || view === "corbeille") && (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {view === "listes" ? "Vos listes" : view === "corbeille" ? "Corbeille" : "Vos prospects"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {view === "listes" ? (
                <>
                  Cliquez sur une liste pour afficher ses prospects.
                  {selectedListes.length > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      — {selectedListes.length} liste(s) sélectionnée(s)
                    </span>
                  )}
                </>
              ) : view === "corbeille" ? (
                "Prospects supprimés. Restaurez-les pour les réintégrer."
              ) : (
                <>
                  Gérez vos prospects.
                  {selectedProspects.length > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      — {selectedProspects.length} prospect(s) sélectionné(s)
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <CrmTable
              mode={view === "corbeille" ? "corbeille" : view}
              workspaceId={workspaceId}
              prospectFilters={prospectFilters}
              listesFilters={listesFilters}
              onSelectList={handleSelectList}
              memberNames={memberNames}
              memberAvatars={memberAvatars}
              onSelectionChange={onSelectionChange}
              onListesSelectionChange={onListesSelectionChange}
            />
          </div>
        </div>
      )}

      {view === "kanban" && (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Vue Kanban</h2>
            <p className="text-sm text-muted-foreground">
              Visualisez vos prospects par statut.
            </p>
          </div>
          <CrmKanban workspaceId={workspaceId} prospectFilters={prospectFilters} />
        </div>
      )}
    </div>
  );
}
