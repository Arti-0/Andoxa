"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "@/lib/toast";
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
import {
  computeStraightenedLayout,
  LAYOUT_TRUNK_START_Y,
  triggerCanvasPosition,
} from "@/components/workflows/canvas/auto-layout";
import { TemplateApplyDialog } from "../_components/template-apply-dialog";
import { toastFromApiError } from "@/lib/toast";
import {
  parseWorkflowUi,
  type WorkflowCanvasPositions,
  type WorkflowDefinition,
  type WorkflowTemplate,
  type WorkflowTemplateTrigger,
  type WorkflowTriggerKind,
} from "@/lib/workflows";
import { isWorkflowTriggerKind } from "@/lib/workflows/trigger-kind";
import type { WorkflowStep, WorkflowStepType } from "@/lib/workflows/schema";
import {
  deriveStatus,
  type BackendWorkflowRow,
  type DesignStatus,
} from "../_components/workflow-mapping";
import {
  fetchWorkflowDetail,
  fetchWorkflowRuns,
  workflowQueryKeys,
} from "../_lib/queries";

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

const NEW_STEP_Y_OFFSET = 140;

async function resolveTemplateTriggerConfig(
  template: WorkflowTemplate
): Promise<Record<string, unknown>> {
  if (!template.triggerConfigStatusKey) return {};
  try {
    const res = await fetch("/api/prospect-statuses", { credentials: "include" });
    if (!res.ok) return {};
    const json = await res.json();
    const items: Array<{ id: string; key: string }> =
      json.data?.items ?? json.items ?? [];
    const match = items.find((s) => s.key === template.triggerConfigStatusKey);
    return match ? { targetStatusId: match.id } : {};
  } catch {
    return {};
  }
}

/** Wire `childId` as the next output of `parentId` (inserts when parent already had a target). */
function attachChildToStep(
  steps: WorkflowStep[],
  parentId: string,
  childId: string,
): WorkflowStep[] {
  let splicedTarget: string | undefined;
  let wired = false;

  const withParent = steps.map((s) => {
    if (s.id !== parentId) return s;
    if (s.type === "condition") {
      const c = s as WorkflowStep & {
        on_true_id?: string;
        on_false_id?: string;
      };
      if (!c.on_true_id) {
        wired = true;
        return { ...c, on_true_id: childId } as WorkflowStep;
      }
      if (!c.on_false_id) {
        wired = true;
        return { ...c, on_false_id: childId } as WorkflowStep;
      }
      return s;
    }
    splicedTarget = (s as { next_id?: string }).next_id;
    wired = true;
    return { ...s, next_id: childId } as WorkflowStep;
  });

  if (!wired) return steps;

  if (!splicedTarget) return withParent;

  return withParent.map((s) =>
    s.id === childId
      ? ({ ...s, next_id: splicedTarget } as WorkflowStep)
      : s,
  );
}

/** True when the step still has a free outgoing branch / next pointer. */
function stepCanAcceptNewChild(step: WorkflowStep): boolean {
  if (step.type === "condition") {
    const c = step as WorkflowStep & {
      on_true_id?: string;
      on_false_id?: string;
    };
    return !c.on_true_id || !c.on_false_id;
  }
  return !("next_id" in step && step.next_id);
}

function resolveInitialCanvasPositions(
  def: WorkflowDefinition,
  saved: WorkflowCanvasPositions,
): WorkflowCanvasPositions {
  if (def.steps.length === 0) return saved;
  const missingStep = def.steps.some((s) => !saved[s.id]);
  if (!missingStep && saved[TRIGGER_NODE_ID]) return saved;
  return computeStraightenedLayout(def);
}

function hydrateFromWorkflowRow(w: BackendWorkflowRow): {
  steps: WorkflowStep[];
  entryStepId: string | undefined;
  canvasPositions: WorkflowCanvasPositions;
  triggerKind: WorkflowTriggerKind;
  triggerConfig: Record<string, unknown>;
  trigger: WorkflowTemplateTrigger | null;
  name: string;
  description: string;
  isTemplate: boolean;
  iconKey: string;
  colorKey: string;
} {
  const tk = w.trigger_kind;
  const tc =
    w.trigger_config && typeof w.trigger_config === "object" && !Array.isArray(w.trigger_config)
      ? (w.trigger_config as Record<string, unknown>)
      : {};
  const ui = parseWorkflowUi(w.metadata);
  const def = w.draft_definition as
    | { steps?: WorkflowStep[]; entry_step_id?: string }
    | null;
  const steps = Array.isArray(def?.steps) ? def!.steps : [];
  const entryStepId = def?.entry_step_id;
  const definition: WorkflowDefinition = {
    schemaVersion: 1,
    steps,
    ...(entryStepId ? { entry_step_id: entryStepId } : {}),
  };
  return {
    steps,
    entryStepId,
    canvasPositions: resolveInitialCanvasPositions(
      definition,
      ui.canvas ?? {},
    ),
    triggerKind: isWorkflowTriggerKind(tk) ? tk : "manual",
    triggerConfig: tc,
    trigger: (ui.trigger as WorkflowTemplateTrigger | undefined) ?? null,
    name: w.name,
    description: w.description ?? "",
    isTemplate: Boolean(w.is_template),
    iconKey: ui.icon,
    colorKey: ui.color,
  };
}

export function CanvasClient({ workflowId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: fetchedWorkflow,
    isLoading: queryLoading,
  } = useQuery({
    queryKey: workflowQueryKeys.detail(workflowId),
    queryFn: () => fetchWorkflowDetail(workflowId),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Prefetch runs so the executions modal opens instantly from cache.
  useQuery({
    queryKey: workflowQueryKeys.runs(workflowId),
    queryFn: () => fetchWorkflowRuns(workflowId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Persisted server state.
  const [workflow, setWorkflow] = useState<BackendWorkflowRow | null>(null);
  const hydratedIdRef = useRef<string | null>(null);

  // Editable local state — persists on Save.
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [entryStepId, setEntryStepId] = useState<string | undefined>(undefined);
  // Kept for metadata round-trip on save — no UI surface anymore (the canvas
  // and side panel now drive identity entirely off trigger_kind).
  const [trigger, setTrigger] = useState<WorkflowTemplateTrigger | null>(null);
  const [triggerKind, setTriggerKind] = useState<WorkflowTriggerKind>("manual");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});

  /* ── Undo stack ───────────────────────────────────────────────────────────
     Graph-level snapshots so Ctrl/Cmd+Z reverses the last mutation. We track
     refs alongside React state so `pushHistory()` always captures the latest
     values regardless of batching. Capped at 50 entries — enough for normal
     editing without hoarding memory. */
  type Snapshot = {
    steps: WorkflowStep[];
    entryStepId: string | undefined;
    triggerKind: WorkflowTriggerKind;
    triggerConfig: Record<string, unknown>;
  };
  const historyRef = useRef<Snapshot[]>([]);
  const stepsRef = useRef(steps);
  const entryStepIdRef = useRef(entryStepId);
  const triggerKindRef = useRef<WorkflowTriggerKind>(triggerKind);
  const triggerConfigRef = useRef<Record<string, unknown>>(triggerConfig);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);
  useEffect(() => {
    entryStepIdRef.current = entryStepId;
  }, [entryStepId]);
  useEffect(() => {
    triggerKindRef.current = triggerKind;
  }, [triggerKind]);
  useEffect(() => {
    triggerConfigRef.current = triggerConfig;
  }, [triggerConfig]);
  const HISTORY_LIMIT = 50;
  const pushHistory = useCallback(() => {
    historyRef.current.push({
      steps: stepsRef.current,
      entryStepId: entryStepIdRef.current,
      triggerKind: triggerKindRef.current,
      triggerConfig: triggerConfigRef.current,
    });
    if (historyRef.current.length > HISTORY_LIMIT) {
      historyRef.current.shift();
    }
  }, []);
  const undo = useCallback(() => {
    const last = historyRef.current.pop();
    if (!last) return false;
    setSteps(last.steps);
    setEntryStepId(last.entryStepId);
    setTriggerKind(last.triggerKind);
    setTriggerConfig(last.triggerConfig);
    return true;
  }, []);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [iconKey, setIconKey] = useState<string>("Workflow");
  const [colorKey, setColorKey] = useState<string>("violet");
  const [canvasPositions, setCanvasPositions] = useState<WorkflowCanvasPositions>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testResult, setTestResult] = useState<SimResult | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [runsOpen, setRunsOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<WorkflowTemplate | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Async state.
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [testing, setTesting] = useState(false);
  const positionsCommitTimer = useRef<number | null>(null);

  const status: DesignStatus = workflow ? deriveStatus(workflow) : "draft";

  useEffect(() => {
    if (!fetchedWorkflow) return;
    setWorkflow(fetchedWorkflow);
    if (hydratedIdRef.current === fetchedWorkflow.id) return;
    const h = hydrateFromWorkflowRow(fetchedWorkflow);
    setName(h.name);
    setDescription(h.description);
    setIsTemplate(h.isTemplate);
    setTriggerKind(h.triggerKind);
    setTriggerConfig(h.triggerConfig);
    setIconKey(h.iconKey);
    setColorKey(h.colorKey);
    setTrigger(h.trigger);
    setCanvasPositions(h.canvasPositions);
    setSteps(h.steps);
    setEntryStepId(h.entryStepId);
    historyRef.current = [];
    hydratedIdRef.current = fetchedWorkflow.id;
  }, [fetchedWorkflow]);

  useEffect(() => {
    hydratedIdRef.current = null;
  }, [workflowId]);

  const loading = queryLoading && !fetchedWorkflow;
  const loadError = !queryLoading && !fetchedWorkflow;

  // ── Local mutations ────────────────────────────────────────────────────

  const definition: WorkflowDefinition = useMemo(
    () => ({
      schemaVersion: 1,
      steps,
      ...(entryStepId ? { entry_step_id: entryStepId } : {}),
    }),
    [steps, entryStepId]
  );

  const addStep = useCallback(
    (type: WorkflowStepType) => {
      pushHistory();
      const newId = newStepId();
      const newStep = {
        id: newId,
        type,
        config: defaultConfigForType(type),
      } as WorkflowStep;
      const focusId = selectedIdRef.current ?? TRIGGER_NODE_ID;

      setSteps((prev) => {
        const next = [...prev, newStep];
        if (focusId === TRIGGER_NODE_ID) {
          const entry = entryStepIdRef.current;
          if (!entry) return next;
          const entryStep = next.find((s) => s.id === entry);
          if (!entryStep || !stepCanAcceptNewChild(entryStep)) return next;
          return attachChildToStep(next, entry, newId);
        }
        const focusStep = next.find((s) => s.id === focusId);
        if (!focusStep || !stepCanAcceptNewChild(focusStep)) return next;
        return attachChildToStep(next, focusId, newId);
      });

      if (focusId === TRIGGER_NODE_ID && !entryStepIdRef.current) {
        setEntryStepId(newId);
      }

      setCanvasPositions((prev) => {
        const anchorId =
          focusId === TRIGGER_NODE_ID
            ? entryStepIdRef.current ?? TRIGGER_NODE_ID
            : focusId;
        const anchor =
          prev[anchorId] ??
          (anchorId === TRIGGER_NODE_ID
            ? triggerCanvasPosition()
            : { x: -126, y: LAYOUT_TRUNK_START_Y });
        return {
          ...prev,
          [newId]: { x: anchor.x, y: anchor.y + NEW_STEP_Y_OFFSET },
        };
      });

      setSelectedId(newId);
    },
    [pushHistory]
  );

  const updateStep = useCallback(
    (stepId: string, patch: Record<string, unknown>) => {
      pushHistory();
      setSteps((prev) =>
        prev.map((s) =>
          s.id === stepId
            ? ({ ...s, config: { ...s.config, ...patch } } as WorkflowStep)
            : s
        )
      );
    },
    [pushHistory]
  );

  const deleteStep = useCallback(
    (stepId: string) => {
      pushHistory();
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
    [selectedId, pushHistory]
  );

  // Drag-to-connect → set the corresponding pointer on the source step (or
  // entry_step_id when the source is the synthetic trigger node).
  const handleConnect = useCallback(
    (info: ConnectInfo) => {
      if (info.target === TRIGGER_NODE_ID) return; // can't end on the trigger
      pushHistory();
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
    },
    [pushHistory]
  );

  const handleDisconnect = useCallback(
    (info: ConnectInfo) => {
      pushHistory();
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
    },
    [pushHistory]
  );

  const duplicateStep = useCallback(
    (stepId: string) => {
      pushHistory();
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
    },
    [pushHistory]
  );

  const requestApplyTemplate = useCallback((t: WorkflowTemplate) => {
    setPendingTemplate(t);
  }, []);

  const confirmApplyTemplate = useCallback(async () => {
    const t = pendingTemplate;
    if (!t) return;
    setApplyingTemplate(true);
    try {
      pushHistory();
      const def = t.buildDefinition();
      const nextDefinition: WorkflowDefinition = {
        schemaVersion: 1,
        steps: def.steps,
        ...(def.entry_step_id ? { entry_step_id: def.entry_step_id } : {}),
      };
      const triggerCfg = await resolveTemplateTriggerConfig(t);

      setSteps(def.steps);
      setEntryStepId(def.entry_step_id);
      setTrigger(t.trigger);
      setTriggerKind(t.triggerKind);
      setTriggerConfig(triggerCfg);
      setIconKey(t.ui.icon);
      setColorKey(t.ui.color);
      setCanvasPositions(computeStraightenedLayout(nextDefinition));
      setSelectedId(null);
      setPendingTemplate(null);
      toast.success("Modèle appliqué");
    } catch (e) {
      toastFromApiError(e, "Impossible d'appliquer le modèle");
    } finally {
      setApplyingTemplate(false);
    }
  }, [pendingTemplate, pushHistory]);

  // Wraps `setTriggerKind` so trigger swaps participate in undo and stay
  // consistent with the rest of the graph history.
  const setTriggerKindWithHistory = useCallback(
    (next: WorkflowTriggerKind) => {
      pushHistory();
      setTriggerKind(next);
      // Changing the trigger kind invalidates the previous trigger_config —
      // a target status id is meaningless once you switch to on_no_show, etc.
      setTriggerConfig({});
    },
    [pushHistory]
  );

  const setTriggerConfigWithHistory = useCallback(
    (next: Record<string, unknown>) => {
      pushHistory();
      setTriggerConfig(next);
    },
    [pushHistory]
  );

  // ── Server mutations ───────────────────────────────────────────────────

  const syncWorkflowCache = useCallback(
    (row: BackendWorkflowRow) => {
      setWorkflow(row);
      queryClient.setQueryData(workflowQueryKeys.detail(workflowId), row);
    },
    [queryClient, workflowId],
  );

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
          trigger_kind: triggerKind,
          trigger_config: triggerConfig,
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
      syncWorkflowCache(json.data.workflow as BackendWorkflowRow);
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
    triggerKind,
    triggerConfig,
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
      syncWorkflowCache(json.data.workflow as BackendWorkflowRow);
      toast.success(next ? "Workflow activé" : "Workflow mis en pause");
    } catch (e) {
      toastFromApiError(e, "Mise à jour impossible");
    } finally {
      setTogglingActive(false);
    }
  }, [workflow, workflowId, syncWorkflowCache]);

  const handleLaunch = useCallback(async () => {
    if (!workflow) return;
    if (!workflow.is_active) {
      setTogglingActive(true);
      try {
        const res = await fetch(`/api/workflows/${workflowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ is_active: true }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message ?? "Activation impossible");
        }
        syncWorkflowCache(json.data.workflow as BackendWorkflowRow);
        toast.success("Workflow activé");
      } catch (e) {
        toastFromApiError(e, "Activation impossible");
        return;
      } finally {
        setTogglingActive(false);
      }
    }
    setLaunchOpen(true);
  }, [workflow, workflowId, syncWorkflowCache, queryClient]);

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
      if (!workflow) return;
      setCanvasPositions(next);
      if (positionsCommitTimer.current) {
        window.clearTimeout(positionsCommitTimer.current);
      }
      positionsCommitTimer.current = window.setTimeout(async () => {
        try {
          const res = await fetch(`/api/workflows/${workflowId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ui: { canvas: next } }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => null);
            console.warn(
              "[canvas] position save failed",
              res.status,
              json?.error?.message ?? res.statusText
            );
          }
        } catch (err) {
          console.warn("[canvas] position save failed", err);
        }
      }, 400);
    },
    [workflowId, workflow]
  );

  const straightenLayout = useCallback(() => {
    const next = computeStraightenedLayout(definition);
    commitPositions(next);
  }, [definition, commitPositions]);

  useEffect(() => {
    return () => {
      if (positionsCommitTimer.current) {
        window.clearTimeout(positionsCommitTimer.current);
      }
    };
  }, []);

  // Keyboard shortcuts:
  //   • Delete / Backspace → removes the selected node (skipping the trigger).
  //   • Ctrl/Cmd + Z       → undo the last graph mutation.
  // Both skip when focus is on a form field so input editing isn't hijacked
  // (the browser handles native input-level undo there).
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
      if (isTextInput(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!selectedId) return;
      if (selectedId === TRIGGER_NODE_ID) return;
      e.preventDefault();
      deleteStep(selectedId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteStep, undo]);

  // ── Derived ────────────────────────────────────────────────────────────

  const selectedStep = useMemo(() => {
    if (!selectedId || selectedId === TRIGGER_NODE_ID) return null;
    return steps.find((s) => s.id === selectedId) ?? null;
  }, [selectedId, steps]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="ws2-root flex h-full min-h-0 items-center justify-center bg-background text-muted-foreground">
        <Whatsapp2Styles />
        <p className="text-[13px]">Chargement…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="ws2-root flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-background text-foreground">
        <Whatsapp2Styles />
        <p className="text-sm font-semibold">Workflow introuvable.</p>
        <button
          type="button"
          onClick={() => router.push("/workflows")}
          className="cursor-pointer rounded-[10px] border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-sm hover:bg-accent"
        >
          Retour
        </button>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="ws2-root flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-background text-foreground">
        <Whatsapp2Styles />
        <p className="text-sm font-semibold">Workflow introuvable.</p>
        <button
          type="button"
          onClick={() => router.push("/workflows")}
          className="cursor-pointer rounded-[10px] border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-sm hover:bg-accent"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="ws2-root flex h-full min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground">
      <Whatsapp2Styles />
      <ReactFlowProvider>
        <CanvasToolbar
          status={status}
          isTemplate={isTemplate}
          triggerKind={triggerKind}
          saving={saving}
          togglingActive={togglingActive}
          testing={testing}
          canLaunch={workflow.published_definition != null}
          onSave={() => void handleSave()}
          onToggleActive={() => void handleToggleActive()}
          onTest={() => void handleTest()}
          onLaunch={() => void handleLaunch()}
          onOpenRuns={() => setRunsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onStraightenLayout={straightenLayout}
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
          <LeftPanel onAddStep={addStep} onApplyTemplate={requestApplyTemplate} />
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            <XyCanvas
              definition={definition}
              positions={canvasPositions}
              triggerKind={triggerKind}
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
              triggerKind={triggerKind}
              triggerConfig={triggerConfig}
              onClose={() => setSelectedId(null)}
              onUpdateStep={updateStep}
              onUpdateTriggerKind={setTriggerKindWithHistory}
              onUpdateTriggerConfig={setTriggerConfigWithHistory}
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
            void queryClient.invalidateQueries({
              queryKey: workflowQueryKeys.runs(workflowId),
            });
            setRunsOpen(true);
          }}
        />
        <RunsPanel
          open={runsOpen}
          workflowId={workflowId}
          onClose={() => setRunsOpen(false)}
        />
        <TemplateApplyDialog
          template={pendingTemplate}
          busy={applyingTemplate}
          onClose={() => {
            if (!applyingTemplate) setPendingTemplate(null);
          }}
          onConfirm={() => void confirmApplyTemplate()}
        />
      </ReactFlowProvider>
    </div>
  );
}
