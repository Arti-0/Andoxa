"use client";

// xyflow-based canvas. The visual style of nodes / edges / labels is faithful
// to design/whatsapp/wf-components.jsx (color stripe nodes, dashed edges with
// Oui/Non pill labels, dotted background). xyflow handles drag/zoom/pan.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  getSmoothStepPath,
  type Connection,
  type ConnectionLineComponentProps,
  type Edge,
  type EdgeMarker,
  MarkerType,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type OnReconnect,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  autoLayoutWorkflow,
  triggerCanvasPosition,
} from "@/components/workflows/canvas/auto-layout";
import {
  isWorkflowStepConfigured,
  type WorkflowDefinition,
  type WorkflowCanvasPositions,
  type WorkflowStep,
  WORKFLOW_TRIGGER_KIND_OPTIONS,
  type WorkflowTriggerKind,
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
  crm: "crm",
  notification: "notification",
  task: "task",
  end: "end",
};

const TRIGGER_NODE_ID = "__trigger__";

export type ConnectInfo = {
  source: string;
  target: string;
  /** "true" / "false" for condition sources, undefined otherwise. */
  sourceHandle?: string | null;
};

interface XyCanvasProps {
  definition: WorkflowDefinition;
  positions?: WorkflowCanvasPositions;
  /** Backend trigger kind — drives both the node label and the canvas
   *  toolbar's "Lancer" gating. Authoritative source for trigger identity. */
  triggerKind?: WorkflowTriggerKind | null;
  selectedStepId?: string | null;
  readOnly?: boolean;
  onPositionsChange?: (positions: WorkflowCanvasPositions) => void;
  onSelectStep?: (stepId: string | null) => void;
  /** Called when the user drags an arrow from one node to another. */
  onConnect?: (info: ConnectInfo) => void;
  /** Called when the user clicks an edge to delete it. */
  onDisconnect?: (info: ConnectInfo) => void;
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
  if (step.type === "linkedin_invite") {
    const cfg = step.config as { messageTemplate?: string };
    const t = cfg.messageTemplate?.trim();
    return t ? (t.length > 56 ? `${t.slice(0, 56)}…` : t) : "Sans note";
  }
  if (step.type === "condition") return "Si le prospect a répondu";
  if (step.type === "crm") {
    const cfg = step.config as { field?: string; value?: string };
    if (cfg.field && cfg.value) return `${cfg.field} → ${cfg.value}`;
    return undefined;
  }
  if (step.type === "notification") {
    const cfg = step.config as { message?: string; priority?: string };
    const t = cfg.message?.trim();
    if (!t) return undefined;
    return t.length > 56 ? `${t.slice(0, 56)}…` : t;
  }
  if (step.type === "task") {
    const cfg = step.config as { title?: string; dueInHours?: number };
    return cfg.title?.trim() || undefined;
  }
  if (step.type === "end") return "Termine le parcours";
  return undefined;
}

function buildLabel(step: WorkflowStep): string {
  if (step.type === "wait") return "Attendre";
  if (step.type === "whatsapp_message") return "Message WhatsApp";
  if (step.type === "linkedin_message") return "Message LinkedIn";
  if (step.type === "linkedin_invite") return "Invitation LinkedIn";
  if (step.type === "condition") return "Le prospect a répondu ?";
  if (step.type === "crm") return "Mettre à jour le CRM";
  if (step.type === "notification") return "Notifier l'équipe";
  if (step.type === "task") return "Créer une tâche";
  if (step.type === "end") return "Fin du parcours";
  return "Étape";
}

function buildNodes(
  def: WorkflowDefinition,
  positions: WorkflowCanvasPositions,
  selectedStepId: string | null | undefined,
  triggerKind: WorkflowTriggerKind | null | undefined
): Node[] {
  const nodes: Node[] = [];

  // Synthetic trigger node at the top — backend doesn't model triggers as
  // first-class steps, so we render a display-only node above the first real
  // one. Label comes straight from the trigger_kind option so picking
  // "Réunion réservée" in the side panel updates the node immediately.
  const triggerMeta = triggerKind
    ? WORKFLOW_TRIGGER_KIND_OPTIONS.find((t) => t.id === triggerKind)
    : undefined;
  const triggerLabel = triggerMeta?.label ?? "Déclencheur";
  const triggerPos = positions[TRIGGER_NODE_ID] ?? triggerCanvasPosition();
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
      sub: triggerMeta?.nodeSub ?? (triggerKind ? undefined : "À configurer"),
      needsConfig: !triggerKind,
    },
  });

  for (const step of def.steps) {
    const nodeType = STEP_TO_NODE_TYPE[step.type] ?? "end";
    const pos = positions[step.id] ?? { x: 0, y: 0 };
    const branchConnected =
      step.type === "condition"
        ? {
            true: Boolean(
              (step as { on_true_id?: string }).on_true_id,
            ),
            false: Boolean(
              (step as { on_false_id?: string }).on_false_id,
            ),
          }
        : undefined;
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
        branchConnected,
      },
    });
  }

  return nodes;
}

/* ── Edge styling ───────────────────────────────────────────────────────────
   The base color matches the dot grid (`--workflow-dot-color`) but bumped to
   slate-500 so connectors read clearly against the bright pane. Hover and
   selected states are CSS-driven (see `.ws2-root .react-flow__edge` in
   globals.css) so xyflow's internal `selected` flag controls the visual
   without us having to rebuild edges. */
const EDGE_STROKE = "#64748B";
const EDGE_STROKE_WIDTH = 2;
const EDGE_INTERACTION_WIDTH = 20; // invisible hit area for easier clicking
const EDGE_PATH_BORDER_RADIUS = 14;

function WorkflowConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionLineStyle,
}: ConnectionLineComponentProps) {
  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: EDGE_PATH_BORDER_RADIUS,
  });
  return (
    <path
      d={path}
      fill="none"
      className="react-flow__connection-path"
      style={connectionLineStyle}
    />
  );
}

function buildEdges(def: WorkflowDefinition): Edge[] {
  const edges: Edge[] = [];
  const marker: EdgeMarker = {
    type: MarkerType.ArrowClosed,
    width: 12,
    height: 12,
    color: EDGE_STROKE,
  };
  const baseStyle = { stroke: EDGE_STROKE, strokeWidth: EDGE_STROKE_WIDTH };
  const baseEdge = {
    type: "smoothstep" as const,
    style: baseStyle,
    markerEnd: marker,
    interactionWidth: EDGE_INTERACTION_WIDTH,
    reconnectable: true as const,
    pathOptions: { borderRadius: EDGE_PATH_BORDER_RADIUS },
  };

  // Connect the synthetic trigger to the entry step.
  const entryId = def.entry_step_id ?? def.steps[0]?.id;
  if (entryId) {
    edges.push({
      ...baseEdge,
      id: `trigger-${entryId}`,
      source: TRIGGER_NODE_ID,
      target: entryId,
    });
  }

  for (const step of def.steps) {
    if (step.type === "condition") {
      if (step.on_true_id) {
        edges.push({
          ...baseEdge,
          id: `${step.id}-true`,
          source: step.id,
          sourceHandle: "true",
          target: step.on_true_id,
          label: "Oui",
          labelStyle: {
            fontSize: 11,
            fontWeight: 700,
            fill: "#065F46",
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 999,
          labelBgStyle: { fill: "#ECFDF5", stroke: "#10B981", strokeWidth: 1 },
          style: {
            stroke: "#10B981",
            strokeWidth: EDGE_STROKE_WIDTH,
            strokeDasharray: "6 4",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#10B981",
          },
        });
      }
      if (step.on_false_id) {
        edges.push({
          ...baseEdge,
          id: `${step.id}-false`,
          source: step.id,
          sourceHandle: "false",
          target: step.on_false_id,
          label: "Non",
          labelStyle: {
            fontSize: 11,
            fontWeight: 700,
            fill: "#BE123C",
          },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 999,
          labelBgStyle: { fill: "#FFF1F2", stroke: "#F43F5E", strokeWidth: 1 },
          style: {
            stroke: "#F43F5E",
            strokeWidth: EDGE_STROKE_WIDTH,
            strokeDasharray: "6 4",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#F43F5E",
          },
        });
      }
    } else if ("next_id" in step && step.next_id) {
      edges.push({
        ...baseEdge,
        id: `${step.id}-next`,
        source: step.id,
        target: step.next_id,
      });
    }
  }

  // Implicit sequential links for steps without an explicit outgoing edge.
  const sourcesWithOutgoing = new Set(edges.map((e) => e.source));
  const targetsWithIncoming = new Set(edges.map((e) => e.target));

  for (let i = 0; i < def.steps.length - 1; i++) {
    const from = def.steps[i]!;
    if (from.type === "condition") continue;
    if ("next_id" in from && from.next_id) continue;
    if (sourcesWithOutgoing.has(from.id)) continue;
    const to = def.steps[i + 1]!;
    if (targetsWithIncoming.has(to.id)) continue;
    const seqId = `${from.id}-seq-${to.id}`;
    if (edges.some((e) => e.id === seqId)) continue;
    edges.push({
      ...baseEdge,
      id: seqId,
      source: from.id,
      target: to.id,
    });
    sourcesWithOutgoing.add(from.id);
    targetsWithIncoming.add(to.id);
  }

  return edges;
}

/* ── Collision avoidance ─────────────────────────────────────────────────────
   xyflow doesn't ship native collision. Cheap approach: after a drag ends,
   walk the dragged node downward until it no longer overlaps any other node's
   AABB. Uses StepNode's known footprint (NODE_W / COND_W / NODE_H, see
   _components/step-node.tsx). The shifted result is fed back to xyflow via
   the next setNodes call, so the user sees the snap before the debounce fires.
*/
const NODE_FOOTPRINT_W = 252;
const COND_FOOTPRINT_W = 320;
const NODE_FOOTPRINT_H = 68;
const COLLISION_PAD = 16;

function nodeWidth(n: Node): number {
  const t = (n.data as { type?: string } | undefined)?.type;
  return t === "condition" ? COND_FOOTPRINT_W : NODE_FOOTPRINT_W;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function nodeToBox(n: Node): Box {
  return {
    x: n.position.x,
    y: n.position.y,
    w: nodeWidth(n),
    h: NODE_FOOTPRINT_H,
  };
}

function aabbOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w + COLLISION_PAD &&
    a.x + a.w + COLLISION_PAD > b.x &&
    a.y < b.y + b.h + COLLISION_PAD &&
    a.y + a.h + COLLISION_PAD > b.y
  );
}

/**
 * Find the position closest to `desired` where a node of size `(w, h)` sits
 * in free space relative to `obstacles`. Spiral search — first checks the
 * desired position, then expands in concentric rings sampling 16 angles each,
 * returning the closest free spot found (Euclidean distance from desired).
 *
 * Smooth in any direction (left, right, up, down, diagonal) — not constrained
 * to a single axis. The current spot is preferred when free; otherwise the
 * algorithm naturally picks a side based on what's closest.
 */
function findNearestFreePosition(
  desired: { x: number; y: number },
  size: { w: number; h: number },
  obstacles: Box[]
): { x: number; y: number } {
  const here: Box = { x: desired.x, y: desired.y, w: size.w, h: size.h };
  if (!obstacles.some((o) => aabbOverlap(here, o))) return desired;

  // Rings expand outward. STEP is small enough that sub-node-width
  // displacements are usable — important so the user perceives a "nudge"
  // rather than a jump.
  const STEP = 24;
  const MAX_RINGS = 40;
  const SAMPLES_PER_RING = 16;

  for (let ring = 1; ring <= MAX_RINGS; ring++) {
    const radius = ring * STEP;
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < SAMPLES_PER_RING; i++) {
      const angle = (i / SAMPLES_PER_RING) * Math.PI * 2;
      const cx = desired.x + Math.cos(angle) * radius;
      const cy = desired.y + Math.sin(angle) * radius;
      const cand: Box = { x: cx, y: cy, w: size.w, h: size.h };
      if (obstacles.some((o) => aabbOverlap(cand, o))) continue;
      const d = Math.hypot(cx - desired.x, cy - desired.y);
      if (d < bestDist) {
        bestDist = d;
        best = { x: cx, y: cy };
      }
    }
    if (best) return best;
  }
  return desired;
}

function resolveCollision(dragged: Node, others: Node[]): Node {
  const obstacles = others.map(nodeToBox);
  const next = findNearestFreePosition(
    { x: dragged.position.x, y: dragged.position.y },
    { w: nodeWidth(dragged), h: NODE_FOOTPRINT_H },
    obstacles
  );
  if (next.x === dragged.position.x && next.y === dragged.position.y) {
    return dragged;
  }
  return { ...dragged, position: next };
}

/**
 * Settle pass: walk through `nodes`, treat anything in `pinnedIds` as fixed,
 * and reposition the rest one at a time so they don't overlap. Used on
 * initial mount / when a new step is added so freshly-laid-out nodes don't
 * land on top of existing ones.
 */
function settleNodes(nodes: Node[], pinnedIds: Set<string>): Node[] {
  if (nodes.length < 2) return nodes;
  const result = nodes.slice();
  for (let i = 0; i < result.length; i++) {
    const n = result[i]!;
    if (pinnedIds.has(n.id)) continue;
    const obstacles = result
      .filter((_, j) => j !== i)
      .map(nodeToBox);
    const next = findNearestFreePosition(
      { x: n.position.x, y: n.position.y },
      { w: nodeWidth(n), h: NODE_FOOTPRINT_H },
      obstacles
    );
    if (next.x !== n.position.x || next.y !== n.position.y) {
      result[i] = { ...n, position: next };
    }
  }
  return result;
}

function CanvasInner({
  definition,
  positions,
  triggerKind,
  selectedStepId,
  readOnly,
  onPositionsChange,
  onSelectStep,
  onConnect,
  onDisconnect,
  className,
}: XyCanvasProps) {
  const resolvedPositions = useMemo(
    () => autoLayoutWorkflow(definition, positions),
    [definition, positions]
  );

  // Treat user-supplied positions as pinned (don't move them). Anything that
  // had to be auto-laid is eligible for the settle pass so freshly-added
  // orphans never land on top of an existing node.
  const pinnedIds = useMemo(() => {
    const ids = new Set<string>();
    if (positions) {
      for (const id of Object.keys(positions)) ids.add(id);
    }
    return ids;
  }, [positions]);

  const initialNodes = useMemo(() => {
    const built = buildNodes(definition, resolvedPositions, selectedStepId, triggerKind);
    return settleNodes(built, pinnedIds);
  }, [definition, resolvedPositions, selectedStepId, triggerKind, pinnedIds]);
  const edges = useMemo(() => buildEdges(definition), [definition]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const debounceRef = useRef<number | null>(null);
  const latestNodesRef = useRef<Node[]>(nodes);
  const fitDoneRef = useRef(false);
  useEffect(() => {
    latestNodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    fitDoneRef.current = false;
  }, [definition]);

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
      const dragEnded = changes.some(
        (c) => c.type === "position" && c.dragging === false
      );
      setNodes((prev) => {
        const applied = applyNodeChanges(changes, prev);
        if (!dragEnded) return applied;
        // Resolve collisions for any node whose drag just ended.
        const draggedIds = new Set(
          changes
            .filter((c) => c.type === "position" && c.dragging === false)
            .map((c) => (c as { id: string }).id)
        );
        return applied.map((n) => {
          if (!draggedIds.has(n.id)) return n;
          const others = applied.filter((other) => other.id !== n.id);
          return resolveCollision(n, others);
        });
      });
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

  // Drag-to-connect: arrow from a node's source handle to another node's
  // target. xyflow gives us source/target/sourceHandle.
  const handleConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return;
      onConnect?.({
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle ?? null,
      });
    },
    [onConnect]
  );

  // Clicking an edge selects it (xyflow handles the visual). We also clear
  // the parent's selectedStepId so the canvas-wide keyboard-delete listener
  // doesn't fire on a stale node selection.
  const handleEdgeClick = useCallback(() => {
    onSelectStep?.(null);
  }, [onSelectStep]);

  // Edges are removed via xyflow's built-in delete flow (Delete/Backspace).
  // We listen for `onEdgesDelete` and forward each removed edge to the parent
  // so the workflow definition's pointers get cleared.
  const handleEdgesDelete = useCallback(
    (removed: Edge[]) => {
      if (readOnly || !onDisconnect) return;
      for (const edge of removed) {
        onDisconnect({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle ?? null,
        });
      }
    },
    [readOnly, onDisconnect]
  );

  // Drag an existing edge's endpoint to a new node: swap the old pointer for
  // a new one. Implemented as `disconnect(old) + connect(new)` so the parent
  // doesn't need new wiring.
  const handleReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (readOnly) return;
      if (!newConnection.source || !newConnection.target) return;
      if (newConnection.source === newConnection.target) return;
      onDisconnect?.({
        source: oldEdge.source,
        target: oldEdge.target,
        sourceHandle: oldEdge.sourceHandle ?? null,
      });
      onConnect?.({
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? null,
      });
    },
    [readOnly, onDisconnect, onConnect]
  );

  /** Dragging an edge endpoint into empty space removes the link. */
  const handleReconnectEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      edge: Edge,
      _handleType: "source" | "target",
      connectionState: { isValid: boolean | null },
    ) => {
      if (readOnly) return;
      if (connectionState.isValid === true) return;
      onDisconnect?.({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? null,
      });
    },
    [readOnly, onDisconnect],
  );

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    if (fitDoneRef.current) return;
    fitDoneRef.current = true;
    void instance.fitView({ padding: 0.25, maxZoom: 1.1, duration: 0 });
  }, []);

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
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onReconnectEnd={handleReconnectEnd}
        reconnectRadius={24}
        onInit={handleInit}
        onEdgeClick={handleEdgeClick}
        onEdgesDelete={handleEdgesDelete}
        deleteKeyCode={readOnly ? null : ["Delete", "Backspace"]}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesFocusable={!readOnly}
        elementsSelectable
        edgesReconnectable={!readOnly}
        connectionRadius={56}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: EDGE_STROKE,
          strokeWidth: EDGE_STROKE_WIDTH,
        }}
        connectionLineComponent={WorkflowConnectionLine}
        snapToGrid={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
        maxZoom={1.5}
        style={{ background: "var(--workflow-canvas-fill)" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.6}
          color="var(--workflow-dot-color)"
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
