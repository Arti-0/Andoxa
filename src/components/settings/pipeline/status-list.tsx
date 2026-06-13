"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  Archive,
  ArchiveRestore,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/settings-card";
import { StatusFormDialog, PIPELINE_PALETTE } from "./status-form-dialog";
import { StatusDeleteDialog } from "./status-delete-dialog";
import { cn } from "@/lib/utils";

interface ProspectStatus {
  id: string;
  key: string;
  name: string;
  color: string;
  sort_order: number;
  is_archived: boolean;
  /** Permanent status: renameable/reorderable, but not archivable/deletable. */
  is_system: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Unwrap the createApiHandler envelope ({ success, data }) when present. */
function unwrap<T = unknown>(json: unknown): T {
  if (
    json &&
    typeof json === "object" &&
    "data" in (json as Record<string, unknown>)
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * CRM pipeline statuses, per-org. Backed by /api/prospect-statuses.
 *
 * Every row is fully editable — seeded "default" statuses are just rows in
 * the same list, no special treatment. Drag the grip to reorder; the new
 * sort_order is patched per-row on drop. Archived statuses stay listed
 * (faded) so they can be restored or deleted later.
 *
 * Create + edit both go through the StatusFormDialog modal so the experience
 * is unified — clicking a row opens the same form as adding a new one.
 */
export function StatusList() {
  const [items, setItems] = useState<ProspectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<
    | { mode: "create" }
    | { mode: "edit"; status: ProspectStatus }
    | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<ProspectStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prospect-statuses?include_archived=1");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Erreur de chargement");
      const payload = unwrap<{ items?: ProspectStatus[] }>(json);
      setItems((payload?.items ?? []).sort(byOrder));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createStatus(values: { name: string; color: string }) {
    const nextOrder = items.length ? Math.max(...items.map((s) => s.sort_order)) + 10 : 10;
    const res = await fetch("/api/prospect-statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        color: values.color,
        sort_order: nextOrder,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        json?.error?.fieldErrors?.name ??
          json?.error?.message ??
          "Création impossible",
      );
    }
    const created = unwrap<ProspectStatus>(json);
    setItems((prev) => [...prev, created].sort(byOrder));
    toast.success(`Statut « ${values.name} » créé`);
  }

  async function patch(
    id: string,
    updates: Partial<Pick<ProspectStatus, "name" | "color" | "is_archived" | "sort_order">>,
  ) {
    // Optimistic: mutate locally first; rollback on error.
    const previous = items;
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    try {
      const res = await fetch(`/api/prospect-statuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error?.fieldErrors?.name ??
            json?.error?.message ??
            "Mise à jour impossible",
        );
      }
      const updated = unwrap<ProspectStatus>(json);
      setItems((prev) =>
        prev.map((s) => (s.id === id ? updated : s)).sort(byOrder),
      );
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
      throw err;
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const renumbered = reordered.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 }));
    const previous = items;
    setItems(renumbered);

    const changes = renumbered.filter(
      (s) => s.sort_order !== previous.find((p) => p.id === s.id)?.sort_order,
    );
    Promise.all(
      changes.map((s) =>
        fetch(`/api/prospect-statuses/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: s.sort_order }),
        }),
      ),
    )
      .then((responses) => {
        if (responses.some((r) => !r.ok)) throw new Error("partial failure");
      })
      .catch(() => {
        setItems(previous);
        toast.error("Impossible de réorganiser le pipeline");
      });
  }

  const activeItems = items.filter((s) => !s.is_archived);

  return (
    <SettingsCard
      title="Statuts du pipeline"
      description="L'ordre ci-dessous détermine la progression dans le pipeline. Tout est modifiable — cliquez un statut pour le renommer ou recolorer, glissez la poignée pour réorganiser."
    >
      {activeItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5">
          {activeItems.map((s, i) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-[12.5px]">
              <span
                className="size-2 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="text-foreground/85">{s.name}</span>
              {i < activeItems.length - 1 && (
                <span className="text-muted-foreground/50">›</span>
              )}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          Aucun statut. Ajoutez le premier pour commencer.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col">
              {items.map((s) => (
                <SortableStatusRow
                  key={s.id}
                  status={s}
                  onOpenEdit={() => setDialog({ mode: "edit", status: s })}
                  onToggleArchive={() =>
                    void patch(s.id, { is_archived: !s.is_archived })
                  }
                  onDelete={() => setDeleteTarget(s)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-1">
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Nouveau statut
        </button>
      </div>

      <StatusFormDialog
        open={dialog !== null}
        mode={dialog?.mode ?? "create"}
        initial={
          dialog?.mode === "edit"
            ? { name: dialog.status.name, color: dialog.status.color }
            : { name: "", color: PIPELINE_PALETTE[0] }
        }
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        onSubmit={async (values) => {
          if (dialog?.mode === "edit") {
            await patch(dialog.status.id, values);
          } else {
            await createStatus(values);
          }
          setDialog(null);
        }}
      />

      <StatusDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        status={deleteTarget}
        allStatuses={items}
        onDeleted={(id) => {
          setItems((prev) => prev.filter((s) => s.id !== id));
        }}
      />
    </SettingsCard>
  );
}

function SortableStatusRow({
  status,
  onOpenEdit,
  onToggleArchive,
  onDelete,
}: {
  status: ProspectStatus;
  onOpenEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 border-b border-border/50 py-2 pl-1 pr-1 transition-opacity last:border-b-0",
        status.is_archived && "opacity-55",
        isDragging && "z-10 bg-card shadow-md ring-1 ring-border",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        aria-label="Réordonner"
      >
        <GripVertical className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onOpenEdit}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60"
      >
        <span
          className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: status.color }}
          aria-hidden
        />
        <span className="min-w-0 truncate text-[13.5px] font-medium text-foreground">
          {status.name}
        </span>
        {status.is_system && (
          <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            Permanent
          </span>
        )}
        {status.is_archived && (
          <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            Archivé
          </span>
        )}
      </button>

      {/* Permanent statuses can be renamed/reordered but never archived or
          deleted — the CRM and campaign automation rely on them existing. */}
      {!status.is_system && (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={status.is_archived ? "Restaurer" : "Archiver"}
            onClick={onToggleArchive}
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            {status.is_archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Supprimer"
            onClick={onDelete}
            className="size-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}

function byOrder(a: ProspectStatus, b: ProspectStatus): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.name.localeCompare(b.name);
}
