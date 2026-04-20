"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, List, Activity, Workflow, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Prospect } from "@/lib/types/prospects";

interface Props {
  prospect: Prospect;
  onScrollToActivity?: () => void;
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function Pill({
  icon,
  label,
  color,
  onClick,
  href,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  color: "green" | "amber" | "red" | "neutral" | "blue";
  onClick?: () => void;
  href?: string;
  loading?: boolean;
}) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    neutral: "bg-muted text-muted-foreground border-border",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  };

  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity";
  const interactive = (onClick || href) ? "cursor-pointer hover:opacity-80" : "";

  const inner = (
    <span className={`${base} ${colorMap[color]} ${interactive}`}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      {label}
    </span>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick}>{inner}</button>;
  return inner;
}

export function ProspectStateStrip({ prospect, onScrollToActivity }: Props) {
  // Fetch list name if the prospect belongs to a list
  const { data: bddData } = useQuery({
    queryKey: ["bdd-single", prospect.bdd_id],
    queryFn: async () => {
      const res = await fetch(`/api/bdd/${prospect.bdd_id}`, { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? json) as { id: string; name: string } | null;
    },
    enabled: !!prospect.bdd_id,
    staleTime: 60_000,
  });

  // Last activity (reuses the same cache as the activity section below)
  const { data: activityData } = useQuery({
    queryKey: ["prospect-activity", prospect.id],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/activity?limit=50`, {
        credentials: "include",
      });
      if (!res.ok) return { items: [] as Array<{ action: string; created_at: string; workflow_id?: string | null; title?: string }> };
      const json = await res.json();
      return (json.data ?? json) as { items: Array<{ action: string; created_at: string; workflow_id?: string | null; title?: string }> };
    },
    enabled: !!prospect.id,
    staleTime: 30_000,
  });

  const activityItems = activityData?.items ?? [];
  const lastActivity = activityItems[0] ?? null;

  // Infer active workflow from the last workflow event that isn't "run_completed"
  const lastWorkflowEvent = activityItems.find(
    (a) => a.workflow_id && a.action !== "workflow_run_completed"
  ) ?? null;
  const workflowCompleted = activityItems.some(
    (a) => a.workflow_id === lastWorkflowEvent?.workflow_id && a.action === "workflow_run_completed"
  );
  const activeWorkflow = lastWorkflowEvent && !workflowCompleted ? lastWorkflowEvent : null;

  // Enrichment pill
  const enrichmentPill = (() => {
    if (prospect.enriched_at) {
      return (
        <Pill
          icon={<Sparkles className="h-3 w-3" />}
          label={`Enrichi ${relativeTime(prospect.enriched_at)}`}
          color="green"
        />
      );
    }
    return (
      <Pill
        icon={<Sparkles className="h-3 w-3" />}
        label="Non enrichi"
        color="neutral"
      />
    );
  })();

  // List pill
  const listPill = (() => {
    if (!prospect.bdd_id) {
      return (
        <Pill
          icon={<List className="h-3 w-3" />}
          label="Aucune liste"
          color="neutral"
        />
      );
    }
    const listName = bddData?.name ?? "Liste";
    return (
      <Pill
        icon={<List className="h-3 w-3" />}
        label={listName}
        color="blue"
        href={`/crm?bdd_id=${prospect.bdd_id}`}
      />
    );
  })();

  // Activity pill
  const activityPill = lastActivity ? (
    <Pill
      icon={<Activity className="h-3 w-3" />}
      label={`Activité ${relativeTime(lastActivity.created_at)}`}
      color="neutral"
      onClick={onScrollToActivity}
    />
  ) : null;

  // Workflow pill
  const workflowPill = activeWorkflow ? (
    <Pill
      icon={<Workflow className="h-3 w-3" />}
      label="En parcours"
      color="amber"
    />
  ) : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-xs">
      {enrichmentPill}
      {listPill}
      {activityPill}
      {workflowPill}
    </div>
  );
}
