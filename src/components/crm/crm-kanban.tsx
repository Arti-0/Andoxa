"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { GripVertical, Settings2 } from "lucide-react";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/kibo-ui/kanban";
import type { Prospect } from "@/lib/types/prospects";
import { useProspectStatuses } from "@/lib/prospects/statuses";
import type { FilterState } from "./crm-table";

type KanbanItem = {
  id: string;
  name: string;
  /** Status key (e.g. "new", "qualified", or a custom user-defined key). */
  column: string;
  company: string | null;
};

interface ProspectsApiResponse {
  items: Prospect[];
}

interface CrmKanbanProps {
  workspaceId: string | null;
  prospectFilters: FilterState;
}

function buildProspectsUrl(filters: FilterState): string {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", "500");
  if (filters.status.length > 0) params.set("status", filters.status.join(","));
  if (filters.source.length > 0) params.set("source", filters.source.join(","));
  if (filters.bddId) params.set("bdd_id", filters.bddId);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return `/api/prospects?${params.toString()}`;
}

/**
 * User-scoped kanban prefs. Status renames now live in the per-org
 * `prospect_statuses` table (editable from Settings → Pipeline), so this
 * only tracks which columns the current user wants hidden in their
 * kanban view — not the names themselves.
 */
interface KanbanPrefs {
  /** Status keys the user has chosen to hide. */
  hiddenStatuses: string[];
}

function getKanbanPrefs(workspaceId: string | null): KanbanPrefs {
  const key = `kanban-prefs-${workspaceId ?? "default"}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { hiddenStatuses: [] };
    const parsed = JSON.parse(raw) as { hiddenStatuses?: string[] };
    return { hiddenStatuses: parsed.hiddenStatuses ?? [] };
  } catch {
    return { hiddenStatuses: [] };
  }
}

function saveKanbanPrefs(workspaceId: string | null, prefs: KanbanPrefs) {
  const key = `kanban-prefs-${workspaceId ?? "default"}`;
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

function KanbanSettings({
  statuses,
  prefs,
  onChange,
}: {
  statuses: Array<{ key: string; name: string; color: string }>;
  prefs: KanbanPrefs;
  onChange: (p: KanbanPrefs) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-accent"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Colonnes Kanban
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-card p-2 shadow-lg">
            <div className="mb-1.5 px-2 pt-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Colonnes visibles
            </div>
            {statuses.map((s) => {
              const hidden = prefs.hiddenStatuses.includes(s.key);
              return (
                <label
                  key={s.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={() => {
                      const next = hidden
                        ? prefs.hiddenStatuses.filter((x) => x !== s.key)
                        : [...prefs.hiddenStatuses, s.key];
                      onChange({ ...prefs, hiddenStatuses: next });
                    }}
                    className="rounded border"
                  />
                  <span
                    className="size-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 truncate">{s.name}</span>
                </label>
              );
            })}
            <div className="mt-1 border-t pt-1.5 px-2 text-[11px] text-muted-foreground">
              Pour renommer ou ajouter des statuts, utilisez l&apos;icône
              paramètres dans l&apos;onglet Prospects.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function CrmKanban({ workspaceId, prospectFilters }: CrmKanbanProps) {
  const queryClient = useQueryClient();
  const [kanbanData, setKanbanData] = useState<KanbanItem[]>([]);
  const [kanbanPrefs, setKanbanPrefs] = useState<KanbanPrefs>(() => getKanbanPrefs(workspaceId));

  const { statuses } = useProspectStatuses();
  const activeStatuses = useMemo(
    () => statuses.filter((s) => !s.is_archived),
    [statuses],
  );

  const updatePrefs = useCallback(
    (next: KanbanPrefs) => {
      setKanbanPrefs(next);
      saveKanbanPrefs(workspaceId, next);
    },
    [workspaceId]
  );

  const { data, isLoading } = useQuery({
    queryKey: [
      "prospects",
      "kanban",
      workspaceId,
      prospectFilters.status,
      prospectFilters.source,
      prospectFilters.bddId,
      prospectFilters.search,
    ],
    queryFn: async () => {
      const res = await fetch(buildProspectsUrl(prospectFilters), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as ProspectsApiResponse;
    },
    enabled: !!workspaceId,
  });

  const knownStatusKeys = useMemo(
    () => new Set(activeStatuses.map((s) => s.key)),
    [activeStatuses],
  );
  // Fallback column when the prospect's status isn't in the active set
  // (archived, deleted, or unmapped legacy value).
  const fallbackColumn = activeStatuses[0]?.key ?? "new";

  useEffect(() => {
    const items = (data?.items ?? []).map((prospect) => ({
      id: prospect.id,
      name: prospect.full_name ?? "Sans nom",
      column:
        prospect.status && knownStatusKeys.has(prospect.status)
          ? prospect.status
          : fallbackColumn,
      company: prospect.company,
    }));
    setKanbanData(items);
  }, [data?.items, knownStatusKeys, fallbackColumn]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      nextStatus,
    }: {
      id: string;
      nextStatus: string;
    }) => {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      const label =
        activeStatuses.find((s) => s.key === variables.nextStatus)?.name ??
        variables.nextStatus;
      toast.success(`Statut mis à jour : ${label}`);
    },
  });

  const columns = useMemo(
    () =>
      activeStatuses
        .filter((s) => !kanbanPrefs.hiddenStatuses.includes(s.key))
        .map((s) => ({
          id: s.key,
          name: s.name,
          color: s.color,
        })),
    [activeStatuses, kanbanPrefs.hiddenStatuses],
  );

  const columnsBeforeDragRef = useRef<Map<string, string>>(new Map());

  const handleVisualChange = (nextData: KanbanItem[]) => {
    setKanbanData(nextData);
  };

  const handleDragStart = useCallback(
    (_event: import("@dnd-kit/core").DragStartEvent) => {
      columnsBeforeDragRef.current = new Map(
        kanbanData.map((item) => [item.id, item.column])
      );
    },
    [kanbanData]
  );

  const handleDragComplete = useCallback(
    (finalData: KanbanItem[]) => {
      const beforeDrag = columnsBeforeDragRef.current;
      if (beforeDrag.size === 0) return;

      const changed = finalData.filter(
        (item) => beforeDrag.get(item.id) !== item.column
      );

      for (const item of changed) {
        const previousColumn = beforeDrag.get(item.id);
        updateStatusMutation.mutate(
          { id: item.id, nextStatus: item.column },
          {
            onError: () => {
              toast.error("Échec de la mise à jour du statut");
              if (!previousColumn) return;
              setKanbanData((current) =>
                current.map((entry) =>
                  entry.id === item.id
                    ? { ...entry, column: previousColumn }
                    : entry
                )
              );
            },
          }
        );
      }
    },
    [updateStatusMutation]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border bg-card shadow-xs">
        <p className="text-sm text-muted-foreground">Chargement du pipeline...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <KanbanSettings statuses={activeStatuses} prefs={kanbanPrefs} onChange={updatePrefs} />
      <KanbanProvider
        columns={columns}
        data={kanbanData}
        onDataChange={handleVisualChange}
        onDragComplete={handleDragComplete}
        onDragStart={handleDragStart}
        className="flex gap-3 overflow-x-auto pb-4 min-w-0"
      >
        {(column) => {
          const count = kanbanData.filter((item) => item.column === column.id).length;
          // `column.color` is injected via columns above; the KanbanProvider
          // typing is generic so we read it back conservatively.
          const color =
            (column as { color?: string }).color ?? "#94a3b8";
          return (
            <KanbanBoard id={column.id} key={column.id} className="w-72 shrink-0 flex-col">
              <KanbanHeader className="gap-2 px-4 py-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{column.name}</span>
                <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums">
                  {count}
                </span>
              </KanbanHeader>
              <KanbanCards id={column.id} maxHeight="calc(100vh - 360px)">
                {(item) => (
                  <KanbanCard key={item.id} {...item}>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          href={`/prospect/${item.id}`}
                          className="truncate text-sm font-medium hover:underline block"
                        >
                          {item.name}
                        </Link>
                        <p className="pl-0 text-xs text-muted-foreground truncate">
                          {typeof item.company === "string" && item.company.trim().length > 0
                            ? item.company
                            : "Sans société"}
                        </p>
                      </div>
                    </div>
                  </KanbanCard>
                )}
              </KanbanCards>
            </KanbanBoard>
          );
        }}
      </KanbanProvider>
    </div>
  );
}
