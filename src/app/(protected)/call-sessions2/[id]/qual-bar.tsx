"use client";

import { CalendarPlus, ChevronLeft, Clock, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Outcome } from "./session-data";
import { OUTCOMES } from "./session-data";

export function QualificationBar({
  onPick,
  onCallback,
  onSkip,
  onPrev,
  hasPrev,
  hasNext,
  autoAdvance,
  setAutoAdvance,
  onOpenBooking,
}: {
  onPick: (o: Outcome) => void;
  onCallback: () => void;
  onSkip: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  autoAdvance: boolean;
  setAutoAdvance: (b: boolean) => void;
  onOpenBooking: () => void;
}) {
  return (
    <div className="shrink-0 border-t bg-card">
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
          <ChevronLeft className="size-3.5" />
          Précédent
        </Button>

        <div className="mx-2 h-7 w-px bg-border" />

        <Button onClick={onOpenBooking} className="bg-[#5B2EBF] hover:bg-[#4A23A0]">
          <CalendarPlus className="size-3.5" />
          RDV pris
          <kbd className="ml-1 rounded bg-white/20 px-1 text-[10px]">R</kbd>
        </Button>
        <Button variant="outline" onClick={onCallback} className="border-orange-300 text-orange-700 hover:bg-orange-50">
          <Clock className="size-3.5" />À rappeler
          <kbd className="ml-1 rounded bg-orange-100 px-1 text-[10px]">A</kbd>
        </Button>

        {OUTCOMES.filter((o) => o.id !== "rdv" && o.id !== "callback").map((o) => (
          <Button
            key={o.id}
            variant="outline"
            onClick={() => onPick(o)}
            style={{ borderColor: `${o.color}55`, color: o.color }}
          >
            {o.label}
            <kbd className="ml-1 rounded bg-muted px-1 text-[10px]">{o.shortcut}</kbd>
          </Button>
        ))}

        <Button variant="ghost" onClick={onSkip} disabled={!hasNext} className="ml-auto">
          <SkipForward className="size-3.5" /> Passer
        </Button>
        <label className="ml-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
          />
          Avancer auto
        </label>
      </div>
    </div>
  );
}
