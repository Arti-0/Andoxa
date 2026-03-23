"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Settings2, Pencil, Check } from "lucide-react";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/kibo-ui/kanban";
import type { Prospect } from "@/lib/types/prospects";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/lib/types/prospects";
import type { FilterState } from "./crm-table";

const STATUS_DOTS: Record<ProspectStatus, string> = {
  new: "bg-slate-400",
  contacted: "bg-blue-500",
  qualified: "bg-amber-500",
  rdv: "bg-emerald-500",
  proposal: "bg-indigo-500",
  won: "bg-green-600",
  lost: "bg-red-500",
};

type KanbanItem = {
  id: string;
  name: string;
  column: ProspectStatus;
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

interface KanbanPrefs {
  hiddenStatuses: ProspectStatus[];
  customLabels: Partial<Record<ProspectStatus, string>>;
}

function getKanbanPrefs(workspaceId: string | null): KanbanPrefs {
  const key = `kanban-prefs-${workspaceId ?? "default"}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as KanbanPrefs) : { hiddenStatuses: [], customLabels: {} };
  } catch {
    return { hiddenStatuses: [], customLabels: {} };
  }
}

function saveKanbanPrefs(workspaceId: string | null, prefs: KanbanPrefs) {
  const key = `kanban-prefs-${workspaceId ?? "default"}`;
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

function KanbanSettings({
  prefs,
  onChange,
}: {
  prefs: KanbanPrefs;
  onChange: (p: KanbanPrefs) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProspectStatus | null>(null);
  const [editLabel, setEditLabel] = useState("");

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
            {PROSPECT_STATUSES.map((s) => {
              const label = prefs.customLabels[s] ?? PROSPECT_STATUS_LABELS[s];
              const hidden = prefs.hiddenStatuses.includes(s);
              const isEditing = editingStatus === s;
              return (
                <div key={s} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={() => {
                      const next = hidden
                        ? prefs.hiddenStatuses.filter((x) => x !== s)
                        : [...prefs.hiddenStatuses, s];
                      onChange({ ...prefs, hiddenStatuses: next });
                    }}
                    className="rounded border"
                  />
                  {isEditing ? (
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={() => {
                        onChange({ ...prefs, customLabels: { ...prefs.customLabels, [s]: editLabel.trim() || PROSPECT_STATUS_LABELS[s] } });
                        setEditingStatus(null);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      className="flex-1 rounded border bg-background px-1 py-0.5 text-xs"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 truncate">{label}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) return;
                      setEditLabel(label);
                      setEditingStatus(s);
                    }}
                    className="rounded p-0.5 hover:bg-muted"
                    title="Renommer"
                  >
                    {isEditing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                  </button>
                </div>
              );
            })}
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

  useEffect(() => {
    const items = (data?.items ?? []).map((prospect) => ({
      id: prospect.id,
      name: prospect.full_name ?? "Sans nom",
      column: (PROSPECT_STATUSES.includes((prospect.status ?? "new") as ProspectStatus)
        ? (prospect.status as ProspectStatus)
        : "new") as ProspectStatus,
      company: prospect.company,
    }));
    setKanbanData(items);
  }, [data?.items]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      nextStatus,
    }: {
      id: string;
      nextStatus: ProspectStatus;
    }) => {
      // Helpful log so you can see the outbound PATCH in DevTools
      console.log("[CRM Kanban] PATCH /api/prospects/%s", id, {
        status: nextStatus,
      });

      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        console.error("[CRM Kanban] PATCH failed", res.status, res.statusText);
        throw new Error(String(res.status));
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidate all prospect queries so Listes/Prospects/Kanban views refetch
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      const label = PROSPECT_STATUS_LABELS[variables.nextStatus];
      toast.success(`Statut mis à jour : ${label}`);
    },
  });

  const columns = useMemo(
    () =>
      PROSPECT_STATUSES
        .filter((s) => !kanbanPrefs.hiddenStatuses.includes(s))
        .map((status) => ({
          id: status,
          name: kanbanPrefs.customLabels[status] ?? PROSPECT_STATUS_LABELS[status],
        })),
    [kanbanPrefs]
  );

  const columnsBeforeDragRef = useRef<Map<string, ProspectStatus>>(new Map());

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

      if (changed.length > 0) {
        console.log("[CRM Kanban] Status change on drag end", {
          changes: changed.map((item) => ({
            id: item.id,
            from: beforeDrag.get(item.id),
            to: item.column,
          })),
        });
      }

      for (const item of changed) {
        const previousColumn = beforeDrag.get(item.id);
        updateStatusMutation.mutate(
          { id: item.id, nextStatus: item.column },
          {
            onError: () => {
              toast.error("Echec de la mise a jour du statut");
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
    <KanbanSettings prefs={kanbanPrefs} onChange={updatePrefs} />
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
          const dot = STATUS_DOTS[column.id as ProspectStatus] ?? "bg-slate-400";
          return (
            <KanbanBoard id={column.id} key={column.id} className="w-72 shrink-0 flex-col">
              <KanbanHeader className="gap-2 px-4 py-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
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
