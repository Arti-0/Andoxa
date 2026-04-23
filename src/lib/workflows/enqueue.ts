import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import type { WorkflowDefinition, WorkflowStep } from "./schema";

/**
 * Find a step in the definition by its ID.
 */
export function getStepById(
  definition: WorkflowDefinition,
  stepId: string
): WorkflowStep | undefined {
  return definition.steps.find((s) => s.id === stepId);
}

/**
 * Enqueue a specific step by step ID (for graph-based workflow execution).
 */
export async function enqueueStepById(
  supabase: SupabaseClient<Database>,
  runId: string,
  definition: WorkflowDefinition,
  stepId: string,
  runAfterMs: number
): Promise<{ ok: true; done: boolean } | { ok: false; error: string }> {
  const step = getStepById(definition, stepId);
  if (!step) {
    return { ok: true, done: true }; // step not found = branch ends
  }

  const stepIndex = definition.steps.findIndex((s) => s.id === stepId);
  const runAfter = new Date(Date.now() + Math.max(0, runAfterMs)).toISOString();

  const { error } = await supabase.from("workflow_step_executions").insert({
    run_id: runId,
    step_index: stepIndex,
    step_id: step.id,
    step_type: step.type,
    config_snapshot: step.config as Database["public"]["Tables"]["workflow_step_executions"]["Row"]["config_snapshot"],
    status: "pending",
    run_after: runAfter,
    idempotency_key: buildIdempotencyKey(runId, stepIndex, step.id),
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, done: false };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, done: false };
}

export function buildIdempotencyKey(
  runId: string,
  stepIndex: number,
  stepId: string
): string {
  return `${runId}:${stepIndex}:${stepId}`;
}

export function getStepAt(
  definition: WorkflowDefinition,
  index: number
): WorkflowStep | undefined {
  return definition.steps[index];
}

/**
 * Insert the first pending execution for a new run (step 0).
 */
export async function enqueueFirstStep(
  supabase: SupabaseClient<Database>,
  runId: string,
  definition: WorkflowDefinition
): Promise<{ ok: true } | { ok: false; error: string }> {
  const step = definition.steps[0];
  if (!step) {
    return { ok: false, error: "Workflow sans étape" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("workflow_step_executions").insert({
    run_id: runId,
    step_index: 0,
    step_id: step.id,
    step_type: step.type,
    config_snapshot: step.config as Database["public"]["Tables"]["workflow_step_executions"]["Row"]["config_snapshot"],
    status: "pending",
    run_after: now,
    idempotency_key: buildIdempotencyKey(runId, 0, step.id),
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Schedule the next step after `completedStepIndex` completed.
 * If `delayBeforeNextMs` > 0, the next row's run_after is pushed (used after a wait step completes).
 */
export async function enqueueNextStep(
  supabase: SupabaseClient<Database>,
  runId: string,
  definition: WorkflowDefinition,
  completedStepIndex: number,
  delayBeforeNextMs: number
): Promise<{ ok: true; done: boolean } | { ok: false; error: string }> {
  const nextIndex = completedStepIndex + 1;
  if (nextIndex >= definition.steps.length) {
    return { ok: true, done: true };
  }

  const step = definition.steps[nextIndex];
  const runAfter = new Date(Date.now() + Math.max(0, delayBeforeNextMs)).toISOString();

  const { error } = await supabase.from("workflow_step_executions").insert({
    run_id: runId,
    step_index: nextIndex,
    step_id: step.id,
    step_type: step.type,
    config_snapshot: step.config as Database["public"]["Tables"]["workflow_step_executions"]["Row"]["config_snapshot"],
    status: "pending",
    run_after: runAfter,
    idempotency_key: buildIdempotencyKey(runId, nextIndex, step.id),
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, done: false };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, done: false };
}
