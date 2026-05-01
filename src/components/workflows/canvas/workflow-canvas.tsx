"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type EdgeMarker,
  MarkerType,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  isWorkflowStepConfigured,
  type WorkflowDefinition,
  type WorkflowCanvasPositions,
} from "@/lib/workflows";
import { getStepLabel } from "@/lib/workflows";
import { autoLayoutWorkflow } from "./auto-layout";
import { StepNode, type StepNodeData } from "./nodes/step-node";

const NODE_TYPES = { step: StepNode };

interface WorkflowCanvasProps {
  definition: WorkflowDefinition;
  positions?: WorkflowCanvasPositions;
  selectedStepId?: string | null;
  readOnly?: boolean;
  /** Called when the user finishes dragging a node. Debounced upstream. */
  onPositionsChange?: (positions: WorkflowCanvasPositions) => void;
  onSelectStep?: (stepId: string) => void;
  className?: string;
}

function buildSubtitle(step: WorkflowDefinition["steps"][number]): string | undefined {
  if (step.type === "wait") {
    const cfg = step.config as { durationHours?: number; onlyIfNoReply?: boolean };
    const h = Number(cfg.durationHours);
    if (!Number.isFinite(h) || h <= 0) return undefined;
    const base = h >= 24
      ? `${Math.round(h / 24)} jour${h >= 48 ? "s" : ""}`
      : `${h} heure${h > 1 ? "s" : ""}`;
    return cfg.onlyIfNoReply ? `${base} si pas de réponse` : base;
  }
  if (step.type === "whatsapp_message") {
    const cfg = step.config as { messageTemplate?: string };
    return cfg.messageTemplate?.trim() || undefined;
  }
  if (step.type === "condition") {
    return "Si le prospect a répondu";
  }
  return undefined;
}

function buildNodes(
  def: WorkflowDefinition,
  positions: WorkflowCanvasPositions,
  selectedStepId: string | null | undefined
): Node[] {
  return def.steps.map((step) => {
    const pos = positions[step.id] ?? { x: 0, y: 0 };
    const data: StepNodeData = {
      step,
      label: getStepLabel(step.type).label,
      subtitle: buildSubtitle(step),
      configured: isWorkflowStepConfigured(step),
    };
    return {
      id: step.id,
      type: "step",
      position: pos,
      data: data as unknown as Record<string, unknown>,
      selected: selectedStepId === step.id,
      draggable: true,
    } satisfies Node;
  });
}

function defHasGraphPointers(def: WorkflowDefinition): boolean {
  if (def.entry_step_id) return true;
  return def.steps.some(
    (s) =>
      ("next_id" in s && s.next_id !== undefined) ||
      (s.type === "condition" &&
        ((s as { on_true_id?: string }).on_true_id !== undefined ||
          (s as { on_false_id?: string }).on_false_id !== undefined))
  );
}

function buildEdges(def: WorkflowDefinition): Edge[] {
  const edges: Edge[] = [];
  const marker: EdgeMarker = {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
  };

  // Linear fallback: connect step[i] → step[i+1] when no pointers are wired.
  if (!defHasGraphPointers(def)) {
    for (let i = 0; i < def.steps.length - 1; i++) {
      const from = def.steps[i]!;
      const to = def.steps[i + 1]!;
      edges.push({
        id: `${from.id}-seq-${to.id}`,
        source: from.id,
        target: to.id,
        style: { stroke: "rgb(148 163 184)", strokeWidth: 1.5 },
        markerEnd: marker,
        type: "smoothstep",
      });
    }
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
          label: "Oui",
          labelStyle: { fontSize: 11, fontWeight: 500 },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 999,
          labelBgStyle: { fill: "rgb(220 252 231)" },
          style: { stroke: "rgb(16 185 129)", strokeWidth: 1.5 },
          markerEnd: marker,
          type: "smoothstep",
        });
      }
      if (step.on_false_id) {
        edges.push({
          id: `${step.id}-false`,
          source: step.id,
          sourceHandle: "false",
          target: step.on_false_id,
          label: "Non",
          labelStyle: { fontSize: 11, fontWeight: 500 },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 999,
          labelBgStyle: { fill: "rgb(255 228 230)" },
          style: { stroke: "rgb(244 63 94)", strokeWidth: 1.5 },
          markerEnd: marker,
          type: "smoothstep",
        });
      }
    } else if ("next_id" in step && step.next_id) {
      edges.push({
        id: `${step.id}-next`,
        source: step.id,
        target: step.next_id,
        style: { stroke: "rgb(148 163 184)", strokeWidth: 1.5 },
        markerEnd: marker,
        type: "smoothstep",
      });
    }
  }
  return edges;
}

function CanvasInner({
  definition,
  positions,
  selectedStepId,
  readOnly,
  onPositionsChange,
  onSelectStep,
  className,
}: WorkflowCanvasProps) {
  // Resolve every step to a position, filling unknowns via auto-layout.
  const resolvedPositions = useMemo(
    () => autoLayoutWorkflow(definition, positions),
    [definition, positions]
  );

  const initialNodes = useMemo(
    () => buildNodes(definition, resolvedPositions, selectedStepId),
    [definition, resolvedPositions, selectedStepId]
  );
  const edges = useMemo(() => buildEdges(definition), [definition]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  // Re-sync local node state when the upstream definition or positions change.
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const debounceRef = useRef<number | null>(null);
  const latestNodesRef = useRef<Node[]>(nodes);
  useEffect(() => {
    latestNodesRef.current = nodes;
  }, [nodes]);

  const commitPositions = useCallback(() => {
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
        debounceRef.current = window.setTimeout(commitPositions, 250);
      }
    },
    [readOnly, commitPositions]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onSelectStep?.(node.id);
    },
    [onSelectStep]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={className}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
