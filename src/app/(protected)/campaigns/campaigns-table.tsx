"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  MoreVertical,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import {
  CHANNEL_META,
  CREATORS,
  PERF_COLORS,
  computePerf,
  formatRelativeDate,
  type Campaign,
} from "./data";
import { Avatar, ChannelPill, ProgressBar, StatusBadge, TypeBadge } from "./primitives";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export type SortField =
  | "name"
  | "channel"
  | "type"
  | "progress"
  | "performance"
  | "status"
  | "launchedAt";

export interface SortBy {
  field: SortField;
  dir: "asc" | "desc";
}

export type Action =
  | "view"
  | "pause"
  | "resume"
  | "launch"
  | "duplicate"
  | "delete";

const STATUS_ACTIONS: Record<string, Action[]> = {
  running: ["view", "pause", "duplicate", "delete"],
  paused: ["view", "resume", "duplicate", "delete"],
  completed: ["view", "duplicate", "delete"],
  failed: ["view", "duplicate", "delete"],
  draft: ["view", "launch", "duplicate", "delete"],
};

const ACTION_LABELS: Record<Action, { label: string; icon: React.ComponentType<{ className?: string }>; destructive?: boolean }> = {
  view: { label: "Voir", icon: Eye },
  pause: { label: "Mettre en pause", icon: Pause },
  resume: { label: "Reprendre", icon: Play },
  launch: { label: "Lancer", icon: Play },
  duplicate: { label: "Dupliquer", icon: Copy },
  delete: { label: "Supprimer", icon: Trash2, destructive: true },
};

function ActionMenu({ campaign, onAction }: { campaign: Campaign; onAction: (a: Action, c: Campaign) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const actions = STATUS_ACTIONS[campaign.status] ?? ["view", "duplicate", "delete"];
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent ${open ? "bg-accent" : ""}`}
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[180px] rounded-lg border bg-popover p-1 shadow-lg">
          {actions.map((a, i) => {
            const meta = ACTION_LABELS[a];
            const Icon = meta.icon;
            return (
              <div key={a}>
                {meta.destructive && actions.length > 1 ? <div className="my-1 h-px bg-border" /> : null}
                <div
                  onClick={() => {
                    setOpen(false);
                    onAction(a, campaign);
                  }}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] ${
                    meta.destructive ? "text-destructive hover:bg-destructive/10" : "hover:bg-accent"
                  }`}
                >
                  <Icon className="size-3.5 opacity-70" />
                  {meta.label}
                </div>
                {i === actions.length - 1 ? null : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PerfInline({ campaign }: { campaign: Campaign }) {
  const perf = computePerf(campaign);
  if (!perf) return <span className="text-muted-foreground">—</span>;
  const c = PERF_COLORS[perf.tier];
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums" style={{ color: c.fg }}>
        {perf.rate.toFixed(0)}% <span className="text-[11.5px] font-medium text-muted-foreground">{perf.label}</span>
      </span>
      {campaign.meetings > 0 ? (
        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <CalendarDays className="size-2.5" /> {campaign.meetings} RDV
        </span>
      ) : null}
    </div>
  );
}

export function CampaignsTable({
  items,
  selected,
  setSelected,
  onAction,
  sortBy,
  setSortBy,
  flashedId,
}: {
  items: Campaign[];
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
  onAction: (a: Action, c: Campaign) => void;
  sortBy: SortBy;
  setSortBy: Dispatch<SetStateAction<SortBy>>;
  flashedId: string | null;
}) {
  const router = useRouter();
  const allSelected = items.length > 0 && items.every((c) => selected.includes(c.id));
  const someSelected = !allSelected && items.some((c) => selected.includes(c.id));
  const toggleAll = () => setSelected(allSelected ? [] : items.map((c) => c.id));
  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const SortHeader = ({
    id,
    children,
    align = "left",
  }: {
    id: SortField;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => {
    const active = sortBy.field === id;
    return (
      <th
        onClick={() =>
          setSortBy({ field: id, dir: active && sortBy.dir === "desc" ? "asc" : "desc" })
        }
        className={`h-[38px] cursor-pointer select-none whitespace-nowrap border-b bg-muted/40 px-3.5 text-[11.5px] font-semibold uppercase tracking-wide ${
          active ? "text-foreground" : "text-muted-foreground"
        } text-${align}`}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <span className={active ? "" : "opacity-30"}>
            {active && sortBy.dir === "asc" ? <ChevronUp className="size-2.5" /> : <ChevronDown className="size-2.5" />}
          </span>
        </span>
      </th>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: 42 }} />
          <col />
          <col style={{ width: 130 }} />
          <col style={{ width: 170 }} />
          <col style={{ width: 200 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 56 }} />
        </colgroup>
        <thead>
          <tr>
            <th className="h-[38px] border-b bg-muted/40 pl-3.5">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
              />
            </th>
            <SortHeader id="name">Campagne</SortHeader>
            <SortHeader id="channel">Canal</SortHeader>
            <SortHeader id="type">Type</SortHeader>
            <SortHeader id="progress">Progression</SortHeader>
            <SortHeader id="performance">Performance</SortHeader>
            <SortHeader id="status">Statut</SortHeader>
            <SortHeader id="launchedAt">Lancée</SortHeader>
            <th className="border-b bg-muted/40" />
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => {
            const isSelected = selected.includes(c.id);
            const ch = CHANNEL_META[c.channel];
            const isFlash = c.id === flashedId;
            return (
              <tr
                key={c.id}
                onClick={() => router.push(`/campaigns/${c.id}`)}
                className={`cursor-pointer transition-colors ${
                  isFlash
                    ? "bg-orange-100/50 dark:bg-orange-950/45"
                    : isSelected
                      ? "bg-[#E8F0FD] dark:bg-blue-950/55"
                      : "hover:bg-muted/40"
                } ${i === items.length - 1 ? "" : "border-b"}`}
              >
                <td className="py-3.5 pl-3.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(c.id)} />
                </td>
                <td className="p-3.5">
                  <div className="block truncate text-[13.5px] font-medium" title={c.name}>
                    {c.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Avatar creator={CREATORS.find((x) => x.id === c.creator)} size={16} />
                    <span className="text-[11.5px] text-muted-foreground">
                      {c.creatorName} · {c.total} prospects
                    </span>
                  </div>
                </td>
                <td className="p-3.5">
                  <ChannelPill channel={c.channel} />
                </td>
                <td className="p-3.5">
                  <TypeBadge type={c.type} />
                </td>
                <td className="p-3.5">
                  <div className="flex flex-col gap-1.5">
                    <ProgressBar value={c.processed} max={c.total} color={c.status === "failed" ? "#DC2626" : ch.color} />
                    <span className="text-[11.5px] text-muted-foreground tabular-nums">
                      {c.processed}/{c.total} prospects traités
                    </span>
                  </div>
                </td>
                <td className="p-3.5">
                  <PerfInline campaign={c} />
                </td>
                <td className="p-3.5">
                  <StatusBadge status={c.status} />
                </td>
                <td className="p-3.5 text-[12.5px] text-muted-foreground">{formatRelativeDate(c.launchedAt)}</td>
                <td className="py-3.5 pr-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu campaign={c} onAction={onAction} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton that mirrors the real CampaignsTable's column widths so swapping
 * from skeleton → loaded doesn't shift the layout.
 */
export function CampaignsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: 42 }} />
          <col />
          <col style={{ width: 130 }} />
          <col style={{ width: 170 }} />
          <col style={{ width: 200 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 56 }} />
        </colgroup>
        <thead>
          <tr>
            <th className="h-[38px] border-b bg-muted/40 pl-3.5">
              <Skeleton className="size-4" />
            </th>
            <th className="border-b bg-muted/40 px-3.5 text-left">
              <Skeleton className="h-3 w-20" />
            </th>
            <th className="border-b bg-muted/40 px-3.5 text-left">
              <Skeleton className="h-3 w-12" />
            </th>
            <th className="border-b bg-muted/40 px-3.5 text-left">
              <Skeleton className="h-3 w-14" />
            </th>
            <th className="border-b bg-muted/40 px-3.5 text-left">
              <Skeleton className="h-3 w-20" />
            </th>
            <th className="border-b bg-muted/40 px-3.5 text-left">
              <Skeleton className="h-3 w-20" />
            </th>
            <th className="border-b bg-muted/40 px-3.5 text-left">
              <Skeleton className="h-3 w-14" />
            </th>
            <th className="border-b bg-muted/40 px-3.5 text-left">
              <Skeleton className="h-3 w-14" />
            </th>
            <th className="border-b bg-muted/40" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={i === rows - 1 ? "" : "border-b"}>
              <td className="py-3.5 pl-3.5">
                <Skeleton className="size-4" />
              </td>
              <td className="p-3.5">
                <Skeleton className="h-3.5 w-48" />
                <div className="mt-2 flex items-center gap-1.5">
                  <Skeleton className="size-4 rounded-full" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </td>
              <td className="p-3.5">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              <td className="p-3.5">
                <Skeleton className="h-5 w-24 rounded-full" />
              </td>
              <td className="p-3.5">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="mt-2 h-2.5 w-28" />
              </td>
              <td className="p-3.5">
                <Skeleton className="h-3 w-20" />
              </td>
              <td className="p-3.5">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              <td className="p-3.5">
                <Skeleton className="h-3 w-14" />
              </td>
              <td className="py-3.5 pr-3.5 text-right">
                <Skeleton className="ml-auto size-5" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
