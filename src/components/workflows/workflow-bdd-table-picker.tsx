"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
  type VisibilityState,
} from "@tanstack/react-table";
import { DataTableLayout } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBddColumns } from "@/components/crm/bdd-columns";
import type { BddRow, ListesFilterState } from "@/components/crm/crm-table";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Columns to drop on small viewports so the table stays usable. The picker
 * keeps select + name + prospect count, which is enough to recognise a list
 * and decide whether to enrol it.
 */
const MOBILE_HIDDEN_COLUMNS: VisibilityState = {
  source: false,
  phones_count: false,
  proprietaire: false,
  created_at: false,
};
const DESKTOP_VISIBLE_COLUMNS: VisibilityState = {};

const DEFAULT_PAGE_SIZE = 20;

interface BddApiResponse {
  items: BddRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
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

/** Merge selections across paginated list picker (clear current page ids, then add selected). */
export function mergeBddPickerSelection(
  prev: Map<string, BddRow>,
  selectedOnPage: BddRow[],
  pageRowIds: string[]
): Map<string, BddRow> {
  const next = new Map(prev);
  for (const id of pageRowIds) next.delete(id);
  for (const row of selectedOnPage) next.set(row.id, row);
  return next;
}

const EMPTY_LISTES_FILTERS: ListesFilterState = {
  source: [],
  proprietaire: null,
  dateFrom: null,
  dateTo: null,
};

export interface WorkflowBddTablePickerProps {
  workspaceId: string | null;
  /**
   * Selected rows on the current page + ids on this page (for merging across pagination).
   */
  onSelectionChange?: (selectedOnPage: BddRow[], pageRowIds: string[]) => void;
  /** Optional toolbar above table */
  toolbarExtra?: ReactNode;
}

/**
 * List picker matching CRM listes table (design2), without delete column or row navigation.
 */
export function WorkflowBddTablePicker({
  workspaceId,
  onSelectionChange,
  toolbarExtra,
}: WorkflowBddTablePickerProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const lastIdsRef = useRef("");
  const isMobile = useIsMobile();
  const columnVisibility = isMobile
    ? MOBILE_HIDDEN_COLUMNS
    : DESKTOP_VISIBLE_COLUMNS;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;

  const { data: membersData } = useQuery({
    queryKey: ["organization-members", workspaceId, "bdd-picker"],
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

  const memberNames = useMemo(
    () => new Map((membersData?.items ?? []).map((m) => [m.id, m.name])),
    [membersData?.items]
  );
  const memberAvatars = useMemo(
    () => new Map((membersData?.items ?? []).map((m) => [m.id, m.avatar_url ?? null])),
    [membersData?.items]
  );

  const { data: bddData, isLoading: bddLoading } = useQuery({
    queryKey: ["bdd", workspaceId, page, pageSize, EMPTY_LISTES_FILTERS, debouncedSearch, "wf-picker"],
    queryFn: async () => {
      const url = buildBddUrl(page, pageSize, EMPTY_LISTES_FILTERS, debouncedSearch);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as BddApiResponse;
    },
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });

  const listesItems = bddData?.items ?? [];
  const total = bddData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = useMemo(
    () =>
      getBddColumns(() => {}, () => {}, memberNames, memberAvatars).filter(
        (c) => c.id !== "actions"
      ),
    [memberNames, memberAvatars]
  );

  const table = useReactTable({
    data: listesItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    enableRowSelection: true,
    state: { pagination, rowSelection, columnVisibility },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
  });

  const pageRowIds = useMemo(() => listesItems.map((r) => r.id), [listesItems]);

  useEffect(() => {
    if (!onSelectionChange) return;
    const selected = Object.entries(rowSelection)
      .filter(([, v]) => v)
      .map(([k]) => listesItems[parseInt(k, 10)])
      .filter((r): r is BddRow => Boolean(r));
    const ids = selected
      .map((r) => r.id)
      .sort()
      .join(",");
    if (ids !== lastIdsRef.current) {
      lastIdsRef.current = ids;
      onSelectionChange(selected, pageRowIds);
    }
  }, [rowSelection, listesItems, onSelectionChange, pageRowIds]);

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
          onClick={() => table.previousPage()}
          disabled={page <= 1 || bddLoading}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={page >= totalPages || bddLoading}
        >
          Suivant
        </Button>
      </div>
    </div>
  );

  const toolbar = (
    <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Input
        placeholder="Rechercher une liste…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {toolbarExtra}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {toolbar}
      <DataTableLayout
        variant="design2"
        table={table}
        isLoading={bddLoading}
        emptyMessage="Aucune liste. Importez des prospects depuis l’extension."
        footer={footer}
        fillHeight
      />
    </div>
  );
}
