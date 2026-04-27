"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";
import { CanvasToolbar } from "../_components/canvas-toolbar";
import { LeftPanel } from "../_components/left-panel";
import { RightPanel } from "../_components/right-panel";
import { Whatsapp2Styles } from "../_components/styles";
import { TRIGGER_NODE_ID, XyCanvas } from "../_components/xy-canvas";
import { toastFromApiError } from "@/lib/toast";
import {
  parseWorkflowUi,
  type WorkflowCanvasPositions,
  type WorkflowDefinition,
  type WorkflowTemplate,
  type WorkflowTemplateTrigger,
} from "@/lib/workflows";
import type { WorkflowStep, WorkflowStepType } from "@/lib/workflows/schema";
import {
  deriveStatus,
  type BackendWorkflowRow,
  type DesignStatus,
} from "../_components/workflow-mapping";

interface Props {
  workflowId: string;
}

function newStepId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultConfigForType(type: WorkflowStepType): WorkflowStep["config"] {
  switch (type) {
    case "wait":
      return { durationHours: 24, onlyIfNoReply: false };
    case "whatsapp_message":
      return { messageTemplate: "Bonjour {{firstName}},\n\n" };
    case "linkedin_invite":
      return { messageTemplate: "" };
    case "linkedin_message":
      return { messageTemplate: "" };
    case "condition":
      return { conditionType: "prospect_replied" };
    default:
      return { messageTemplate: "" };
  }
}

export function CanvasClient({ workflowId }: Props) {
  const router = useRouter();

  // Persisted server state.
  const [workflow, setWorkflow] = useState<BackendWorkflowRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable local state — persists on Save.
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [trigger, setTrigger] = useState<WorkflowTemplateTrigger | null>(null);
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<string>("Workflow");
  const [colorKey, setColorKey] = useState<string>("violet");
  const [canvasPositions, setCanvasPositions] = useState<WorkflowCanvasPositions>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Async state.
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const positionsCommitTimer = useRef<number | null>(null);

  const status: DesignStatus = workflow ? deriveStatus(workflow) : "draft";

  const loadWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Chargement impossible");
      }
      const w = json.data.workflow as BackendWorkflowRow;
      setWorkflow(w);
      setName(w.name);
      const ui = parseWorkflowUi(w.metadata);
      setIconKey(ui.icon);
      setColorKey(ui.color);
      setTrigger((ui.trigger as WorkflowTemplateTrigger | undefined) ?? null);
      setCanvasPositions(ui.canvas ?? {});
      const def = w.draft_definition as { steps?: WorkflowStep[] } | null;
      setSteps(Array.isArray(def?.steps) ? def!.steps : []);
    } catch (e) {
      toastFromApiError(e, "Chargement impossible");
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  // ── Local mutations ────────────────────────────────────────────────────

  const definition: WorkflowDefinition = useMemo(
    () => ({ schemaVersion: 1, steps }),
    [steps]
  );

  const addStep = useCallback((type: WorkflowStepType) => {
    setSteps((prev) => [
      ...prev,
      {
        id: newStepId(),
        type,
        config: defaultConfigForType(type),
      } as WorkflowStep,
    ]);
  }, []);

  const updateStep = useCallback(
    (stepId: string, patch: Record<string, unknown>) => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === stepId
            ? ({ ...s, config: { ...s.config, ...patch } } as WorkflowStep)
            : s
        )
      );
    },
    []
  );

  const deleteStep = useCallback(
    (stepId: string) => {
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
      if (selectedId === stepId) setSelectedId(null);
    },
    [selectedId]
  );

  const duplicateStep = useCallback((stepId: string) => {
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.id === stepId);
      if (i < 0) return prev;
      const original = prev[i]!;
      const cloned = {
        ...original,
        id: newStepId(),
      } as WorkflowStep;
      const next = [...prev];
      next.splice(i + 1, 0, cloned);
      return next;
    });
  }, []);

  const applyTemplate = useCallback((t: WorkflowTemplate) => {
    if (
      steps.length > 0 &&
      !window.confirm(
        "Appliquer ce modèle remplacera les étapes actuelles. Continuer ?"
      )
    ) {
      return;
    }
    const def = t.buildDefinition();
    setSteps(def.steps);
    setTrigger(t.trigger);
    setIconKey(t.ui.icon);
    setColorKey(t.ui.color);
    setCanvasPositions({});
    setSelectedId(null);
    toast.success("Modèle appliqué");
  }, [steps.length]);

  // ── Server mutations ───────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!workflow) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim() || workflow.name,
          draft_definition: definition,
          ui: {
            icon: iconKey,
            color: colorKey,
            trigger: trigger ?? undefined,
            canvas: canvasPositions,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json?.error?.message ??
            json?.error?.details?.draft_definition ??
            "Enregistrement impossible"
        );
      }
      setWorkflow(json.data.workflow as BackendWorkflowRow);
      toast.success("Modifications enregistrées");
    } catch (e) {
      toastFromApiError(e, "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }, [
    workflow,
    workflowId,
    name,
    definition,
    iconKey,
    colorKey,
    trigger,
    canvasPositions,
  ]);

  const handleToggleActive = useCallback(async () => {
    if (!workflow) return;
    const next = !workflow.is_active;
    setTogglingActive(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Mise à jour impossible");
      }
      setWorkflow(json.data.workflow as BackendWorkflowRow);
      toast.success(next ? "Workflow activé" : "Workflow mis en pause");
    } catch (e) {
      toastFromApiError(e, "Mise à jour impossible");
    } finally {
      setTogglingActive(false);
    }
  }, [workflow, workflowId]);

  const handleTest = useCallback(() => {
    toast.info("Le mode test sera disponible dans une prochaine version.");
  }, []);

  // Persist canvas positions silently — drag is non-mutating UX, debounced.
  const commitPositions = useCallback(
    (next: WorkflowCanvasPositions) => {
      setCanvasPositions(next);
      if (positionsCommitTimer.current) {
        window.clearTimeout(positionsCommitTimer.current);
      }
      positionsCommitTimer.current = window.setTimeout(async () => {
        try {
          await fetch(`/api/workflows/${workflowId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ui: { canvas: next } }),
          });
        } catch {
          // Silent — non-critical UX persistence.
        }
      }, 400);
    },
    [workflowId]
  );

  useEffect(() => {
    return () => {
      if (positionsCommitTimer.current) {
        window.clearTimeout(positionsCommitTimer.current);
      }
    };
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────

  const selectedStep = useMemo(() => {
    if (!selectedId || selectedId === TRIGGER_NODE_ID) return null;
    return steps.find((s) => s.id === selectedId) ?? null;
  }, [selectedId, steps]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="ws2-root"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
        }}
      >
        <Whatsapp2Styles />
        <p style={{ fontSize: 13, color: "#94A3B8" }}>Chargement…</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div
        className="ws2-root"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <Whatsapp2Styles />
        <p style={{ fontSize: 14, color: "#0F172A", fontWeight: 600 }}>
          Workflow introuvable.
        </p>
        <button
          onClick={() => router.push("/whatsapp2")}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            background: "white",
            fontSize: 13,
            color: "#374151",
            cursor: "pointer",
          }}
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div
      className="ws2-root"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
        fontFamily:
          "'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      <Whatsapp2Styles />
      <ReactFlowProvider>
        <CanvasToolbar
          workflowName={name || workflow.name}
          status={status}
          saving={saving}
          togglingActive={togglingActive}
          onBack={() => router.push("/whatsapp2")}
          onSave={() => void handleSave()}
          onToggleActive={() => void handleToggleActive()}
          onTest={handleTest}
        />
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <LeftPanel onAddStep={addStep} onApplyTemplate={applyTemplate} />
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            <XyCanvas
              definition={definition}
              positions={canvasPositions}
              trigger={trigger}
              selectedStepId={selectedId}
              onPositionsChange={commitPositions}
              onSelectStep={setSelectedId}
            />
          </div>
          {selectedId && (
            <RightPanel
              selectedId={selectedId}
              step={selectedStep}
              trigger={trigger}
              onClose={() => setSelectedId(null)}
              onUpdateStep={updateStep}
              onUpdateTrigger={setTrigger}
              onDeleteStep={deleteStep}
              onDuplicateStep={duplicateStep}
            />
          )}
        </div>
      </ReactFlowProvider>
    </div>
  );
}
