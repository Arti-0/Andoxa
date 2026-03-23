"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
  type VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableLayout } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getProspectColumns } from "./prospect-columns";
import { getBddColumns } from "./bdd-columns";
import type { Prospect } from "@/lib/types/prospects";

export interface FilterState {
  status: string[];
  source: string[];
  tags: string[];
  assignedTo: string | null;
  dateRange: { from: Date; to: Date } | null;
  search: string;
  bddId: string | null;
}

export interface BddItem {
  id: string;
  name: string;
  source: string;
  created_at: string | null;
}

export interface BddRow {
  id: string;
  name: string;
  source: string;
  proprietaire: string | null;
  created_at: string | null;
  prospects_count?: number;
  phones_count?: number;
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
  mode: "listes" | "prospects" | "corbeille";
  workspaceId: string | null;
  prospectFilters: FilterState;
  listesFilters: ListesFilterState;
  onSelectList: (bddId: string | null) => void;
  /** Map of user id -> display name for authors */
  memberNames: Map<string, string>;
  /** Map of user id -> avatar_url for authors (optional) */
  memberAvatars?: Map<string, string | null>;
  /** Callback appelé quand la sélection des prospects change (vue prospects uniquement) */
  onSelectionChange?: (prospects: Prospect[]) => void;
  /** Callback appelé quand la sélection des listes change (vue listes uniquement) */
  onListesSelectionChange?: (listes: BddRow[]) => void;
}

const COLUMN_LABELS: Record<string, string> = {
  select: "Sélection",
  full_name: "Nom",
  company: "Entreprise",
  status: "Statut",
  contact: "Contact",
  source: "Source",
  created_at: "Date",
  deleted_at: "Supprimé le",
  actions: "Actions",
  enriched_at: "Enrichi le",
  enrichment_source: "Source enrichissement",
  phones_count: "Tél.",
};

function getStoredVisibility(storageKey: string): VisibilityState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as VisibilityState) : {};
  } catch {
    return {};
  }
}

function ColumnVisibilityToggle({
  columns,
  visibility,
  onChange,
}: {
  columns: { id: string; label: string }[];
  visibility: VisibilityState;
  onChange: (v: VisibilityState) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-accent"
        title="Colonnes"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Colonnes
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border bg-card p-2 shadow-lg">
            {columns.map((col) => (
              <label
                key={col.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={visibility[col.id] !== false}
                  onChange={(e) => onChange({ ...visibility, [col.id]: e.target.checked })}
                  className="rounded border"
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Table prospects - composant séparé pour éviter les violations des Rules of Hooks */
function ProspectsTableContent({
  workspaceId,
  prospectFilters,
  onSelectionChange,
}: {
  workspaceId: string | null;
  prospectFilters: FilterState;
  onSelectionChange?: (prospects: Prospect[]) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const lastSelectedIdsRef = useRef<string>("");

  const VISIBILITY_KEY = `crm-col-vis-${workspaceId ?? "default"}`;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const stored = getStoredVisibility(VISIBILITY_KEY);
    return {
      enriched_at: false,
      enrichment_source: false,
      ...stored,
    };
  });

  const persistVisibility = useCallback(
    (v: VisibilityState) => {
      setColumnVisibility(v);
      try {
        localStorage.setItem(VISIBILITY_KEY, JSON.stringify(v));
      } catch { /* ignore */ }
    },
    [VISIBILITY_KEY]
  );

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
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });

  const prospectsItems = prospectsData?.items ?? [];

  const { data: inviteQuota } = useQuery({
    queryKey: ["linkedin-invite-quota", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/unipile/invite-quota", {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        data?: { used: number; cap: number; period_start: string };
      };
      return json.data ?? null;
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const linkedInInviteMutation = useMutation({
    mutationFn: async (prospectId: string) => {
      const res = await fetch("/api/unipile/prospects/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prospect_id: prospectId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (json as { error?: { message?: string } })?.error?.message ??
          `Erreur ${res.status}`;
        throw new Error(msg);
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linkedin-invite-quota"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Invitation LinkedIn envoyée");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleLinkedInInvite = useCallback(
    (p: Prospect) => {
      linkedInInviteMutation.mutate(p.id);
    },
    [linkedInInviteMutation]
  );

  const invitePendingProspectId = linkedInInviteMutation.isPending
    ? linkedInInviteMutation.variables
    : null;

  useEffect(() => {
    if (!onSelectionChange) return;
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
  }, [rowSelection, prospectsItems, onSelectionChange]);

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

  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string }) => {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: value || null }),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });

  const [prospectToDelete, setProspectToDelete] = useState<Prospect | null>(null);

  const handleDeleteProspect = (prospect: Prospect) => {
    setProspectToDelete(prospect);
  };

  const confirmDeleteProspect = () => {
    if (prospectToDelete) {
      deleteProspectMutation.mutate(prospectToDelete.id);
      setProspectToDelete(null);
    }
  };

  const handleUpdateProspect = (id: string, field: string, value: string) => {
    updateProspectMutation.mutate({ id, field, value });
  };

  const items = prospectsData?.items ?? [];
  const total = prospectsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allMetaKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const p of items) {
      const meta = p.metadata as Record<string, unknown> | null;
      if (meta) Object.keys(meta).forEach((k) => keys.add(k));
    }
    return [...keys];
  }, [items]);

  const columns = useMemo(
    () =>
      getProspectColumns(handleDeleteProspect, handleUpdateProspect, {
        metadataKeys: allMetaKeys,
        onLinkedInInvite: handleLinkedInInvite,
        inviteQuota: inviteQuota ?? undefined,
        invitePendingProspectId,
      }),
    [
      allMetaKeys,
      handleLinkedInInvite,
      inviteQuota,
      invitePendingProspectId,
    ]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    enableRowSelection: true,
    state: { pagination, rowSelection, columnVisibility },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      persistVisibility(next);
    },
  });

  const toggleableCols = table
    .getAllColumns()
    .filter((c) => !["select", "actions"].includes(c.id) && c.getCanHide?.())
    .map((c) => ({ id: c.id, label: COLUMN_LABELS[c.id] ?? c.id }));

  const footer = (
    <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        {total > 0 ? (
          <span>
            {total} prospect{total > 1 ? "s" : ""} · Page {page} sur {totalPages}
          </span>
        ) : (
          <span>Aucun prospect</span>
        )}
        <ColumnVisibilityToggle
          columns={toggleableCols}
          visibility={columnVisibility}
          onChange={persistVisibility}
        />
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
    <div className="h-full overflow-hidden">
      <DataTableLayout
        variant="design2"
        table={table}
        isLoading={prospectsLoading}
        emptyMessage={emptyMessage}
        footer={footer}
        maxTableHeightClassName="max-h-[calc(100vh-360px)]"
        onRowClick={(row) => router.push(`/prospect/${row.original.id}`)}
      />
      <ConfirmDialog
        open={!!prospectToDelete}
        onOpenChange={(open) => { if (!open) setProspectToDelete(null); }}
        title="Supprimer ce prospect ?"
        description={`Le prospect "${prospectToDelete?.full_name ?? prospectToDelete?.email ?? "sans nom"}" sera déplacé dans la corbeille.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={confirmDeleteProspect}
      />
    </div>
  );
}

/** Table corbeille - prospects supprimés, lazy-loaded */
function CorbeilleTableContent({ workspaceId }: { workspaceId: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;

  const { data: trashData, isLoading } = useQuery({
    queryKey: ["prospects-trash", workspaceId, page, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/trash?page=${page}&pageSize=${pageSize}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as { items: Prospect[]; total: number };
    },
    enabled: !!workspaceId,
    placeholderData: (prev) => prev,
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prospects/${id}/restore`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects-trash"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect restauré");
    },
  });

  const handleRestore = (p: Prospect) => {
    restoreMutation.mutate(p.id);
  };

  const items = trashData?.items ?? [];
  const total = trashData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    data: items,
    columns: getProspectColumns(() => {}, undefined, { trashMode: true, onRestore: handleRestore }),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    enableRowSelection: false,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  const footer = (
    <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        {total > 0 ? (
          <span>
            {total} prospect{total > 1 ? "s" : ""} supprimé{total > 1 ? "s" : ""} · Page {page} sur {totalPages}
          </span>
        ) : (
          <span>Corbeille vide</span>
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

  return (
    <div className="h-full overflow-hidden">
      <DataTableLayout
        variant="design2"
        table={table}
        isLoading={isLoading}
        emptyMessage="Aucun prospect dans la corbeille."
        footer={footer}
        maxTableHeightClassName="max-h-[calc(100vh-360px)]"
        onRowClick={(row) => router.push(`/prospect/${row.original.id}`)}
      />
    </div>
  );
}

/** Table listes - composant séparé pour éviter les violations des Rules of Hooks */
function ListesTableContent({
  workspaceId,
  prospectFilters,
  listesFilters,
  onSelectList,
  memberNames,
  memberAvatars,
  onListesSelectionChange,
}: {
  workspaceId: string | null;
  prospectFilters: FilterState;
  listesFilters: ListesFilterState;
  onSelectList: (bddId: string | null) => void;
  memberNames: Map<string, string>;
  memberAvatars?: Map<string, string | null>;
  onListesSelectionChange?: (listes: BddRow[]) => void;
}) {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [listesRowSelection, setListesRowSelection] = useState<
    Record<string, boolean>
  >({});
  const lastSelectedListesIdsRef = useRef<string>("");

  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;

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
    enabled: !!workspaceId,
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

  const [bddToDelete, setBddToDelete] = useState<string | null>(null);

  const handleDeleteBdd = (id: string) => {
    setBddToDelete(id);
  };

  const confirmDeleteBdd = () => {
    if (bddToDelete) {
      deleteBddMutation.mutate(bddToDelete);
      setBddToDelete(null);
    }
  };

  const bddItems = bddData?.items ?? [];
  const total = bddData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listesItems = bddItems;

  useEffect(() => {
    if (!onListesSelectionChange) return;
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
  }, [listesRowSelection, listesItems, onListesSelectionChange]);

  const bddColumns = getBddColumns(onSelectList, handleDeleteBdd, memberNames, memberAvatars);

  const listesTable = useReactTable({
    data: listesItems,
    columns: bddColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    enableRowSelection: true,
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
    <div className="h-full overflow-hidden">
      <DataTableLayout
        variant="design2"
        table={listesTable}
        isLoading={bddLoading}
        emptyMessage={emptyMessage}
        footer={footer}
        maxTableHeightClassName="max-h-[calc(100vh-360px)]"
        onRowClick={(row) => onSelectList(row.original.id)}
      />
      <ConfirmDialog
        open={!!bddToDelete}
        onOpenChange={(open) => { if (!open) setBddToDelete(null); }}
        title="Supprimer cette liste ?"
        description="Les prospects associés seront conservés."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={confirmDeleteBdd}
      />
    </div>
  );
}

export function CrmTable({
  mode,
  workspaceId,
  prospectFilters,
  listesFilters,
  onSelectList,
  memberNames,
  memberAvatars,
  onSelectionChange,
  onListesSelectionChange,
}: CrmTableProps) {
  if (mode === "prospects") {
    return (
      <ProspectsTableContent
        workspaceId={workspaceId}
        prospectFilters={prospectFilters}
        onSelectionChange={onSelectionChange}
      />
    );
  }
  if (mode === "corbeille") {
    return <CorbeilleTableContent workspaceId={workspaceId} />;
  }
  return (
    <ListesTableContent
      workspaceId={workspaceId}
      prospectFilters={prospectFilters}
      listesFilters={listesFilters}
      onSelectList={onSelectList}
      memberNames={memberNames}
      memberAvatars={memberAvatars ?? undefined}
      onListesSelectionChange={onListesSelectionChange}
    />
  );
}
