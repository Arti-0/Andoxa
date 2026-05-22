"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/settings-card";
import { TagFormDialog, PIPELINE_PALETTE } from "./tag-form-dialog";

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string | null;
  updated_at: string | null;
  usage_count: number;
}

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
 * Tag dictionary, per-org. Backed by /api/tags. usage_count is reported by
 * the API so we can warn the admin before deleting an in-use tag.
 *
 * Create + edit both go through TagFormDialog so the experience matches
 * StatusList. Click a chip → edit. Click "+ Nouveau tag" → create.
 */
export function TagList() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<
    | { mode: "create" }
    | { mode: "edit"; tag: Tag }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tags");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Erreur de chargement");
      const payload = unwrap<{ items?: Tag[] }>(json);
      setItems((payload?.items ?? []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTag(values: { name: string; color: string }) {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        json?.error?.fieldErrors?.name ??
          json?.error?.message ??
          "Création impossible",
      );
    }
    const created = unwrap<Tag>(json);
    setItems((prev) =>
      [...prev, { ...created, usage_count: 0 }].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    toast.success(`Tag « ${values.name} » créé`);
  }

  async function patch(id: string, updates: Partial<Pick<Tag, "name" | "color">>) {
    const previous = items;
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error?.fieldErrors?.name ?? json?.error?.message ?? "Mise à jour impossible",
        );
      }
      const updated = unwrap<Tag>(json);
      setItems((prev) =>
        prev
          .map((t) =>
            t.id === id ? { ...updated, usage_count: t.usage_count } : t,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
      throw err;
    }
  }

  async function remove(tag: Tag) {
    const msg =
      tag.usage_count > 0
        ? `Supprimer le tag « ${tag.name} » et le retirer de ${tag.usage_count} prospect(s) ?`
        : `Supprimer le tag « ${tag.name} » ?`;
    if (!confirm(msg)) return;
    const previous = items;
    setItems((prev) => prev.filter((t) => t.id !== tag.id));
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Suppression impossible");
      }
      toast.success(`Tag « ${tag.name} » supprimé`);
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  return (
    <SettingsCard
      title="Tags"
      description="Étiquettes libres applicables à plusieurs prospects (ex. « ICP », « VIP », « À rappeler »). Cliquez un tag pour le modifier."
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          Aucun tag pour le moment. Créez-en ci-dessous pour étiqueter vos
          prospects librement (ex. « ICP », « VIP », « À rappeler »).
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              onOpenEdit={() => setDialog({ mode: "edit", tag })}
              onDelete={() => remove(tag)}
            />
          ))}
        </ul>
      )}

      <div className="mt-1">
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Nouveau tag
        </button>
      </div>

      <TagFormDialog
        open={dialog !== null}
        mode={dialog?.mode ?? "create"}
        initial={
          dialog?.mode === "edit"
            ? { name: dialog.tag.name, color: dialog.tag.color }
            : { name: "", color: PIPELINE_PALETTE[0] }
        }
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        onSubmit={async (values) => {
          if (dialog?.mode === "edit") {
            await patch(dialog.tag.id, values);
          } else {
            await createTag(values);
          }
          setDialog(null);
        }}
      />
    </SettingsCard>
  );
}

function TagChip({
  tag,
  onOpenEdit,
  onDelete,
}: {
  tag: Tag;
  onOpenEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative inline-flex items-center gap-1.5 rounded-full border border-border bg-card pl-2 pr-1 py-1 text-sm">
      <button
        type="button"
        onClick={onOpenEdit}
        className="flex items-center gap-1.5 rounded-full pr-1 text-left transition-colors hover:text-foreground"
      >
        <span
          className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: tag.color }}
          aria-hidden
        />
        <span className="font-medium text-foreground">{tag.name}</span>
        {tag.usage_count > 0 && (
          <span className="text-[11px] text-muted-foreground">
            · {tag.usage_count}
          </span>
        )}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Supprimer"
        onClick={onDelete}
        className="size-5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-3" />
      </Button>
    </li>
  );
}
