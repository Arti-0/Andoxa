"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTableLayout } from "@/components/ui/data-table";
import { prospectColumns } from "./prospect-columns";
import type { FilterState } from "./prospect-filters";
import type { Prospect } from "@/lib/types/prospects";

interface ProspectTableProps {
  workspaceId: string | null;
  filters: FilterState;
}

interface ProspectsApiResponse {
  items: Prospect[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 20;

function buildProspectsUrl(
  baseUrl: string,
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
  return `${baseUrl}?${params.toString()}`;
}

async function fetchProspects(
  workspaceId: string,
  page: number,
  pageSize: number,
  filters: FilterState
): Promise<ProspectsApiResponse> {
  const url = buildProspectsUrl("/api/prospects", page, pageSize, filters);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return (json.data ?? json) as ProspectsApiResponse;
}

export function ProspectTable({ workspaceId, filters }: ProspectTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: [
      "prospects",
      workspaceId,
      page,
      pageSize,
      filters.status,
      filters.source,
      filters.bddId,
      filters.search,
    ],
    queryFn: () =>
      fetchProspects(workspaceId!, page, pageSize, filters),
    enabled: !!workspaceId,
    placeholderData: (previousData) => previousData,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    data: items,
    columns: prospectColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: { pagination },
    onPaginationChange: setPagination,
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
          disabled={page <= 1 || isLoading}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={page >= totalPages || isLoading}
        >
          Suivant
        </Button>
      </div>
    </div>
  );

  const emptyMessage =
    filters.search ||
    filters.status.length > 0 ||
    filters.source.length > 0 ||
    filters.bddId
      ? "Aucun prospect ne correspond aux filtres."
      : "Aucun prospect. Ajoutez-en un ou importez une liste depuis l'extension.";

  return (
    <div className="h-full overflow-hidden rounded-lg border bg-card">
      <DataTableLayout
        table={table}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        footer={footer}
        maxTableHeightClassName="max-h-[calc(100vh-320px)]"
      />
    </div>
  );
}
