import type { WorkflowDefinition, WorkflowStep } from "@/lib/workflows";
import type { WorkflowCanvasPositions } from "@/lib/workflows";

const NODE_WIDTH = 280;
const VERTICAL_GAP = 140;
const HORIZONTAL_GAP = 60;

type StepMap = Map<string, WorkflowStep>;

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

/**
 * Compute fallback positions for each step in the workflow.
 * - Vertical layout (top → down).
 * - Condition steps split children left/right with the wider HORIZONTAL_GAP, then converge.
 * - Already-positioned steps in `pinned` are preserved verbatim.
 *
 * The algorithm is best-effort, not an optimal graph layout — good enough for
 * trees and shallow DAGs, which is what the workflow editor produces.
 */
export function autoLayoutWorkflow(
  def: WorkflowDefinition,
  pinned?: WorkflowCanvasPositions
): WorkflowCanvasPositions {
  const map = indexSteps(def);
  const entry = pickEntryId(def);
  const out: WorkflowCanvasPositions = { ...(pinned ?? {}) };

  if (!entry) return out;

  // Linear case: no graph pointers anywhere → just stack steps vertically.
  if (!hasGraphPointers(def)) {
    let y = 0;
    for (const s of def.steps) {
      if (!out[s.id]) out[s.id] = { x: 0, y };
      y += VERTICAL_GAP;
    }
    return out;
  }

  const visited = new Set<string>();

  function place(id: string, x: number, y: number) {
    if (visited.has(id)) return;
    visited.add(id);
    if (!out[id]) {
      out[id] = { x, y };
    }
    const step = map.get(id);
    if (!step) return;

    if (step.type === "condition") {
      const trueId = step.on_true_id;
      const falseId = step.on_false_id;
      const childY = y + VERTICAL_GAP;
      if (trueId && falseId) {
        place(trueId, x - (NODE_WIDTH / 2 + HORIZONTAL_GAP), childY);
        place(falseId, x + (NODE_WIDTH / 2 + HORIZONTAL_GAP), childY);
      } else if (trueId) {
        place(trueId, x, childY);
      } else if (falseId) {
        place(falseId, x, childY);
      }
      // The "after-condition" merge step (if any) goes below both branches
      if ("next_id" in step && step.next_id) {
        place(step.next_id, x, y + VERTICAL_GAP * 3);
      }
    } else {
      if ("next_id" in step && step.next_id) {
        place(step.next_id, x, y + VERTICAL_GAP);
      }
    }
  }

  place(entry, 0, 0);

  // Catch any orphaned steps (no incoming reference).
  let dangleY = VERTICAL_GAP;
  for (const s of def.steps) {
    if (!visited.has(s.id) && !out[s.id]) {
      out[s.id] = { x: 0, y: dangleY };
      dangleY += VERTICAL_GAP;
      visited.add(s.id);
    }
  }

  return out;
}

export const CANVAS_LAYOUT_CONSTANTS = {
  NODE_WIDTH,
  VERTICAL_GAP,
  HORIZONTAL_GAP,
};
