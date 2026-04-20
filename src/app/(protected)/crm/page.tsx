"use client";

import { useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
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
  const searchParams = useSearchParams();
  const initialBddId = searchParams.get("bdd_id");
  const [prospectFilters, setProspectFilters] = useState<FilterState>(
    initialBddId
      ? { ...defaultProspectFilters, bddId: initialBddId }
      : defaultProspectFilters
  );
  const [listesFilters, setListesFilters] = useState<ListesFilterState>(defaultListesFilters);
  const [view, setView] = useState<"listes" | "prospects" | "corbeille" | "kanban">(
    initialBddId ? "prospects" : "listes"
  );
  const [selectedProspects, setSelectedProspects] = useState<Prospect[]>([]);
  const [selectedListes, setSelectedListes] = useState<BddRow[]>([]);

  // List rename state
  const [editingListName, setEditingListName] = useState(false);
  const [listNameDraft, setListNameDraft] = useState("");
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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

  // Fetch selected list name when in prospects view
  const { data: selectedBdd } = useQuery({
    queryKey: ["bdd-single", prospectFilters.bddId],
    queryFn: async () => {
      const res = await fetch(`/api/bdd/${prospectFilters.bddId}`, { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? json) as { id: string; name: string } | null;
    },
    enabled: !!prospectFilters.bddId && view === "prospects",
    staleTime: 60_000,
  });

  const commitListRename = async () => {
    const trimmed = listNameDraft.trim();
    if (!trimmed || !prospectFilters.bddId) { setEditingListName(false); return; }
    if (trimmed === selectedBdd?.name) { setEditingListName(false); return; }

    const res = await fetch(`/api/bdd/${prospectFilters.bddId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.status === 409) {
      toast.error("Une liste avec ce nom existe déjà");
    } else if (!res.ok) {
      toast.error("Impossible de renommer la liste");
    } else {
      void queryClient.invalidateQueries({ queryKey: ["bdd-single", prospectFilters.bddId] });
      void queryClient.invalidateQueries({ queryKey: ["bdd"] });
    }
    setEditingListName(false);
  };

  const handleSelectList = (bddId: string | null) => {
    setProspectFilters((prev) => ({ ...prev, bddId }));
    setView("prospects");
  };

  const handleViewChange = (newView: "listes" | "prospects" | "corbeille" | "kanban") => {
    setView(newView);
    setSelectedProspects([]);
    setSelectedListes([]);
    setEditingListName(false);
    if (newView === "listes") {
      setProspectFilters((prev) => ({ ...prev, bddId: null }));
    }
  };

  const listDisplayName = selectedBdd?.name ?? "Vos prospects";

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
            {/* Editable list name heading when filtered by a specific list */}
            {view === "prospects" && prospectFilters.bddId ? (
              <div className="flex items-center gap-2">
                {editingListName ? (
                  <>
                    <input
                      ref={listNameInputRef}
                      autoFocus
                      value={listNameDraft}
                      onChange={(e) => setListNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitListRename();
                        if (e.key === "Escape") setEditingListName(false);
                      }}
                      onBlur={() => void commitListRename()}
                      className="text-lg font-semibold rounded border bg-background px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); void commitListRename(); }} className="text-green-600 hover:text-green-700">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); setEditingListName(false); }} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="group flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{listDisplayName}</h2>
                    <button
                      type="button"
                      onClick={() => { setListNameDraft(selectedBdd?.name ?? ""); setEditingListName(true); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                      aria-label="Renommer la liste"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <h2 className="text-lg font-semibold">
                {view === "listes" ? "Vos listes" : view === "corbeille" ? "Corbeille" : "Vos prospects"}
              </h2>
            )}
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
                  {prospectFilters.bddId ? "Prospects de cette liste." : "Gérez vos prospects."}
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
