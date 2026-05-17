"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Outcome, SessionProspect } from "./session-data";
import { Input } from "@/components/ui/input";

export function QueueRail({
  prospects,
  currentIdx,
  statuses,
  onJump,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  filter,
  setFilter,
  search,
  setSearch,
  searchRef,
}: {
  prospects: SessionProspect[];
  currentIdx: number;
  statuses: Record<string, (Outcome & { time: string }) | undefined>;
  onJump: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  filter: "all" | "pending" | "done";
  setFilter: (f: "all" | "pending" | "done") => void;
  search: string;
  setSearch: (s: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const filtered = prospects.filter((p) => {
    const done = !!statuses[p.id];
    if (filter === "pending" && done) return false;
    if (filter === "done" && !done) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${p.firstName} ${p.lastName} ${p.company}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r bg-card">
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (/)"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <div className="flex gap-1 rounded-md border bg-muted/40 p-0.5">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 rounded px-2 py-1 text-[11.5px] font-medium ${
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Tous" : f === "pending" ? "À faire" : "Faits"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {filtered.map((p) => {
          const idx = prospects.findIndex((x) => x.id === p.id);
          const isCurrent = idx === currentIdx;
          const status = statuses[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onJump(idx)}
              className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                isCurrent ? "bg-[#E8F0FD] ring-1 ring-[#0052D9]" : "hover:bg-muted/50"
              }`}
            >
              <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">
                  {p.firstName} {p.lastName}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {p.jobTitle} · {p.company}
                </div>
                {status ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-px text-[10.5px] font-semibold text-white" style={{ background: status.color }}>
                    {status.label} · {status.time}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">Aucun prospect</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t p-2">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={onPrev}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] disabled:opacity-40 enabled:hover:bg-accent"
        >
          <ChevronLeft className="size-3.5" />
          Préc.
        </button>
        <span className="text-[11px] text-muted-foreground">←/→ ou espace</span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={onNext}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] disabled:opacity-40 enabled:hover:bg-accent"
        >
          Suiv.
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}
