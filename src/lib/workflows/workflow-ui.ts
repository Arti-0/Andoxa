import type { WorkflowDefinition, WorkflowStep } from "./schema";

export const DEFAULT_WORKFLOW_ICON_KEY = "Workflow";
export const DEFAULT_WORKFLOW_COLOR_KEY = "violet";

/** Lucide icon component names (string keys for metadata). */
export const WORKFLOW_ICON_KEYS = [
  "Workflow",
  "Zap",
  "Target",
  "Mail",
  "Phone",
  "TrendingUp",
  "Users",
  "Rocket",
  "Clock",
  "Star",
] as const;

export type WorkflowIconKey = (typeof WORKFLOW_ICON_KEYS)[number];

export const WORKFLOW_COLOR_KEYS = [
  "slate",
  "blue",
  "indigo",
  "violet",
  "emerald",
  "amber",
  "rose",
  "sky",
] as const;

export type WorkflowColorKey = (typeof WORKFLOW_COLOR_KEYS)[number];

export function isWorkflowIconKey(s: string): s is WorkflowIconKey {
  return (WORKFLOW_ICON_KEYS as readonly string[]).includes(s);
}

export function isWorkflowColorKey(s: string): s is WorkflowColorKey {
  return (WORKFLOW_COLOR_KEYS as readonly string[]).includes(s);
}

export type WorkflowUiState = {
  icon: WorkflowIconKey;
  color: WorkflowColorKey;
};

export function parseWorkflowUi(metadata: unknown): WorkflowUiState {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      icon: DEFAULT_WORKFLOW_ICON_KEY as WorkflowIconKey,
      color: DEFAULT_WORKFLOW_COLOR_KEY as WorkflowColorKey,
    };
  }
  const m = metadata as Record<string, unknown>;
  const ui = m.ui && typeof m.ui === "object" && !Array.isArray(m.ui) ? (m.ui as Record<string, unknown>) : {};
  const iconRaw = typeof ui.icon === "string" ? ui.icon : DEFAULT_WORKFLOW_ICON_KEY;
  const colorRaw = typeof ui.color === "string" ? ui.color : DEFAULT_WORKFLOW_COLOR_KEY;
  return {
    icon: isWorkflowIconKey(iconRaw) ? iconRaw : (DEFAULT_WORKFLOW_ICON_KEY as WorkflowIconKey),
    color: isWorkflowColorKey(colorRaw) ? colorRaw : (DEFAULT_WORKFLOW_COLOR_KEY as WorkflowColorKey),
  };
}

export function mergeWorkflowMetadata(
  prev: Record<string, unknown> | null | undefined,
  patch: {
    ui?: Partial<WorkflowUiState>;
    pending_enrollment_bdd_ids?: string[];
  }
): Record<string, unknown> {
  const base =
    prev && typeof prev === "object" && !Array.isArray(prev) ? { ...prev } : {};
  if (patch.ui) {
    const curUi =
      base.ui && typeof base.ui === "object" && !Array.isArray(base.ui)
        ? { ...(base.ui as Record<string, unknown>) }
        : {};
    if (patch.ui.icon !== undefined) curUi.icon = patch.ui.icon;
    if (patch.ui.color !== undefined) curUi.color = patch.ui.color;
    base.ui = curUi;
  }
  if (patch.pending_enrollment_bdd_ids !== undefined) {
    base.pending_enrollment_bdd_ids = patch.pending_enrollment_bdd_ids;
  }
  return base;
}

/** Heuristic: step has minimum viable configuration for progress display. */
export function isWorkflowStepConfigured(step: WorkflowStep): boolean {
  switch (step.type) {
    case "wait": {
      const h = Number((step.config as { durationHours?: number }).durationHours);
      return Number.isFinite(h) && h > 0;
    }
    case "linkedin_invite":
      return true;
    case "linkedin_message": {
      const t = String((step.config as { messageTemplate?: string }).messageTemplate ?? "").trim();
      return t.length > 0;
    }
    case "whatsapp_message": {
      const t = String((step.config as { messageTemplate?: string }).messageTemplate ?? "").trim();
      return t.length > 0;
    }
    default:
      return false;
  }
}

/**
 * 0–100 : nom + étapes configurées ; 100 si parcours publié (prêt à lancer).
 */
export function computeWorkflowCompletionPercent(
  name: string,
  draft: WorkflowDefinition | null,
  hasPublished: boolean
): number {
  if (hasPublished) return 100;
  const trimmed = name.trim();
  let score = 0;
  if (trimmed.length > 0) score += 20;
  if (!draft || !draft.steps.length) {
    return Math.min(99, score);
  }
  const configured = draft.steps.filter(isWorkflowStepConfigured).length;
  const ratio = configured / draft.steps.length;
  score += Math.round(ratio * 79);
  return Math.min(99, score);
}

export function parseEnrollmentBddIdsFromContext(context: unknown): string[] {
  if (!context || typeof context !== "object" || Array.isArray(context)) return [];
  const raw = (context as { enrollment_bdd_ids?: unknown }).enrollment_bdd_ids;
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}
