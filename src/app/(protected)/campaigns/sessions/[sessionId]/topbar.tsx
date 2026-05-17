"use client";

import { ArrowLeft, Keyboard, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SessionTopbar({
  campaignName,
  goal,
  completed,
  sessionDurationSec,
  agent,
  onExit,
  onShortcuts,
  onConfigureScript,
}: {
  campaignName: string;
  goal: number;
  completed: number;
  sessionDurationSec: number;
  agent: { name: string; initials: string };
  onExit: () => void;
  onShortcuts: () => void;
  onConfigureScript: () => void;
}) {
  const pct = goal ? Math.min(100, (completed / goal) * 100) : 0;
  const mm = String(Math.floor(sessionDurationSec / 60)).padStart(2, "0");
  const ss = String(sessionDurationSec % 60).padStart(2, "0");

  return (
    <header className="z-10 flex h-[60px] shrink-0 items-center gap-4 border-b bg-card px-5">
      <Button variant="outline" size="sm" onClick={onExit}>
        <ArrowLeft className="size-3.5" />
        Quitter la session
      </Button>

      <div className="ml-1 flex h-8 items-center gap-2.5 border-l pl-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[11.5px] font-semibold text-red-800">
          <span
            className="size-1.5 rounded-full bg-red-500"
            style={{ boxShadow: "0 0 0 3px rgba(220,38,38,0.18)", animation: "pulse 1.4s ease-in-out infinite" }}
          />
          EN SESSION
        </span>
        <div className="flex flex-col">
          <div className="text-[13.5px] font-semibold tracking-tight">{campaignName}</div>
          <div className="text-[11.5px] text-muted-foreground tabular-nums">
            {completed}/{goal} prospects · {mm}:{ss}
          </div>
        </div>
      </div>

      <div className="ml-2 hidden h-1.5 flex-1 max-w-[280px] overflow-hidden rounded-full bg-muted md:block">
        <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onConfigureScript} title="Configurer le script">
          <Settings2 className="size-3.5" />
          Script
        </Button>
        <Button variant="ghost" size="sm" onClick={onShortcuts} title="Raccourcis clavier (?)">
          <Keyboard className="size-3.5" />
        </Button>
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#0052D9] text-[10px] font-bold text-white">
          {agent.initials}
        </span>
      </div>
    </header>
  );
}
