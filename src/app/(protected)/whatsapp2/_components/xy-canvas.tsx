"use client";

// xyflow-based canvas. The visual style of nodes / edges / labels is faithful
// to design/whatsapp/wf-components.jsx (color stripe nodes, dashed edges with
// Oui/Non pill labels, dotted background). xyflow handles drag/zoom/pan.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Edge,
  type EdgeMarker,
  MarkerType,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { autoLayoutWorkflow } from "@/components/workflows/canvas/auto-layout";
import {
  isWorkflowStepConfigured,
  type WorkflowDefinition,
  type WorkflowCanvasPositions,
  type WorkflowStep,
  WORKFLOW_TRIGGERS,
  type WorkflowTemplateTrigger,
} from "@/lib/workflows";
import { StepNode } from "./step-node";
import type { WfNodeType } from "./node-types";

const NODE_TYPES = { step: StepNode };

/** Map backend step types into the design's node-type vocabulary. */
const STEP_TO_NODE_TYPE: Record<string, WfNodeType> = {
  whatsapp_message: "whatsapp",
  wait: "wait",
  condition: "condition",
  linkedin_invite: "linkedin",
  linkedin_message: "linkedin",
};

const TRIGGER_NODE_ID = "__trigger__";

interface XyCanvasProps {
  definition: WorkflowDefinition;
  positions?: WorkflowCanvasPositions;
  /** Optional trigger metadata from the workflow's `metadata.ui.trigger`. */
  trigger?: WorkflowTemplateTrigger | null;
  selectedStepId?: string | null;
  readOnly?: boolean;
  onPositionsChange?: (positions: WorkflowCanvasPositions) => void;
  onSelectStep?: (stepId: string | null) => void;
  className?: string;
}

function buildSubtitle(step: WorkflowStep): string | undefined {
  if (step.type === "wait") {
    const cfg = step.config as { durationHours?: number; onlyIfNoReply?: boolean };
    const h = Number(cfg.durationHours);
    if (!Number.isFinite(h) || h <= 0) return undefined;
    const base =
      h >= 24
        ? `${Math.round(h / 24)} jour${h >= 48 ? "s" : ""}`
        : `${h} heure${h > 1 ? "s" : ""}`;
    return cfg.onlyIfNoReply ? `${base} si pas de réponse` : base;
  }
  if (step.type === "whatsapp_message" || step.type === "linkedin_message") {
    const cfg = step.config as { messageTemplate?: string };
    const t = cfg.messageTemplate?.trim();
    if (!t) return undefined;
    return t.length > 56 ? `${t.slice(0, 56)}…` : t;
  }
  if (step.type === "condition") return "Si le prospect a répondu";
  return undefined;
}

function buildLabel(step: WorkflowStep): string {
  if (step.type === "wait") return "Attendre";
  if (step.type === "whatsapp_message") return "Message WhatsApp";
  if (step.type === "linkedin_message") return "Message LinkedIn";
  if (step.type === "linkedin_invite") return "Invitation LinkedIn";
  if (step.type === "condition") return "Le prospect a répondu ?";
  return "Étape";
}

function defHasGraphPointers(def: WorkflowDefinition): boolean {
  if (def.entry_step_id) return true;
  return def.steps.some(
    (s) =>
      s.next_id !== undefined ||
      (s.type === "condition" &&
        ((s as { on_true_id?: string }).on_true_id !== undefined ||
          (s as { on_false_id?: string }).on_false_id !== undefined))
  );
}

function buildNodes(
  def: WorkflowDefinition,
  positions: WorkflowCanvasPositions,
  selectedStepId: string | null | undefined,
  trigger: WorkflowTemplateTrigger | null | undefined
): Node[] {
  const nodes: Node[] = [];

  // Synthetic trigger node at the top — backend doesn't model triggers as
  // first-class steps, so we render a display-only node above the first real one.
  const triggerLabel = trigger
    ? (WORKFLOW_TRIGGERS.find((t) => t.id === trigger)?.label ?? "Déclencheur")
    : "Déclencheur";
  const triggerPos = positions[TRIGGER_NODE_ID] ?? { x: 0, y: -140 };
  nodes.push({
    id: TRIGGER_NODE_ID,
    type: "step",
    position: triggerPos,
    draggable: true,
    selected: selectedStepId === TRIGGER_NODE_ID,
    data: {
      type: "trigger" as WfNodeType,
      stepId: TRIGGER_NODE_ID,
      label: triggerLabel,
      sub: trigger ? "Déclencheur configuré" : "À configurer",
      needsConfig: !trigger,
    },
  });

  for (const step of def.steps) {
    const nodeType = STEP_TO_NODE_TYPE[step.type] ?? "end";
    const pos = positions[step.id] ?? { x: 0, y: 0 };
    nodes.push({
      id: step.id,
      type: "step",
      position: pos,
      draggable: true,
      selected: selectedStepId === step.id,
      data: {
        type: nodeType as WfNodeType,
        stepId: step.id,
        label: buildLabel(step),
        sub: buildSubtitle(step),
        needsConfig: !isWorkflowStepConfigured(step),
      },
    });
  }

  return nodes;
}

function buildEdges(
  def: WorkflowDefinition,
  trigger: WorkflowTemplateTrigger | null | undefined
): Edge[] {
  const edges: Edge[] = [];
  const marker: EdgeMarker = {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: "#CBD5E1",
  };
  const baseStyle = { stroke: "#CBD5E1", strokeWidth: 1.5 };

  // Connect the synthetic trigger to the entry step.
  const entryId = def.entry_step_id ?? def.steps[0]?.id;
  if (entryId) {
    edges.push({
      id: `trigger-${entryId}`,
      source: TRIGGER_NODE_ID,
      target: entryId,
      type: "smoothstep",
      style: baseStyle,
      markerEnd: marker,
    });
  }

  if (!defHasGraphPointers(def)) {
    // Linear fallback for legacy definitions: connect step[i] → step[i+1].
    for (let i = 0; i < def.steps.length - 1; i++) {
      const from = def.steps[i]!;
      const to = def.steps[i + 1]!;
      edges.push({
        id: `${from.id}-seq-${to.id}`,
        source: from.id,
        target: to.id,
        type: "smoothstep",
        style: baseStyle,
        markerEnd: marker,
      });
    }
    // Hint that trigger metadata is missing — silenced for now (we just don't draw it).
    void trigger;
    return edges;
  }

  for (const step of def.steps) {
    if (step.type === "condition") {
      if (step.on_true_id) {
        edges.push({
          id: `${step.id}-true`,
          source: step.id,
          sourceHandle: "true",
          target: step.on_true_id,
          type: "smoothstep",
          label: "Oui",
          labelStyle: {
            fontSize: 10,
            fontWeight: 600,
            fill: "#065F46",
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 999,
          labelBgStyle: { fill: "#ECFDF5", stroke: "#10B981", strokeWidth: 1 },
          style: { stroke: "#CBD5E1", strokeWidth: 1.5, strokeDasharray: "5 3" },
          markerEnd: marker,
        });
      }
      if (step.on_false_id) {
        edges.push({
          id: `${step.id}-false`,
          source: step.id,
          sourceHandle: "false",
          target: step.on_false_id,
          type: "smoothstep",
          label: "Non",
          labelStyle: {
            fontSize: 10,
            fontWeight: 600,
            fill: "#BE123C",
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 999,
          labelBgStyle: { fill: "#FFF1F2", stroke: "#F43F5E", strokeWidth: 1 },
          style: { stroke: "#CBD5E1", strokeWidth: 1.5, strokeDasharray: "5 3" },
          markerEnd: marker,
        });
      }
    } else if (step.next_id) {
      edges.push({
        id: `${step.id}-next`,
        source: step.id,
        target: step.next_id,
        type: "smoothstep",
        style: baseStyle,
        markerEnd: marker,
      });
    }
  }
  return edges;
}

function CanvasInner({
  definition,
  positions,
  trigger,
  selectedStepId,
  readOnly,
  onPositionsChange,
  onSelectStep,
  className,
}: XyCanvasProps) {
  const resolvedPositions = useMemo(
    () => autoLayoutWorkflow(definition, positions),
    [definition, positions]
  );

  const initialNodes = useMemo(
    () => buildNodes(definition, resolvedPositions, selectedStepId, trigger),
    [definition, resolvedPositions, selectedStepId, trigger]
  );
  const edges = useMemo(
    () => buildEdges(definition, trigger),
    [definition, trigger]
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const debounceRef = useRef<number | null>(null);
  const latestNodesRef = useRef<Node[]>(nodes);
  useEffect(() => {
    latestNodesRef.current = nodes;
  }, [nodes]);

  const commit = useCallback(() => {
    if (!onPositionsChange) return;
    const next: WorkflowCanvasPositions = {};
    for (const n of latestNodesRef.current) {
      next[n.id] = { x: n.position.x, y: n.position.y };
    }
    onPositionsChange(next);
  }, [onPositionsChange]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      setNodes((prev) => applyNodeChanges(changes, prev));
      const dragEnded = changes.some(
        (c) => c.type === "position" && c.dragging === false
      );
      if (dragEnded) {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(commit, 250);
      }
    },
    [readOnly, commit]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onSelectStep?.(node.id);
    },
    [onSelectStep]
  );

  const handlePaneClick = useCallback(() => {
    onSelectStep?.(null);
  }, [onSelectStep]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
        maxZoom={1.5}
        style={{ background: "#F8FAFC" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#CBD5E1"
        />
      </ReactFlow>
    </div>
  );
}

export { TRIGGER_NODE_ID };

export function XyCanvas(props: XyCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
