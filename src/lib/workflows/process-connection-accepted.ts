import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import {
  logWorkflowRunCompleted,
  logWorkflowStepCompleted,
} from "@/lib/prospect-activity";
import { enqueueNextStep } from "./enqueue";
import { parseWorkflowDefinition } from "./schema";

export async function processConnectionAccepted(
  supabase: SupabaseClient<Database>,
  executionId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { data: exec } = await supabase
    .from("workflow_step_executions")
    .select("*")
    .eq("id", executionId)
    .eq("status", "pending")
    .maybeSingle();

  if (!exec) return;

  const { data: run } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("id", exec.run_id)
    .eq("started_by", userId)
    .eq("status", "running")
    .maybeSingle();

  if (!run) return;

  const { data: wf } = await supabase
    .from("workflows")
    .select("is_active")
    .eq("id", run.workflow_id)
    .maybeSingle();

  if (!wf?.is_active) return;

  await supabase
    .from("workflow_step_executions")
    .update({
      status: "completed",
      processed_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq("id", executionId);

  await logWorkflowStepCompleted(supabase, {
    organization_id: run.organization_id,
    prospect_id: run.prospect_id,
    workflow_id: run.workflow_id,
    actor_id: run.started_by,
    run_id: run.id,
    step_index: exec.step_index,
    step_type: exec.step_type,
    step_id: exec.step_id,
  });

  const definition = parseWorkflowDefinition(run.definition_snapshot);

  const next = await enqueueNextStep(
    supabase,
    run.id,
    definition,
    exec.step_index,
    0
  );

  if (!next.ok) {
    await supabase
      .from("workflow_runs")
      .update({ status: "failed", last_error: next.error, updated_at: now })
      .eq("id", run.id);
    return;
  }

  if (next.done) {
    await supabase
      .from("workflow_runs")
      .update({
        status: "completed",
        current_step_index: exec.step_index,
        last_error: null,
        updated_at: now,
      })
      .eq("id", run.id);

    await logWorkflowRunCompleted(supabase, {
      organization_id: run.organization_id,
      prospect_id: run.prospect_id,
      workflow_id: run.workflow_id,
      actor_id: run.started_by,
      run_id: run.id,
    });
  } else {
    await supabase
      .from("workflow_runs")
      .update({
        current_step_index: exec.step_index + 1,
        updated_at: now,
      })
      .eq("id", run.id);
  }
}
