"use client";

// Canvas toolbar — visuals from design/whatsapp/wf-components.jsx CanvasToolbar.
// Wired so Activer/Mettre en pause and Enregistrer hit the workflow API; zoom
// is driven by xyflow's useReactFlow().

import { useReactFlow } from "@xyflow/react";
import { Icon, ICO } from "./icons";
import { LaunchButton } from "./launch-button";
import type { DesignStatus } from "./workflow-mapping";

const STATUS_CFG: Record<DesignStatus, { label: string; bg: string; color: string; dot: string }> = {
  draft: { label: "Brouillon", bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
  active: { label: "Actif", bg: "#ECFDF5", color: "#15803D", dot: "#10B981" },
  paused: { label: "En pause", bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
  error: { label: "Erreur", bg: "#FFF1F2", color: "#BE123C", dot: "#F43F5E" },
};

interface CanvasToolbarProps {
  workflowName: string;
  status: DesignStatus;
  isTemplate: boolean;
  saving: boolean;
  togglingActive: boolean;
  testing: boolean;
  /** True when the workflow has at least one validated published_definition. */
  canLaunch: boolean;
  onBack: () => void;
  onSave: () => void;
  onToggleActive: () => void;
  onTest: () => void;
  onLaunch: () => void;
  onOpenRuns: () => void;
  onOpenSettings: () => void;
}

export function CanvasToolbar({
  workflowName,
  status,
  isTemplate,
  saving,
  togglingActive,
  testing,
  canLaunch,
  onBack,
  onSave,
  onToggleActive,
  onTest,
  onLaunch,
  onOpenRuns,
  onOpenSettings,
}: CanvasToolbarProps) {
  const sc = STATUS_CFG[status];
  const flow = useReactFlow();

  return (
    <div
      style={{
        height: 52,
        borderBottom: "1px solid #E2E8F0",
        background: "white",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#64748B",
          marginRight: 8,
        }}
      >
        <button
          onClick={onBack}
          style={{
            cursor: "pointer",
            color: "#0052D9",
            fontWeight: 500,
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 13,
          }}
        >
          Workflows
        </button>
        <span>/</span>
        <span
          style={{
            color: "#0F172A",
            fontWeight: 600,
            maxWidth: 320,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {workflowName}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: sc.bg,
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 11.5,
          fontWeight: 600,
          color: sc.color,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: sc.dot,
          }}
        />
        {sc.label}
      </div>

      {isTemplate && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "#EFF6FF",
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11.5,
            fontWeight: 600,
            color: "#1E3A8A",
            border: "1px solid #BFDBFE",
          }}
        >
          Modèle
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onOpenRuns}
        title="Voir les prospects en parcours"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #E2E8F0",
          background: "white",
          fontSize: 13,
          fontWeight: 500,
          color: "#374151",
          cursor: "pointer",
        }}
      >
        <Icon size={13} color="#64748B" d={ICO.workflows} />
        Exécutions
      </button>

      <button
        onClick={onOpenSettings}
        title="Paramètres du workflow"
        aria-label="Paramètres"
        style={{
          padding: 6,
          borderRadius: 8,
          border: "1px solid #E2E8F0",
          background: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 30,
          width: 30,
        }}
      >
        <Icon size={14} color="#64748B" d={ICO.settings} />
      </button>

      {/* Zoom — driven by xyflow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          padding: "4px 8px",
        }}
      >
        <button
          onClick={() => flow.zoomOut?.({ duration: 150 })}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#64748B",
            padding: "0 2px",
            display: "flex",
          }}
          aria-label="Dézoomer"
        >
          <Icon size={14} color="#64748B" d={ICO.zoom_out} />
        </button>
        <button
          onClick={() => flow.fitView?.({ duration: 200, padding: 0.25 })}
          style={{
            fontSize: 12,
            color: "#64748B",
            minWidth: 36,
            textAlign: "center",
            fontWeight: 500,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Recentrer"
        >
          Recentrer
        </button>
        <button
          onClick={() => flow.zoomIn?.({ duration: 150 })}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#64748B",
            padding: "0 2px",
            display: "flex",
          }}
          aria-label="Zoomer"
        >
          <Icon size={14} color="#64748B" d={ICO.zoom_in} />
        </button>
      </div>

      <button
        onClick={onTest}
        disabled={testing}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 8,
          border: "1px solid #E2E8F0",
          background: "white",
          fontSize: 13,
          fontWeight: 500,
          color: "#374151",
          cursor: testing ? "wait" : "pointer",
          opacity: testing ? 0.7 : 1,
        }}
      >
        <Icon size={13} color="#374151" d={ICO.play} />
        {testing ? "Test en cours…" : "Tester"}
      </button>

      <button
        onClick={onSave}
        disabled={saving}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 8,
          border: "1px solid #E2E8F0",
          background: "white",
          fontSize: 13,
          fontWeight: 500,
          color: "#374151",
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        <Icon size={13} color="#374151" d={ICO.save} />
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
          onClick={onToggleActive}
          disabled={togglingActive}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            borderRadius: 8,
            border: "none",
            background: "#0052D9",
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            cursor: togglingActive ? "wait" : "pointer",
            opacity: togglingActive ? 0.7 : 1,
          }}
        >
          <Icon size={13} color="white" d={ICO.zap} />
          {togglingActive ? "…" : "Activer"}
        </button>
      ) : (
        <button
          onClick={onToggleActive}
          disabled={togglingActive}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            borderRadius: 8,
            border: "none",
            background: "#F97316",
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            cursor: togglingActive ? "wait" : "pointer",
            opacity: togglingActive ? 0.7 : 1,
          }}
        >
          {togglingActive ? "…" : "Mettre en pause"}
        </button>
      )}
    </div>
  );
}
