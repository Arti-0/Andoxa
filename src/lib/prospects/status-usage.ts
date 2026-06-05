import type { SupabaseClient } from "@supabase/supabase-js";

export interface StatusWorkflowUsage {
  id: string;
  name: string;
  /** Trigger targets this status (on_status_change). */
  trigger: boolean;
  /** CRM steps that set this status key. */
  crmStepCount: number;
}

export interface StatusUsageSummary {
  prospectCount: number;
  workflows: StatusWorkflowUsage[];
}

interface StatusRow {
  id: string;
  key: string;
  name: string;
}

type WorkflowRow = {
  id: string;
  name: string;
  trigger_kind: string | null;
  trigger_config: unknown;
  draft_definition: unknown;
  published_definition: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Supabase/PostgREST errors are plain objects (`{ message, code, details,
 * hint }`), NOT `Error` instances. Throwing them raw makes every downstream
 * `err instanceof Error ? err.message : "…"` collapse to the generic fallback,
 * which is exactly why a status delete could only ever say "Suppression
 * impossible" with no cause. Wrap them so the real Postgres code + message
 * survive the throw (e.g. `23503` FK violation, `23514` CHECK violation).
 */
export function toDbError(context: string, raw: unknown): Error {
  if (raw instanceof Error) return raw;
  const e = (raw ?? {}) as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const bits = [
    e.message,
    e.code ? `[${e.code}]` : null,
    e.details,
    e.hint,
  ].filter(Boolean);
  return new Error(bits.length ? `${context} : ${bits.join(" ")}` : context);
}

function countCrmStepsForStatus(definition: unknown, statusKey: string): number {
  if (!isRecord(definition)) return 0;
  const steps = definition.steps;
  if (!Array.isArray(steps)) return 0;
  let n = 0;
  for (const step of steps) {
    if (!isRecord(step) || step.type !== "crm") continue;
    const config = step.config;
    if (!isRecord(config)) continue;
    const field = config.field;
    const value = config.value;
    if ((field === "status" || field === undefined) && value === statusKey) {
      n += 1;
    }
  }
  return n;
}

function triggerTargetsStatus(
  triggerKind: string | null,
  triggerConfig: unknown,
  statusId: string,
): boolean {
  if (triggerKind !== "on_status_change") return false;
  if (!isRecord(triggerConfig)) return false;
  return triggerConfig.targetStatusId === statusId;
}

export async function getProspectStatusRow(
  supabase: SupabaseClient,
  organizationId: string,
  statusId: string,
): Promise<StatusRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("prospect_statuses")
    .select("id, key, name")
    .eq("id", statusId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return null;
  return data as StatusRow;
}

/** Count active prospects linked by status_id or legacy status text key. */
export async function countProspectsOnStatus(
  supabase: SupabaseClient,
  organizationId: string,
  statusId: string,
  statusKey: string,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .or(`status_id.eq.${statusId},status.eq.${statusKey}`);
  if (error) throw toDbError("Comptage des prospects échoué", error);
  return count ?? 0;
}

export async function getStatusUsage(
  supabase: SupabaseClient,
  organizationId: string,
  statusId: string,
): Promise<StatusUsageSummary | null> {
  const status = await getProspectStatusRow(supabase, organizationId, statusId);
  if (!status) return null;

  const prospectCount = await countProspectsOnStatus(
    supabase,
    organizationId,
    statusId,
    status.key,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workflows, error: wfError } = await (supabase as any)
    .from("workflows")
    .select(
      "id, name, trigger_kind, trigger_config, draft_definition, published_definition",
    )
    .eq("organization_id", organizationId);
  if (wfError) throw toDbError("Lecture des workflows échouée", wfError);

  const usageMap = new Map<string, StatusWorkflowUsage>();

  for (const wf of (workflows ?? []) as WorkflowRow[]) {
    const trigger = triggerTargetsStatus(
      wf.trigger_kind,
      wf.trigger_config,
      statusId,
    );
    const draftSteps = countCrmStepsForStatus(wf.draft_definition, status.key);
    const publishedSteps = countCrmStepsForStatus(
      wf.published_definition,
      status.key,
    );
    const crmStepCount = Math.max(draftSteps, publishedSteps);
    if (!trigger && crmStepCount === 0) continue;

    usageMap.set(wf.id, {
      id: wf.id,
      name: wf.name,
      trigger,
      crmStepCount,
    });
  }

  return {
    prospectCount,
    workflows: [...usageMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    ),
  };
}

export function definitionUsesStatusKey(
  definition: unknown,
  statusKey: string,
): boolean {
  return countCrmStepsForStatus(definition, statusKey) > 0;
}

export function rewriteDefinitionStatusKey(
  definition: unknown,
  fromKey: string,
  toKey: string,
): { definition: unknown; changed: boolean } {
  if (!isRecord(definition) || !Array.isArray(definition.steps)) {
    return { definition, changed: false };
  }
  let changed = false;
  const steps = definition.steps.map((step) => {
    if (!isRecord(step) || step.type !== "crm") return step;
    const config = step.config;
    if (!isRecord(config)) return step;
    const field = config.field;
    const value = config.value;
    if ((field === "status" || field === undefined) && value === fromKey) {
      changed = true;
      return {
        ...step,
        config: { ...config, value: toKey },
      };
    }
    return step;
  });
  if (!changed) return { definition, changed: false };
  return { definition: { ...definition, steps }, changed: true };
}

export function rewriteTriggerConfigStatusId(
  triggerKind: string | null,
  triggerConfig: unknown,
  fromId: string,
  toId: string,
): { config: unknown; changed: boolean } {
  if (triggerKind !== "on_status_change" || !isRecord(triggerConfig)) {
    return { config: triggerConfig, changed: false };
  }
  if (triggerConfig.targetStatusId !== fromId) {
    return { config: triggerConfig, changed: false };
  }
  return {
    config: { ...triggerConfig, targetStatusId: toId },
    changed: true,
  };
}
