import type { WorkflowDefinition, WorkflowStep } from "@/lib/workflows";
import type { WorkflowCanvasPositions } from "@/lib/workflows";

const NODE_WIDTH = 252;
const COND_NODE_WIDTH = 320;
const VERTICAL_GAP = 140;
const HORIZONTAL_GAP = 60;

/** Synthetic trigger node — top of the aligned column (y = 0). */
export const LAYOUT_TRIGGER_Y = 0;
/** First real step sits one row below the trigger. */
export const LAYOUT_TRUNK_START_Y = VERTICAL_GAP;

type StepMap = Map<string, WorkflowStep>;
type ConditionStep = WorkflowStep & {
  type: "condition";
  on_true_id?: string;
  on_false_id?: string;
  next_id?: string;
};

function indexSteps(def: WorkflowDefinition): StepMap {
  const map: StepMap = new Map();
  for (const s of def.steps) map.set(s.id, s);
  return map;
}

function pickEntryId(def: WorkflowDefinition): string | undefined {
  if (def.entry_step_id) return def.entry_step_id;
  return def.steps[0]?.id;
}

function hasGraphPointers(def: WorkflowDefinition): boolean {
  if (def.entry_step_id) return true;
  return def.steps.some(
    (s) =>
      ("next_id" in s && s.next_id !== undefined) ||
      (s.type === "condition" &&
        ((s as { on_true_id?: string }).on_true_id !== undefined ||
          (s as { on_false_id?: string }).on_false_id !== undefined))
  );
}

function nodeWidth(step: WorkflowStep): number {
  return step.type === "condition" ? COND_NODE_WIDTH : NODE_WIDTH;
}

/** xyflow uses top-left anchors; layout math uses parent center X. */
function toTopLeft(centerX: number, y: number, step: WorkflowStep): { x: number; y: number } {
  return { x: centerX - nodeWidth(step) / 2, y };
}

/** Horizontal distance from parent center to a branch child's center. */
function branchCenterOffset(): number {
  return COND_NODE_WIDTH / 2 + HORIZONTAL_GAP + NODE_WIDTH / 2;
}

/**
 * Lay out a branch subtree under `centerX`, only following `next_id` chains.
 * Stops when a node was already placed (e.g. shared merge or cross-wiring).
 * Returns the bottom Y of the placed subtree.
 */
function placeBranchSubtree(
  map: StepMap,
  out: WorkflowCanvasPositions,
  placed: Set<string>,
  startId: string,
  centerX: number,
  y: number
): number {
  let currentId: string | undefined = startId;
  let cy = y;
  let bottomY = y;

  while (currentId) {
    if (placed.has(currentId)) break;
    const step = map.get(currentId);
    if (!step) break;

    placed.add(currentId);
    if (!out[currentId]) {
      out[currentId] = toTopLeft(centerX, cy, step);
    }
    bottomY = cy;

    if (step.type === "condition") {
      const cond = step as ConditionStep;
      const branchY = cy + VERTICAL_GAP;
      const branchBottom = placeConditionBranches(map, out, placed, cond, centerX, branchY);
      bottomY = branchBottom;
      if (cond.next_id) {
        return placeBranchSubtree(
          map,
          out,
          placed,
          cond.next_id,
          centerX,
          branchBottom + VERTICAL_GAP
        );
      }
      return bottomY;
    }

    currentId = "next_id" in step ? step.next_id : undefined;
    cy += VERTICAL_GAP;
  }

  return bottomY;
}

/**
 * Place the direct children of a condition side-by-side (same Y), each aligned
 * to its parent branch center — not stacked via accidental `next_id` chains.
 */
function placeConditionBranches(
  map: StepMap,
  out: WorkflowCanvasPositions,
  placed: Set<string>,
  cond: ConditionStep,
  parentCenterX: number,
  branchY: number
): number {
  const offset = branchCenterOffset();
  let maxBottom = branchY;

  if (cond.on_true_id) {
    const bottom = placeBranchSubtree(
      map,
      out,
      placed,
      cond.on_true_id,
      parentCenterX - offset,
      branchY
    );
    maxBottom = Math.max(maxBottom, bottom);
  }
  if (cond.on_false_id) {
    const bottom = placeBranchSubtree(
      map,
      out,
      placed,
      cond.on_false_id,
      parentCenterX + offset,
      branchY
    );
    maxBottom = Math.max(maxBottom, bottom);
  }

  return maxBottom;
}

/**
 * Main trunk from entry: vertical chain centered on `centerX`, with conditions
 * fanning branches horizontally before continuing to `next_id` (merge).
 */
function placeTrunk(
  map: StepMap,
  out: WorkflowCanvasPositions,
  placed: Set<string>,
  startId: string,
  centerX: number,
  y: number
): void {
  let currentId: string | undefined = startId;
  let cy = y;

  while (currentId) {
    if (placed.has(currentId)) break;
    const step = map.get(currentId);
    if (!step) break;

    placed.add(currentId);
    if (!out[currentId]) {
      out[currentId] = toTopLeft(centerX, cy, step);
    }

    if (step.type === "condition") {
      const cond = step as ConditionStep;
      const branchY = cy + VERTICAL_GAP;
      const branchBottom = placeConditionBranches(map, out, placed, cond, centerX, branchY);
      currentId = cond.next_id;
      cy = branchBottom + VERTICAL_GAP;
      continue;
    }

    currentId = "next_id" in step ? step.next_id : undefined;
    cy += VERTICAL_GAP;
  }
}

/**
 * Compute fallback positions for each step in the workflow.
 * - Vertical trunk centered on the entry column.
 * - Condition steps place Oui / Non children side-by-side under the parent.
 * - Branch subtrees only follow `next_id` within that branch (parent-relative).
 * - Already-positioned steps in `pinned` are preserved verbatim.
 */
export function autoLayoutWorkflow(
  def: WorkflowDefinition,
  pinned?: WorkflowCanvasPositions
): WorkflowCanvasPositions {
  const map = indexSteps(def);
  const entry = pickEntryId(def);
  const out: WorkflowCanvasPositions = { ...(pinned ?? {}) };

  if (!entry) return out;

  if (!hasGraphPointers(def)) {
    let y = LAYOUT_TRUNK_START_Y;
    const centerX = 0;
    for (const s of def.steps) {
      if (!out[s.id]) out[s.id] = toTopLeft(centerX, y, s);
      y += VERTICAL_GAP;
    }
    return out;
  }

  const placed = new Set<string>();
  placeTrunk(map, out, placed, entry, 0, LAYOUT_TRUNK_START_Y);

  let dangleY = LAYOUT_TRUNK_START_Y;
  for (const s of def.steps) {
    if (!placed.has(s.id) && !out[s.id]) {
      out[s.id] = toTopLeft(0, dangleY, s);
      dangleY += VERTICAL_GAP;
      placed.add(s.id);
    }
  }

  return out;
}

/** Recompute all canvas positions from the graph (ignores saved pins). */
export function computeStraightenedLayout(
  def: WorkflowDefinition
): WorkflowCanvasPositions {
  const positions = autoLayoutWorkflow(def, {});
  positions.__trigger__ = triggerCanvasPosition();
  return positions;
}

/** Top-left position for the synthetic trigger node (aligned with trunk center x = 0). */
export function triggerCanvasPosition(): { x: number; y: number } {
  return { x: -NODE_WIDTH / 2, y: LAYOUT_TRIGGER_Y };
}

export const CANVAS_LAYOUT_CONSTANTS = {
  NODE_WIDTH,
  COND_NODE_WIDTH,
  VERTICAL_GAP,
  HORIZONTAL_GAP,
  LAYOUT_TRIGGER_Y,
  LAYOUT_TRUNK_START_Y,
};
