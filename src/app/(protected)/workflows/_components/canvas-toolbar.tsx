"use client";

// Canvas toolbar — visuals from design/whatsapp/wf-components.jsx CanvasToolbar.
// Uses app theme tokens (bg-card, border-border) so dark mode matches CRM/dashboard.

import { useReactFlow } from "@xyflow/react";
import { Icon, ICO } from "./icons";
import { LaunchButton } from "./launch-button";
import type { DesignStatus } from "./workflow-mapping";
import { cn } from "@/lib/utils";

const STATUS_CHIP: Record<
  DesignStatus,
  { label: string; pillClass: string; dotClass: string }
> = {
  draft: {
    label: "Brouillon",
    pillClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground/50",
  },
  active: {
    label: "Actif",
    pillClass:
      "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  paused: {
    label: "En pause",
    pillClass:
      "bg-orange-500/12 text-orange-900 dark:text-orange-300",
    dotClass: "bg-orange-500",
  },
  error: {
    label: "Erreur",
    pillClass: "bg-rose-500/12 text-rose-800 dark:text-rose-300",
    dotClass: "bg-rose-500",
  },
};

interface CanvasToolbarProps {
  status: DesignStatus;
  isTemplate: boolean;
  saving: boolean;
  togglingActive: boolean;
  testing: boolean;
  /** True when the workflow has at least one validated published_definition. */
  canLaunch: boolean;
  onSave: () => void;
  onToggleActive: () => void;
  onTest: () => void;
  onLaunch: () => void;
  onOpenRuns: () => void;
  onOpenSettings: () => void;
}

const btnNeutral =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-accent/60 disabled:pointer-events-none disabled:opacity-60";

export function CanvasToolbar({
  status,
  isTemplate,
  saving,
  togglingActive,
  testing,
  canLaunch,
  onSave,
  onToggleActive,
  onTest,
  onLaunch,
  onOpenRuns,
  onOpenSettings,
}: CanvasToolbarProps) {
  const sc = STATUS_CHIP[status];
  const flow = useReactFlow();

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-border bg-card px-4 text-[13px]">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
          sc.pillClass,
        )}
      >
        <span className={cn("size-1.5 shrink-0 rounded-full", sc.dotClass)} />
        {sc.label}
      </div>

      {isTemplate && (
        <div className="flex items-center gap-1.5 rounded-full border border-blue-500/35 bg-blue-500/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300">
          Modèle
        </div>
      )}

      <div className="min-w-2 flex-1" />

      <button
        type="button"
        onClick={onOpenRuns}
        title="Voir les prospects en parcours"
        className={cn(btnNeutral, "text-foreground")}
      >
        <span className="text-muted-foreground">
          <Icon size={13} color="currentColor" d={ICO.workflows} />
        </span>
        Exécutions
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        title="Paramètres du workflow"
        aria-label="Paramètres"
        className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-accent/60"
      >
        <span className="text-muted-foreground">
          <Icon size={14} color="currentColor" d={ICO.settings} />
        </span>
      </button>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1">
        <button
          type="button"
          onClick={() => flow.zoomOut?.({ duration: 150 })}
          className="flex border-none bg-transparent p-px text-muted-foreground hover:text-foreground"
          aria-label="Dézoomer"
        >
          <Icon size={14} color="currentColor" d={ICO.zoom_out} />
        </button>
        <button
          type="button"
          onClick={() => flow.fitView?.({ duration: 200, padding: 0.25 })}
          className="min-w-9 cursor-pointer border-none bg-transparent px-1 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-label="Recentrer"
        >
          Recentrer
        </button>
        <button
          type="button"
          onClick={() => flow.zoomIn?.({ duration: 150 })}
          className="flex border-none bg-transparent p-px text-muted-foreground hover:text-foreground"
          aria-label="Zoomer"
        >
          <Icon size={14} color="currentColor" d={ICO.zoom_in} />
        </button>
      </div>

      <button
        type="button"
        onClick={onTest}
        disabled={testing}
        className={cn(btnNeutral, testing && "cursor-wait")}
      >
        <Icon size={13} color="currentColor" d={ICO.play} />
        {testing ? "Test en cours…" : "Tester"}
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={cn(btnNeutral, saving && "cursor-wait")}
      >
        <Icon size={13} color="currentColor" d={ICO.save} />
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>

      <LaunchButton
        variant="outline"
        size="md"
        disabled={!canLaunch}
        disabledReason={
          !canLaunch
            ? "Enregistrez le parcours d'abord pour le lancer."
            : undefined
        }
        onClick={onLaunch}
      />

      {status !== "active" ? (
        <button
          type="button"
          onClick={onToggleActive}
          disabled={togglingActive}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border-none px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm",
            "bg-[var(--brand-blue)] hover:opacity-[0.92]",
            togglingActive && "cursor-wait opacity-70"
          )}
        >
          <Icon size={13} color="currentColor" d={ICO.zap} />
          {togglingActive ? "…" : "Activer"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggleActive}
          disabled={togglingActive}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border-none bg-orange-500 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-600",
            togglingActive && "cursor-wait opacity-70"
          )}
        >
          {togglingActive ? "…" : "Mettre en pause"}
        </button>
      )}
    </div>
  );
}
