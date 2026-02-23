"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTableLayout } from "@/components/ui/data-table";
import { getProspectColumns } from "./prospect-columns";
import { getBddColumns } from "./bdd-columns";
import type { FilterState } from "./prospect-filters";
import type { Prospect } from "@/lib/types/prospects";

export interface BddRow {
  id: string;
  name: string;
  source: string;
  proprietaire: string | null;
  created_at: string | null;
}

export interface ListesFilterState {
  source: string[];
  proprietaire: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

interface ProspectsApiResponse {
  items: Prospect[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface BddApiResponse {
  items: BddRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 20;

function buildProspectsUrl(
  page: number,
  pageSize: number,
  filters: FilterState
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.status.length > 0) params.set("status", filters.status.join(","));
  if (filters.source.length > 0) params.set("source", filters.source.join(","));
  if (filters.bddId) params.set("bdd_id", filters.bddId);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return `/api/prospects?${params.toString()}`;
}

function buildBddUrl(
  page: number,
  pageSize: number,
  filters: ListesFilterState,
  search: string
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.source.length > 0) params.set("source", filters.source.join(","));
  if (filters.proprietaire) params.set("proprietaire", filters.proprietaire);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (search?.trim()) params.set("search", search.trim());
  return `/api/bdd?${params.toString()}`;
}

interface CrmTableProps {
  mode: "listes" | "prospects";
  workspaceId: string | null;
  prospectFilters: FilterState;
  listesFilters: ListesFilterState;
  onSelectList: (bddId: string | null) => void;
  memberNames: Map<string, string>;
  /** Callback appelé quand la sélection des prospects change (vue prospects uniquement) */
  onSelectionChange?: (prospects: Prospect[]) => void;
  /** Callback appelé quand la sélection des listes change (vue listes uniquement) */
  onListesSelectionChange?: (listes: BddRow[]) => void;
}

export function CrmTable({
  mode,
  workspaceId,
  prospectFilters,
  listesFilters,
  onSelectList,
  memberNames,
  onSelectionChange,
  onListesSelectionChange,
}: CrmTableProps) {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [listesRowSelection, setListesRowSelection] = useState<
    Record<string, boolean>
  >({});
  const lastSelectedListesIdsRef = useRef<string>("");

  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;

  const { data: prospectsData, isLoading: prospectsLoading } = useQuery({
    queryKey: [
      "prospects",
      workspaceId,
      page,
      pageSize,
      prospectFilters.status,
      prospectFilters.source,
      prospectFilters.bddId,
      prospectFilters.search,
    ],
    queryFn: async () => {
      const url = buildProspectsUrl(page, pageSize, prospectFilters);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as ProspectsApiResponse;
    },
    enabled: !!workspaceId && mode === "prospects",
    placeholderData: (prev) => prev,
  });

  const prospectsItems = prospectsData?.items ?? [];
  const lastSelectedIdsRef = useRef<string>("");

  useEffect(() => {
    if (!onSelectionChange || mode !== "prospects") return;
    const selected = Object.entries(rowSelection)
      .filter(([, v]) => v)
      .map(([k]) => prospectsItems[parseInt(k, 10)])
      .filter(Boolean) as Prospect[];
    const ids = selected
      .map((p) => p.id)
      .sort()
      .join(",");
    if (ids !== lastSelectedIdsRef.current) {
      lastSelectedIdsRef.current = ids;
      onSelectionChange(selected);
    }
  }, [rowSelection, prospectsItems, onSelectionChange, mode]);

  const { data: bddData, isLoading: bddLoading } = useQuery({
    queryKey: [
      "bdd",
      workspaceId,
      page,
      pageSize,
      listesFilters,
      prospectFilters.search,
    ],
    queryFn: async () => {
      const url = buildBddUrl(page, pageSize, listesFilters, prospectFilters.search);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as BddApiResponse;
    },
    enabled: !!workspaceId && mode === "listes",
    placeholderData: (prev) => prev,
  });

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
    },
  });

  const handleDeleteBdd = (id: string) => {
    if (
      confirm(
        "Supprimer cette liste ? Les prospects associés seront conservés."
      )
    ) {
      deleteBddMutation.mutate(id);
    }
  };

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });

  const handleDeleteProspect = (prospect: Prospect) => {
    deleteProspectMutation.mutate(prospect.id);
  };

  if (mode === "prospects") {
    const items = prospectsData?.items ?? [];
    const total = prospectsData?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const table = useReactTable({
      data: items,
      columns: getProspectColumns(handleDeleteProspect),
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      manualPagination: true,
      pageCount: totalPages,
      enableRowSelection: true,
      state: { pagination, rowSelection },
      onPaginationChange: setPagination,
      onRowSelectionChange: setRowSelection,
    });


    const footer = (
      <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          {total > 0 ? (
            <span>
              {total} prospect{total > 1 ? "s" : ""} · Page {page} sur {totalPages}
            </span>
          ) : (
            <span>Aucun prospect</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={page <= 1 || prospectsLoading}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={page >= totalPages || prospectsLoading}
          >
            Suivant
          </Button>
        </div>
      </div>
    );

    const emptyMessage =
      prospectFilters.search ||
      prospectFilters.status.length > 0 ||
      prospectFilters.source.length > 0 ||
      prospectFilters.bddId
        ? "Aucun prospect ne correspond aux filtres."
        : "Aucun prospect. Ajoutez-en un ou importez une liste depuis l'extension.";

    return (
      <div className="h-full overflow-hidden rounded-lg border bg-card">
        <DataTableLayout
          table={table}
          isLoading={prospectsLoading}
          emptyMessage={emptyMessage}
          footer={footer}
          maxTableHeightClassName="max-h-[calc(100vh-360px)]"
        />
      </div>
    );
  }

  // Mode listes
  const bddItems = bddData?.items ?? [];
  const total = bddData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allRow: BddRow = {
    id: "__all__",
    name: "Tous les prospects",
    source: "",
    proprietaire: null,
    created_at: null,
  };
  const listesItems = page === 1 ? [allRow, ...bddItems] : bddItems;

  useEffect(() => {
    if (!onListesSelectionChange || mode !== "listes") return;
    const selected = Object.entries(listesRowSelection)
      .filter(([, v]) => v)
      .map(([k]) => listesItems[parseInt(k, 10)])
      .filter((r): r is BddRow => Boolean(r) && r.id !== "__all__");
    const ids = selected
      .map((r) => r.id)
      .sort()
      .join(",");
    if (ids !== lastSelectedListesIdsRef.current) {
      lastSelectedListesIdsRef.current = ids;
      onListesSelectionChange(selected);
    }
  }, [listesRowSelection, listesItems, onListesSelectionChange, mode]);

  const bddColumns = getBddColumns(onSelectList, handleDeleteBdd, memberNames);

  const listesTable = useReactTable({
    data: listesItems,
    columns: bddColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    enableRowSelection: (row) => row.original.id !== "__all__",
    state: { pagination, rowSelection: listesRowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setListesRowSelection,
  });

  const footer = (
    <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        {total > 0 ? (
          <span>
            {total} liste{total > 1 ? "s" : ""} · Page {page} sur {totalPages}
          </span>
        ) : (
          <span>Aucune liste</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => listesTable.previousPage()}
          disabled={page <= 1 || bddLoading}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => listesTable.nextPage()}
          disabled={page >= totalPages || bddLoading}
        >
          Suivant
        </Button>
      </div>
    </div>
  );

  const emptyMessage =
    listesFilters.source.length > 0 ||
    listesFilters.proprietaire ||
    listesFilters.dateFrom ||
    listesFilters.dateTo ||
    prospectFilters.search
      ? "Aucune liste ne correspond aux filtres."
      : "Aucune liste. Importez des prospects depuis l'extension.";

  return (
    <div className="h-full overflow-hidden rounded-lg border bg-card">
      <DataTableLayout
        table={listesTable}
        isLoading={bddLoading}
        emptyMessage={emptyMessage}
        footer={footer}
        maxTableHeightClassName="max-h-[calc(100vh-360px)]"
        onRowClick={(row) => {
          const id = row.original.id;
          if (id !== "__all__") onSelectList(id);
          else onSelectList(null);
        }}
      />
    </div>
  );
}
