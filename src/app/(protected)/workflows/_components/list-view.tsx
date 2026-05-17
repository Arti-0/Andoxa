"use client";

// List view — data from /api/workflows. Theme-aligned with bg-card / bg-background.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon, ICO } from "./icons";
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
} from "@/lib/workflows";
import { toastFromApiError } from "@/lib/toast";
import { LaunchButton } from "./launch-button";
import type { DesignTag, DesignWorkflowCard } from "./workflow-mapping";
import { cn } from "@/lib/utils";

const STATUS_CFG = {
  active: { label: "Actif", bg: "#ECFDF5", color: "#15803D", dot: "#10B981" },
  draft: { label: "Brouillon", bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
  paused: { label: "En pause", bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
  error: { label: "Erreur", bg: "#FFF1F2", color: "#BE123C", dot: "#F43F5E" },
} as const;

const TAG_CFG: Record<DesignTag, { bg: string; color: string }> = {
  WhatsApp: { bg: "#ECFDF5", color: "#065F46" },
  LinkedIn: { bg: "#EFF6FF", color: "#0A66C2" },
  CRM: { bg: "#EFF6FF", color: "#1E3A8A" },
  IA: { bg: "#F0FDF4", color: "#047857" },
};

interface UserTemplate {
  id: string;
  name: string;
  description: string | null;
}

function TopBar({
  userTemplates,
  onUseTemplate,
  busyTemplateId,
}: {
  userTemplates: UserTemplate[];
  onUseTemplate: (
    source: "builtin" | "user",
    templateId: string,
    name: string
  ) => void;
  busyTemplateId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="flex min-h-14 shrink-0 flex-col gap-4 border-b border-border bg-card px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-xl text-[13px] leading-snug text-muted-foreground">
        Créez des séquences automatisées sur WhatsApp, LinkedIn, le booking et le CRM.
      </p>
      <div ref={popoverRef} className="relative flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-sm transition-colors",
            open
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:bg-accent",
          )}
        >
          <span className="text-muted-foreground [&_svg]:block">
            <Icon size={14} color="currentColor" d={ICO.hamburger} />
          </span>
          Utiliser un modèle
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-2 max-h-[min(480px,70vh)] w-[360px] overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lg"
          >
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Modèles intégrés
            </div>
            {WORKFLOW_TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={busyTemplateId !== null}
                onClick={() => {
                  setOpen(false);
                  onUseTemplate("builtin", t.id, t.name);
                }}
                className={cn(
                  "mb-0.5 block w-full rounded-lg px-2.5 py-2 text-left transition-colors",
                  busyTemplateId === `builtin:${t.id}`
                    ? "bg-muted"
                    : "hover:bg-accent",
                  busyTemplateId !== null && "cursor-wait opacity-70",
                  busyTemplateId === null && "cursor-pointer",
                )}
              >
                <div className="text-[13px] font-semibold text-foreground">
                  {t.name}
                  {t.popular && (
                    <span className="ml-1.5 inline align-middle rounded-lg bg-orange-600 px-1.5 py-px text-[9.5px] font-bold text-white dark:bg-orange-500">
                      Populaire
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {t.description}
                </div>
              </button>
            ))}

            {userTemplates.length > 0 && (
              <>
                <div className="mx-1 my-1.5 h-px bg-border" />
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Vos modèles
                </div>
                {userTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busyTemplateId !== null}
                    onClick={() => {
                      setOpen(false);
                      onUseTemplate("user", t.id, t.name);
                    }}
                    className={cn(
                      "mb-0.5 block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent",
                      busyTemplateId !== null && "cursor-wait opacity-70",
                      busyTemplateId === null && "cursor-pointer",
                    )}
                  >
                    <div className="text-[13px] font-semibold text-foreground">
                      {t.name}
                    </div>
                    {t.description && (
                      <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {t.description}
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        <Link
          href="/workflows/new"
          className="flex items-center gap-1.5 rounded-lg bg-(--brand-blue) px-4 py-1.5 text-[13px] font-semibold text-white no-underline shadow-sm transition-colors hover:bg-(--brand-blue)/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
        >
          <Icon size={14} color="currentColor" d={ICO.plus} />
          Créer un workflow
        </Link>
      </div>
    </div>
  );
}

export type { UserTemplate };

function WorkflowCard({
  wf,
  onOpen,
  onLaunch,
}: {
  wf: DesignWorkflowCard;
  onOpen: (id: string) => void;
  onLaunch: (id: string) => void;
}) {
  const launchDisabled = wf.status === "draft" || wf.status === "error";
  const launchReason =
    wf.status === "draft"
      ? "Enregistrez le parcours d'abord."
      : wf.status === "error"
        ? "Le parcours est en erreur."
        : undefined;
  const sc = STATUS_CFG[wf.status];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(wf.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(wf.id);
        }
      }}
      className="group/card cursor-pointer rounded-[14px] border border-border bg-card px-5 py-[18px] shadow-sm outline-none ring-offset-background transition-all hover:border-primary/45 hover:shadow-md hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-ring dark:border-border dark:hover:border-primary/40 dark:hover:shadow-primary/15"
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <div className="max-w-full truncate text-[14.5px] font-bold text-foreground">
              {wf.name}
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-black/5 dark:ring-white/10"
              style={{
                background: sc.bg,
                color: sc.color,
              }}
            >
              <div
                className="size-1 rounded-full"
                style={{ background: sc.dot }}
              />
              {sc.label}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mb-3.5 min-h-[38px] text-[13px] leading-snug text-muted-foreground",
          !wf.description && "italic",
          wf.description && "text-foreground/80 dark:text-muted-foreground",
        )}
      >
        {wf.description || "Aucune description."}
      </div>

      <div className="grid grid-cols-4 gap-0 overflow-hidden rounded-[10px] border border-border bg-muted/45 dark:bg-muted/30">
        {[
          { label: "Prospects", value: wf.stats.enrolled },
          { label: "Taux de réponse", value: wf.stats.replyRate },
          { label: "Réunions", value: wf.stats.meetings },
          { label: "Conversion", value: wf.stats.conversion },
        ].map((s, i) => (
          <div
            key={i}
            className={cn(
              "px-3 py-2.5 text-center",
              i > 0 && "border-l border-border",
            )}
          >
            <div className="text-base font-bold tracking-tight text-foreground">
              {s.value}
            </div>
            <div className="mt-px text-[10.5px] font-medium text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {wf.tags.map((t) => {
            const tc = TAG_CFG[t];
            return (
              <span
                key={t}
                style={{
                  background: tc.bg,
                  color: tc.color,
                }}
                className="rounded px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-black/[0.06] dark:ring-white/10"
              >
                {t}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            Modifié {wf.lastModified}
          </span>
          <LaunchButton
            variant="outline"
            disabled={launchDisabled}
            disabledReason={launchReason}
            onClick={() => onLaunch(wf.id)}
          />
        </div>
      </div>
    </div>
  );
}

export interface ListViewProps {
  workflows: DesignWorkflowCard[];
  loading: boolean;
  userTemplates: UserTemplate[];
  onLaunch: (workflowId: string) => void;
}

export function ListView({
  workflows,
  loading,
  userTemplates,
  onLaunch,
}: ListViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);

  const handleUseTemplate = async (
    source: "builtin" | "user",
    templateId: string,
    name: string
  ) => {
    setBusyTemplateId(`${source}:${templateId}`);
    try {
      let body: Record<string, unknown>;
      if (source === "builtin") {
        const tpl: WorkflowTemplate | undefined = WORKFLOW_TEMPLATES.find(
          (t) => t.id === templateId
        );
        if (!tpl) throw new Error("Modèle introuvable.");
        body = {
          name: tpl.name,
          description: tpl.description,
          draft_definition: tpl.buildDefinition(),
          ui: {
            icon: tpl.ui.icon,
            color: tpl.ui.color,
            trigger: tpl.trigger,
          },
        };
      } else {
        const res = await fetch(`/api/workflows/${templateId}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message ?? "Modèle introuvable.");
        }
        const wf = json.data.workflow as {
          description: string | null;
          draft_definition: unknown;
          metadata: unknown;
        };
        body = {
          name,
          description: wf.description,
          draft_definition: wf.draft_definition,
          ui:
            wf.metadata &&
            typeof wf.metadata === "object" &&
            "ui" in (wf.metadata as Record<string, unknown>)
              ? (wf.metadata as { ui: Record<string, unknown> }).ui
              : undefined,
        };
      }

      const create = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const createJson = await create.json();
      if (!create.ok || !createJson.success) {
        throw new Error(
          createJson?.error?.message ?? "Création impossible."
        );
      }
      const newId = createJson.data.id as string;
      toast.success("Workflow créé depuis le modèle");
      router.push(`/workflows/${newId}`);
    } catch (e) {
      toastFromApiError(e, "Création impossible");
    } finally {
      setBusyTemplateId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: workflows.length,
      active: 0,
      draft: 0,
      paused: 0,
      error: 0,
    };
    for (const w of workflows) c[w.status] = (c[w.status] ?? 0) + 1;
    return c;
  }, [workflows]);

  const filters = [
    { id: "all", label: "Tous" },
    { id: "active", label: "Actifs" },
    { id: "draft", label: "Brouillons" },
    { id: "paused", label: "En pause" },
    { id: "error", label: "Erreur" },
  ];
  const visible =
    filter === "all" ? workflows : workflows.filter((w) => w.status === filter);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        userTemplates={userTemplates}
        onUseTemplate={(s, id, n) => void handleUseTemplate(s, id, n)}
        busyTemplateId={busyTemplateId}
      />

      <div className="flex shrink-0 gap-0 border-b border-border bg-background px-6 pt-0">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2 text-[13px] transition-colors",
                active
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent font-normal text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] font-bold",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(460px,1fr))] gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[14px] border border-border bg-card p-5"
              >
                <div className="mb-3 h-4 w-[60%] rounded bg-muted" />
                <div className="mb-1.5 h-3 w-full rounded bg-muted" />
                <div className="mb-6 h-3 w-[80%] rounded bg-muted" />
                <div className="h-16 rounded-lg bg-muted/80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(460px,1fr))] gap-3.5">
            {visible.map((wf) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                onOpen={(id) => router.push(`/workflows/${id}`)}
                onLaunch={onLaunch}
              />
            ))}
            {visible.length === 0 && (
              <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
                Aucun workflow dans cette catégorie.
              </div>
            )}
          </div>
        )}

        <div className="mt-5 rounded-[14px] border border-dashed border-primary/35 bg-gradient-to-br from-primary/12 via-background to-muted/40 p-6 dark:border-primary/30 dark:from-primary/15 dark:via-background dark:to-muted/25">
          <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-(--brand-blue) text-white dark:bg-primary dark:text-primary-foreground">
              <Icon size={22} color="currentColor" d={ICO.plus} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[15px] font-bold text-foreground">
                Créer un nouveau workflow
              </div>
              <div className="text-[13px] text-muted-foreground">
                Partez de zéro ou choisissez parmi nos modèles de séquences
                commerciales prêts à l&apos;emploi.
              </div>
            </div>
            <Link
              href="/workflows/new"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-(--brand-blue) px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline transition-colors hover:bg-(--brand-blue)/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 sm:whitespace-nowrap"
            >
              Créer un workflow
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
