// Bridges the backend workflow shape ↔ the Claude Design's view models.

import {
  WORKFLOW_TRIGGERS,
  type WorkflowTemplateTrigger,
} from "@/lib/workflows/templates";
import type { WorkflowTriggerKind } from "@/lib/workflows/trigger-kind";
import { parseWorkflowUi } from "@/lib/workflows/workflow-ui";
import { ICO } from "./icons";
import type { WfNodeType } from "./node-types";

export type DesignStatus = "active" | "draft" | "paused" | "error";
export type DesignTag = "WhatsApp" | "LinkedIn" | "CRM" | "IA";

/** Subset of a backend step we need to render the card-level preview. */
interface PreviewBackendStep {
  id: string;
  type: string;
  next_id?: string;
  on_true_id?: string;
  on_false_id?: string;
}

export interface BackendWorkflowRow {
  id: string;
  name: string;
  description?: string | null;
  is_template?: boolean;
  is_active: boolean;
  is_published?: boolean;
  draft_definition: {
    steps?: PreviewBackendStep[];
    entry_step_id?: string;
  } | null;
  published_definition: {
    steps?: PreviewBackendStep[];
    entry_step_id?: string;
  } | null;
  metadata?: unknown;
  /** DB column `workflows.trigger_kind` */
  trigger_kind?: WorkflowTriggerKind;
  /** DB column `workflows.trigger_config` (jsonb) */
  trigger_config?: unknown;
  run_mode?: "terminating" | "evergreen";
  active_runs_count?: number;
  total_runs_count?: number;
  runs_completed_count?: number;
  execution_progress_pct?: number | null;
  updated_at: string;
}

/* ── Diagram preview model ─────────────────────────────────────────────────
   A compact graph for rendering inside the workflow card. The full xyflow
   layout is overkill for a list preview, so we collapse the workflow into a
   linear chain that may split once into a true/false branch.

   Anything beyond the first split (or beyond the depth budget) becomes an
   `ellipsis` node so cards stay scannable. */
export type PreviewNode =
  | { kind: "step"; type: WfNodeType }
  | {
      kind: "condition";
      trueBranch: PreviewBranchNode[];
      falseBranch: PreviewBranchNode[];
    }
  | { kind: "ellipsis" };

/** Branches don't recurse into further conditions — they stay linear. */
export type PreviewBranchNode =
  | { kind: "step"; type: WfNodeType }
  | { kind: "ellipsis" };

export interface TriggerVisual {
  label: string;
  iconPath: string;
  bg: string;
  color: string;
}

export interface DesignWorkflowCard {
  id: string;
  name: string;
  status: DesignStatus;
  description: string;
  tags: DesignTag[];
  lastModified: string;
  stats: {
    enrolled: number | string;
    replyRate: string;
    meetings: number | string;
    conversion: string;
  };
  /** Linear flattened list — kept for any legacy consumer. */
  nodes: WfNodeType[];
  /** Step count (excluding the synthetic trigger). */
  stepCount: number;
  /** Trigger visual (label, icon, colors) or null when unknown. */
  trigger: TriggerVisual | null;
  /** Backend trigger kind — drives the "Lancer" gating in the list/canvas. */
  triggerKind: WorkflowTriggerKind | null;
  /** Rich preview model with branching for the in-card diagram. */
  diagram: PreviewNode[];
}

/** True when the workflow's trigger metadata + kind are filled in.
 *  Used to gate the "active" status — a workflow with no configured trigger
 *  can't meaningfully be running, so we present it as paused. */
function hasConfiguredTrigger(row: BackendWorkflowRow): boolean {
  const ui = parseWorkflowUi(row.metadata);
  if (typeof ui.trigger === "string" && ui.trigger.length > 0) return true;
  return typeof row.trigger_kind === "string" && row.trigger_kind.length > 0;
}

/** Best-effort derivation of the design's status from backend flags.
 *
 *  Rule: "active" requires both `is_active=true` AND a fully configured graph.
 *  The publish gate already guarantees step config is valid (no published
 *  definition exists otherwise), but trigger metadata isn't part of that
 *  validation — if it's missing we downgrade to "paused" so the badge reflects
 *  what's actually runnable. */
export function deriveStatus(row: BackendWorkflowRow): DesignStatus {
  // The single-workflow GET endpoint returns the raw row without an
  // `is_published` flag — derive it from `published_definition` so the canvas
  // status pill stays in sync with what the row actually allows.
  const isPublished =
    row.is_published === true || row.published_definition != null;
  if (!isPublished) return "draft";
  if (row.is_active && hasConfiguredTrigger(row)) return "active";
  return "paused";
}

const STEP_TO_NODE: Record<string, WfNodeType> = {
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

/** Map backend step types into the design's node-type vocabulary, prefixed with the trigger. */
export function deriveNodes(row: BackendWorkflowRow): WfNodeType[] {
  const def = row.published_definition ?? row.draft_definition;
  const steps = def?.steps ?? [];
  const out: WfNodeType[] = ["trigger"];
  for (const s of steps) {
    const mapped = STEP_TO_NODE[s.type];
    if (mapped) out.push(mapped);
  }
  return out.length > 1 ? out : ["trigger"];
}

const TAG_FROM_STEP_TYPE: Record<string, DesignTag> = {
  whatsapp_message: "WhatsApp",
  linkedin_invite: "LinkedIn",
  linkedin_message: "LinkedIn",
};

export function deriveTags(row: BackendWorkflowRow): DesignTag[] {
  const def = row.published_definition ?? row.draft_definition;
  const set = new Set<DesignTag>();
  for (const s of def?.steps ?? []) {
    const t = TAG_FROM_STEP_TYPE[s.type];
    if (t) set.add(t);
  }
  return Array.from(set);
}

/* ── Trigger visuals ───────────────────────────────────────────────────────
   Hardcoded hex (same convention as node-types.tsx). Falls back to a neutral
   "manual" look when the trigger isn't known. */
const TRIGGER_VISUALS: Record<
  WorkflowTemplateTrigger,
  { iconPath: string; bg: string; color: string }
> = {
  meeting_booked: { iconPath: ICO.calendar, bg: "#E8F0FD", color: "#0052D9" },
  meeting_no_show: { iconPath: ICO.bell, bg: "#FFF1F2", color: "#BE123C" },
  crm_status_changed: { iconPath: ICO.database, bg: "#EFF6FF", color: "#1E3A8A" },
  manual: { iconPath: ICO.cursor, bg: "#F1F5F9", color: "#475569" },
};

export function deriveTrigger(row: BackendWorkflowRow): TriggerVisual | null {
  const ui = parseWorkflowUi(row.metadata);
  const triggerId =
    typeof ui.trigger === "string"
      ? (ui.trigger as WorkflowTemplateTrigger)
      : (row.trigger_kind as WorkflowTemplateTrigger | undefined) ?? null;
  if (!triggerId) return null;
  const meta = WORKFLOW_TRIGGERS.find((t) => t.id === triggerId);
  const visual = TRIGGER_VISUALS[triggerId] ?? TRIGGER_VISUALS.manual;
  return {
    label: meta?.label ?? "Déclencheur",
    iconPath: visual.iconPath,
    bg: visual.bg,
    color: visual.color,
  };
}

/* ── Diagram preview builder ───────────────────────────────────────────────
   Walks the workflow graph starting at `entry_step_id` (or the first step).
   Linear nodes form a single chain; the first condition encountered branches
   into a true/false split, which itself is walked linearly with a small depth
   budget. Anything past the budget is collapsed to an ellipsis so the preview
   stays compact regardless of workflow complexity. */
const MAIN_CHAIN_BUDGET = 5;
const BRANCH_BUDGET = 3;

function mapType(t: string): WfNodeType | null {
  return STEP_TO_NODE[t] ?? null;
}

/** Walk forward from `startId` following `next_id` — used inside branches.
 *  Stops at conditions (treated as opaque ends) and at the depth budget. */
function walkLinearBranch(
  startId: string | undefined,
  byId: Map<string, PreviewBackendStep>,
  budget: number
): PreviewBranchNode[] {
  const out: PreviewBranchNode[] = [];
  const visited = new Set<string>();
  let cursor = startId;
  while (cursor && !visited.has(cursor) && out.length < budget) {
    visited.add(cursor);
    const step = byId.get(cursor);
    if (!step) break;
    if (step.type === "condition") {
      // Inside a branch, conditions are summarised — we don't recurse further.
      out.push({ kind: "step", type: "condition" });
      break;
    }
    const mapped = mapType(step.type);
    if (!mapped) break;
    out.push({ kind: "step", type: mapped });
    cursor = step.next_id;
  }
  if (cursor && byId.has(cursor)) {
    // Ran out of budget but there's more downstream.
    if (out.length >= budget) out.push({ kind: "ellipsis" });
  }
  return out;
}

export function buildDiagramPreview(row: BackendWorkflowRow): PreviewNode[] {
  const def = row.published_definition ?? row.draft_definition;
  const steps = def?.steps ?? [];
  if (steps.length === 0) return [];
  const byId = new Map(steps.map((s) => [s.id, s]));
  const startId = def?.entry_step_id ?? steps[0]?.id;
  const out: PreviewNode[] = [];
  const visited = new Set<string>();
  let cursor: string | undefined = startId;
  while (cursor && !visited.has(cursor) && out.length < MAIN_CHAIN_BUDGET) {
    visited.add(cursor);
    const step = byId.get(cursor);
    if (!step) break;
    if (step.type === "condition") {
      out.push({
        kind: "condition",
        trueBranch: walkLinearBranch(step.on_true_id, byId, BRANCH_BUDGET),
        falseBranch: walkLinearBranch(step.on_false_id, byId, BRANCH_BUDGET),
      });
      // After a branch we stop — anything past it is hidden by the branch
      // semantics anyway.
      return out;
    }
    const mapped = mapType(step.type);
    if (!mapped) break;
    out.push({ kind: "step", type: mapped });
    cursor = step.next_id;
  }
  if (cursor && byId.has(cursor)) {
    out.push({ kind: "ellipsis" });
  }
  return out;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return "à l'instant";
  if (diff < hour) {
    const m = Math.round(diff / min);
    return `il y a ${m} minute${m > 1 ? "s" : ""}`;
  }
  if (diff < day) {
    const h = Math.round(diff / hour);
    return `il y a ${h} heure${h > 1 ? "s" : ""}`;
  }
  if (diff < 30 * day) {
    const j = Math.round(diff / day);
    return `il y a ${j} jour${j > 1 ? "s" : ""}`;
  }
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function backendRowToCard(row: BackendWorkflowRow): DesignWorkflowCard {
  const def = row.published_definition ?? row.draft_definition;
  return {
    id: row.id,
    name: row.name,
    status: deriveStatus(row),
    description: row.description ?? "",
    tags: deriveTags(row),
    lastModified: relativeTime(row.updated_at),
    stats: {
      enrolled: row.total_runs_count ?? 0,
      replyRate: "—",
      meetings: "—",
      conversion:
        row.execution_progress_pct != null
          ? `${row.execution_progress_pct}%`
          : "—",
    },
    nodes: deriveNodes(row),
    stepCount: def?.steps?.length ?? 0,
    trigger: deriveTrigger(row),
    triggerKind: row.trigger_kind ?? null,
    diagram: buildDiagramPreview(row),
  };
}
