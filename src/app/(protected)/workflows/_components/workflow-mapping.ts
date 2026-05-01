// Bridges the backend workflow shape ↔ the Claude Design's view models.

import type { WfNodeType } from "./node-types";

export type DesignStatus = "active" | "draft" | "paused" | "error";
export type DesignTag = "WhatsApp" | "LinkedIn" | "CRM" | "IA";

export interface BackendWorkflowRow {
  id: string;
  name: string;
  description?: string | null;
  is_template?: boolean;
  is_active: boolean;
  is_published?: boolean;
  draft_definition: { steps?: { type: string }[] } | null;
  published_definition: { steps?: { type: string }[] } | null;
  metadata?: unknown;
  active_runs_count?: number;
  total_runs_count?: number;
  runs_completed_count?: number;
  execution_progress_pct?: number | null;
  updated_at: string;
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
  nodes: WfNodeType[];
}

/** Best-effort derivation of the design's status from backend flags. */
export function deriveStatus(row: BackendWorkflowRow): DesignStatus {
  // The single-workflow GET endpoint returns the raw row without an
  // `is_published` flag — derive it from `published_definition` so the canvas
  // status pill stays in sync with what the row actually allows.
  const isPublished =
    row.is_published === true || row.published_definition != null;
  if (!isPublished) return "draft";
  if (row.is_active) return "active";
  return "paused";
}

const STEP_TO_NODE: Record<string, WfNodeType> = {
  whatsapp_message: "whatsapp",
  wait: "wait",
  condition: "condition",
  linkedin_invite: "linkedin",
  linkedin_message: "linkedin",
};

/** Map backend step types into the design's node-type vocabulary, prefixed with the trigger. */
export function deriveNodes(row: BackendWorkflowRow): WfNodeType[] {
  const def = row.published_definition ?? row.draft_definition;
  const steps = def?.steps ?? [];
  const out: WfNodeType[] = ["trigger"];
  for (const s of steps) {
    const mapped = STEP_TO_NODE[s.type as string];
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
    const t = TAG_FROM_STEP_TYPE[s.type as string];
    if (t) set.add(t);
  }
  return Array.from(set);
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
  };
}
