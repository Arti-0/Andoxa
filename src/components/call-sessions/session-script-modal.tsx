"use client";

// Script editor for a call session. User writes the script once; variables
// like {{firstName}} render with the active prospect's data so the rep can
// read it aloud without manual edits.
//
// Mount from the session detail page when ready. The component is fully
// standalone — `sessionId` + the list of prospects + an open/close pair is
// everything it needs.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ProspectLite {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  job_title?: string | null;
}

const VARS: { token: string; label: string; field: keyof ProspectLite | "first" | "last" }[] = [
  { token: "{{firstName}}", label: "Prénom", field: "first" },
  { token: "{{lastName}}", label: "Nom", field: "last" },
  { token: "{{company}}", label: "Société", field: "company" },
  { token: "{{jobTitle}}", label: "Poste", field: "job_title" },
];

function splitName(full: string | null | undefined): { first: string; last: string } {
  if (!full) return { first: "", last: "" };
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/** Replace {{tokens}} with the prospect's actual fields. Missing values
 *  stay as the raw token so the rep notices the gap. */
function interpolate(text: string, p: ProspectLite | undefined): string {
  if (!p) return text;
  const { first, last } = splitName(p.full_name ?? null);
  const map: Record<string, string> = {
    firstName: p.first_name ?? first ?? "",
    lastName: p.last_name ?? last ?? "",
    company: p.company ?? "",
    jobTitle: p.job_title ?? "",
  };
  return text.replace(/\{\{([a-zA-Z]+)\}\}/g, (m, key) =>
    map[key] && map[key].length > 0 ? map[key] : m,
  );
}

export function SessionScriptModal({
  open,
  onOpenChange,
  sessionId,
  prospects,
  currentProspectIndex = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  prospects: ProspectLite[];
  /** Which prospect drives the preview pane by default. */
  currentProspectIndex?: number;
}) {
  const qc = useQueryClient();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [previewIdx, setPreviewIdx] = useState(currentProspectIndex);

  const { data, isLoading } = useQuery({
    queryKey: ["call-session-script", sessionId] as const,
    enabled: open && !!sessionId,
    queryFn: async () => {
      const res = await fetch(`/api/call-sessions/${sessionId}/script`, {
        credentials: "include",
      });
      if (!res.ok) return { script_template: null };
      const json = await res.json();
      return (json.data ?? json) as { script_template: string | null };
    },
  });

  // Seed editor with existing script when the modal opens / session changes.
  useEffect(() => {
    if (open && data) {
      setText(data.script_template ?? "");
      setPreviewIdx(currentProspectIndex);
    }
  }, [open, data, currentProspectIndex]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/call-sessions/${sessionId}/script`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script_template: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: { message?: string } }).error?.message ?? "Échec",
        );
      }
    },
    onSuccess: () => {
      toast.success("Script enregistré");
      void qc.invalidateQueries({ queryKey: ["call-session-script", sessionId] });
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erreur");
    },
  });

  const insertVar = (token: string) => {
    const el = taRef.current;
    if (!el) {
      setText(text + token);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const previewProspect = prospects[previewIdx] ?? prospects[0];
  const rendered = interpolate(text, previewProspect);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 pt-5 pb-3">
          <DialogTitle>Script de la session</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {/* LEFT — editor */}
              <div>
                <Label className="mb-2 block">Script</Label>
                <div className="mb-2 flex flex-wrap gap-1">
                  {VARS.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVar(v.token)}
                      className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-tint)] hover:text-[var(--brand-blue)]"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={14}
                  maxLength={20_000}
                  placeholder={
                    "Bonjour {{firstName}}, c'est __ d'Andoxa.\n\nJe vous appelle au sujet de {{company}}…"
                  }
                  className="resize-none font-mono text-[12.5px] leading-relaxed"
                />
                <div className="mt-1 flex justify-end font-mono text-[11px] tabular-nums text-muted-foreground">
                  {text.length.toLocaleString("fr-FR")}/20 000
                </div>
              </div>

              {/* RIGHT — live preview */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Aperçu</Label>
                  {prospects.length > 1 && (
                    <select
                      value={previewIdx}
                      onChange={(e) => setPreviewIdx(Number(e.target.value))}
                      className="rounded border bg-background px-1.5 py-0.5 text-[11.5px]"
                    >
                      {prospects.map((p, i) => (
                        <option key={p.id} value={i}>
                          {p.full_name ?? "Sans nom"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="min-h-[260px] whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-[13px] leading-relaxed">
                  {rendered || (
                    <span className="text-muted-foreground">
                      L&apos;aperçu apparaît ici…
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-[11px] leading-snug text-muted-foreground",
                    rendered.includes("{{") && "text-amber-700",
                  )}
                >
                  {rendered.includes("{{")
                    ? "⚠ Certaines variables ne sont pas remplacées — donnée manquante sur le prospect."
                    : "Variables remplacées avec les données du prospect sélectionné."}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            <X className="size-3.5" />
            Annuler
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
