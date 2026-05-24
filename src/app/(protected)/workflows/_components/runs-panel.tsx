"use client";

// Runs panel — full-screen overlay that lists the prospects enrolled in a
// workflow with their progress and status. Mounted on the canvas page.

import { useQuery } from "@tanstack/react-query";
import { Icon, ICO } from "./icons";
import {
  fetchWorkflowRuns,
  workflowQueryKeys,
  type WorkflowRunItem,
} from "../_lib/queries";

interface Props {
  open: boolean;
  workflowId: string;
  onClose: () => void;
}

/**
 * Status chip styling. Each entry holds both light and dark colour variants —
 * the chip composes them with `dark:` classes so the panel reads cleanly in
 * either theme. The "dot" colour is the same in both modes since it sits on a
 * tinted background that already adapts.
 */
const STATUS_CFG: Record<
  string,
  {
    label: string;
    bg: string;
    color: string;
    dot: string;
  }
> = {
  pending: {
    label: "En attente",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    color: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  running: {
    label: "En cours",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    color: "text-blue-900 dark:text-blue-200",
    dot: "bg-blue-500",
  },
  paused: {
    label: "En pause",
    bg: "bg-slate-100 dark:bg-slate-800",
    color: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  completed: {
    label: "Terminé",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    color: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Échoué",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    color: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  cancelled: {
    label: "Annulé",
    bg: "bg-slate-100 dark:bg-slate-800",
    color: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsPanel({ open, workflowId, onClose }: Props) {
  const { data: runs = [], isLoading, isFetching, isError } = useQuery({
    queryKey: workflowQueryKeys.runs(workflowId),
    queryFn: () => fetchWorkflowRuns(workflowId),
    enabled: Boolean(workflowId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!open) return null;

  const showInitialLoader = isLoading && runs.length === 0;
  const refreshing = isFetching && runs.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/45 dark:bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[calc(100vh-64px)] w-[880px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_24px_60px_rgba(15,23,42,0.2)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-blue-100/70 dark:bg-blue-950/40">
            <Icon size={18} color="currentColor" d={ICO.workflows} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold tracking-tight text-foreground">
              Exécutions
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              {showInitialLoader
                ? "Chargement…"
                : `${runs.length} prospect${runs.length > 1 ? "s" : ""} dans le parcours${
                    refreshing ? " · mise à jour…" : ""
                  }`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex cursor-pointer items-center border-0 bg-transparent p-1 text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            <Icon size={16} color="currentColor" d={ICO.x} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showInitialLoader ? (
            <div className="px-6 py-20 text-center text-[13px] text-muted-foreground">
              Chargement des prospects…
            </div>
          ) : isError && runs.length === 0 ? (
            <div className="px-6 py-20 text-center text-[13px] text-muted-foreground">
              Impossible de charger les exécutions.
            </div>
          ) : runs.length === 0 ? (
            <div className="px-6 py-20 text-center text-muted-foreground">
              <div className="mb-3 text-[32px] opacity-30">◻</div>
              <div className="text-sm text-muted-foreground">
                Aucun prospect inscrit dans ce parcours.
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground/80">
                Cliquez sur <strong>Lancer</strong> pour ajouter des
                prospects depuis vos listes.
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <Th>Prospect</Th>
                  <Th>Listes</Th>
                  <Th>Progression</Th>
                  <Th>Statut</Th>
                  <Th>Démarré</Th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const sc = STATUS_CFG[r.status] ?? {
                    label: r.status,
                    bg: "bg-slate-100 dark:bg-slate-800",
                    color: "text-slate-600 dark:text-slate-300",
                    dot: "bg-slate-400",
                  };
                  const total = r.steps_total ?? 0;
                  const done = r.steps_completed ?? 0;
                  return (
                    <RunRow key={r.id} run={r} sc={sc} total={total} done={done} />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function RunRow({
  run: r,
  sc,
  total,
  done,
}: {
  run: WorkflowRunItem;
  sc: { label: string; bg: string; color: string; dot: string };
  total: number;
  done: number;
}) {
  return (
    <tr className="border-b border-border/60">
      <Td>
        <span className="font-semibold text-foreground">
          {r.prospect?.full_name ?? r.prospect_id.slice(0, 8)}
        </span>
        {r.prospect?.company && (
          <div className="mt-0.5 text-[11.5px] text-muted-foreground/80">
            {r.prospect.company}
          </div>
        )}
      </Td>
      <Td>
        <span className="text-xs text-muted-foreground">
          {(r.enrollment_list_labels ?? []).join(" · ") || "—"}
        </span>
      </Td>
      <Td>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total > 0 ? `${done} / ${total} étapes` : "—"}
        </span>
      </Td>
      <Td>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sc.bg} ${sc.color}`}
        >
          <span className={`size-[5px] rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
        {r.last_error && (
          <div
            className="mt-1 max-w-[240px] text-[11px] text-rose-700 dark:text-rose-300"
            title={r.last_error}
          >
            {r.last_error.length > 60
              ? `${r.last_error.slice(0, 60)}…`
              : r.last_error}
          </div>
        )}
      </Td>
      <Td>
        <span className="text-xs text-muted-foreground/80">
          {formatDate(r.created_at)}
        </span>
      </Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
