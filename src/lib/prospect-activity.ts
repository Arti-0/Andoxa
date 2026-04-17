import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import type { Json } from "@/lib/types/supabase";

export type ProspectActivityAction =
  | "status_change"
  | "workflow_enrolled"
  | "workflow_step_completed"
  | "workflow_step_failed"
  | "workflow_run_completed";

/**
 * Best-effort log; never throws (cron / workflows must not depend on this table).
 */
export async function insertProspectActivity(
  supabase: SupabaseClient<Database>,
  row: {
    organization_id: string;
    prospect_id: string;
    workflow_id?: string | null;
    actor_id: string | null;
    action: ProspectActivityAction | string;
    details: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("prospect_activity").insert({
      organization_id: row.organization_id,
      prospect_id: row.prospect_id,
      workflow_id: row.workflow_id ?? null,
      actor_id: row.actor_id,
      action: row.action,
      details: row.details as Json,
    });
    if (error) {
      console.error("[prospect_activity] insert failed", error.message);
    }
  } catch (e) {
    console.error("[prospect_activity] insert exception", e);
  }
}

export async function fetchWorkflowName(
  supabase: SupabaseClient<Database>,
  workflowId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("workflows")
    .select("name")
    .eq("id", workflowId)
    .maybeSingle();
  return data?.name ?? null;
}

export async function logWorkflowEnrolled(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string;
    run_id: string;
  }
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_enrolled",
    details: {
      workflow_name: workflowName,
      run_id: args.run_id,
    },
  });
}

export async function logWorkflowStepCompleted(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string;
    run_id: string;
    step_index: number;
    step_type: string;
    step_id: string;
  }
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_step_completed",
    details: {
      workflow_name: workflowName,
      run_id: args.run_id,
      step_index: args.step_index,
      step_type: args.step_type,
      step_id: args.step_id,
    },
  });
}

export async function logWorkflowRunCompleted(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string;
    run_id: string;
  }
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_run_completed",
    details: {
      workflow_name: workflowName,
      run_id: args.run_id,
    },
  });
}

export async function logWorkflowStepFailed(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string;
    run_id: string;
    step_index: number;
    step_type: string;
    error: string;
  }
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_step_failed",
    details: {
      workflow_name: workflowName,
      run_id: args.run_id,
      step_index: args.step_index,
      step_type: args.step_type,
      error: args.error.slice(0, 500),
    },
  });
}
