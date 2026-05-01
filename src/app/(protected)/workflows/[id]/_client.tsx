"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";
import { CanvasToolbar } from "../_components/canvas-toolbar";
import { LeftPanel } from "../_components/left-panel";
import { RightPanel } from "../_components/right-panel";
import { SettingsDialog } from "../_components/settings-dialog";
import { Whatsapp2Styles } from "../_components/styles";
import { TRIGGER_NODE_ID, XyCanvas, type ConnectInfo } from "../_components/xy-canvas";
import { simulateWorkflow, type SimResult } from "../_components/simulate";
import { TestResultsDialog } from "../_components/test-results-dialog";
import { RunsPanel } from "../_components/runs-panel";
import { WorkflowListEnrollModal } from "@/components/workflows/workflow-list-enroll-modal";
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
    case "crm":
      return { field: "status", value: "", notifyOwner: false };
    case "notification":
      return { message: "", priority: "normal" };
    case "task":
      return { title: "", dueInHours: 48 };
    case "end":
      return {};
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
  const [entryStepId, setEntryStepId] = useState<string | undefined>(undefined);
  const [trigger, setTrigger] = useState<WorkflowTemplateTrigger | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [iconKey, setIconKey] = useState<string>("Workflow");
  const [colorKey, setColorKey] = useState<string>("violet");
  const [canvasPositions, setCanvasPositions] = useState<WorkflowCanvasPositions>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testResult, setTestResult] = useState<SimResult | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [runsOpen, setRunsOpen] = useState(false);

  // Async state.
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [testing, setTesting] = useState(false);
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
      setDescription(w.description ?? "");
      setIsTemplate(Boolean(w.is_template));
      const ui = parseWorkflowUi(w.metadata);
      setIconKey(ui.icon);
      setColorKey(ui.color);
      setTrigger((ui.trigger as WorkflowTemplateTrigger | undefined) ?? null);
      setCanvasPositions(ui.canvas ?? {});
      const def = w.draft_definition as
        | { steps?: WorkflowStep[]; entry_step_id?: string }
        | null;
      setSteps(Array.isArray(def?.steps) ? def!.steps : []);
      setEntryStepId(def?.entry_step_id);
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
    () => ({
      schemaVersion: 1,
      steps,
      ...(entryStepId ? { entry_step_id: entryStepId } : {}),
    }),
    [steps, entryStepId]
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
      setSteps((prev) => {
        const remaining = prev.filter((s) => s.id !== stepId);
        // Strip references to the deleted step from any pointers.
        return remaining.map((s) => {
          if (s.type === "condition") {
            const cond = s as WorkflowStep & {
              on_true_id?: string;
              on_false_id?: string;
            };
            return {
              ...cond,
              on_true_id:
                cond.on_true_id === stepId ? undefined : cond.on_true_id,
              on_false_id:
                cond.on_false_id === stepId ? undefined : cond.on_false_id,
              next_id: s.next_id === stepId ? undefined : s.next_id,
            } as WorkflowStep;
          }
          if ("next_id" in s && s.next_id === stepId) {
            return { ...s, next_id: undefined } as WorkflowStep;
          }
          return s;
        });
      });
      setEntryStepId((prev) => (prev === stepId ? undefined : prev));
      if (selectedId === stepId) setSelectedId(null);
    },
    [selectedId]
  );

  // Drag-to-connect → set the corresponding pointer on the source step (or
  // entry_step_id when the source is the synthetic trigger node).
  const handleConnect = useCallback((info: ConnectInfo) => {
    if (info.target === TRIGGER_NODE_ID) return; // can't end on the trigger
    if (info.source === TRIGGER_NODE_ID) {
      setEntryStepId(info.target);
      return;
    }
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== info.source) return s;
        if (s.type === "condition") {
          const cond = s as WorkflowStep & {
            on_true_id?: string;
            on_false_id?: string;
          };
          if (info.sourceHandle === "true") {
            return { ...cond, on_true_id: info.target } as WorkflowStep;
          }
          if (info.sourceHandle === "false") {
            return { ...cond, on_false_id: info.target } as WorkflowStep;
          }
          return s;
        }
        return { ...s, next_id: info.target } as WorkflowStep;
      })
    );
  }, []);

  const handleDisconnect = useCallback((info: ConnectInfo) => {
    if (info.source === TRIGGER_NODE_ID) {
      setEntryStepId(undefined);
      return;
    }
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== info.source) return s;
        if (s.type === "condition") {
          const cond = s as WorkflowStep & {
            on_true_id?: string;
            on_false_id?: string;
          };
          if (info.sourceHandle === "true") {
            return { ...cond, on_true_id: undefined } as WorkflowStep;
          }
          if (info.sourceHandle === "false") {
            return { ...cond, on_false_id: undefined } as WorkflowStep;
          }
          return s;
        }
        if ("next_id" in s && s.next_id === info.target) {
          return { ...s, next_id: undefined } as WorkflowStep;
        }
        return s;
      })
    );
  }, []);

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
          description: description.trim() || null,
          is_template: isTemplate,
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
      const publishWarning = json.data?.publish_warning as
        | { reason: string; message: string }
        | null
        | undefined;
      if (publishWarning) {
        // Save succeeded but the workflow can't be activated/launched yet.
        // Surface the precise reason (e.g. "Connectez WhatsApp…") so the
        // user knows their next step.
        toast.warning(publishWarning.message, { duration: 8000 });
      } else {
        toast.success("Modifications enregistrées");
      }
    } catch (e) {
      toastFromApiError(e, "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }, [
    workflow,
    workflowId,
    name,
    description,
    isTemplate,
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

  // Client-side dry run — simulates the workflow against a synthetic prospect
  // and surfaces every step's would-be outcome in a dialog. No real messages
  // are sent and the database is untouched.
  const handleTest = useCallback(() => {
    setTesting(true);
    try {
      const result = simulateWorkflow(definition, trigger);
      setTestResult(result);
      if (result.entries.length === 1) {
        toast.error("Ajoutez au moins une étape avant de tester.");
        return;
      }
      const warnings = result.entries.filter((e) => e.status === "warn").length;
      if (warnings === 0) {
        toast.success("Test terminé sans erreur");
      } else {
        toast.warning(
          `${warnings} avertissement${warnings > 1 ? "s" : ""} pendant la simulation`
        );
      }
    } finally {
      setTesting(false);
    }
  }, [definition, trigger]);

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

  // Delete / Backspace removes the selected node (skipping the trigger).
  // Skips when focus is on a form field so input editing isn't hijacked.
  useEffect(() => {
    function isTextInput(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (isTextInput(e.target)) return;
      if (!selectedId) return;
      if (selectedId === TRIGGER_NODE_ID) return;
      e.preventDefault();
      deleteStep(selectedId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteStep]);

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
          onClick={() => router.push("/workflows")}
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
          isTemplate={isTemplate}
          saving={saving}
          togglingActive={togglingActive}
          testing={testing}
          canLaunch={workflow.published_definition != null}
          onBack={() => router.push("/workflows")}
          onSave={() => void handleSave()}
          onToggleActive={() => void handleToggleActive()}
          onTest={() => void handleTest()}
          onLaunch={() => setLaunchOpen(true)}
          onOpenRuns={() => setRunsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsDialog
          open={settingsOpen}
          initialName={name}
          initialDescription={description}
          initialIsTemplate={isTemplate}
          onClose={() => setSettingsOpen(false)}
          onSave={({ name: nextName, description: nextDesc, isTemplate: nextTpl }) => {
            if (nextName.trim().length > 0) setName(nextName);
            setDescription(nextDesc);
            setIsTemplate(nextTpl);
            setSettingsOpen(false);
            toast.info(
              "Modifications enregistrées localement. Cliquez sur Enregistrer pour les persister."
            );
          }}
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
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
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
        <TestResultsDialog
          open={!!testResult}
          result={testResult}
          onClose={() => setTestResult(null)}
        />
        <WorkflowListEnrollModal
          open={launchOpen}
          onOpenChange={setLaunchOpen}
          workflowId={workflowId}
          onSuccess={() => {
            setLaunchOpen(false);
            void loadWorkflow();
            // Auto-open the runs panel so the user immediately sees their
            // newly enrolled prospects.
            setRunsOpen(true);
          }}
        />
        <RunsPanel
          open={runsOpen}
          workflowId={workflowId}
          onClose={() => setRunsOpen(false)}
        />
      </ReactFlowProvider>
    </div>
  );
}
