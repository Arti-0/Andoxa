/**
 * Shared "insert one workflow_run + enqueue step 0" plumbing. Extracted
 * from enroll-on-booking so the new emitWorkflowTrigger() in fire-trigger.ts
 * uses the exact same path — same insert shape, same enqueue, same activity
 * log, same Sentry tagging. The legacy enrollOnBooking now just builds the
 * booking-specific enrollment_metadata and delegates here.
 *
 * Contract:
 *   - Returns { ok: true, runId } on a successful enrolment.
 *   - Returns { ok: false, reason: "duplicate" } when the unique-violation
 *     index (booking-event dedupe or generic dedupe-key) trips. Callers
 *     should treat this as a quiet skip, not an error.
 *   - Returns { ok: false, reason: "unhandled" } with Sentry already
 *     notified for any other failure path.
 *   - On enqueue failure, rolls back the workflow_runs insert so the queue
 *     and the catalog never disagree.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import type { Database, Json } from "@/lib/types/supabase";
import { enqueueFirstStep } from "./enqueue";
import {
  parseWorkflowDefinition,
  type WorkflowDefinition,
} from "./schema";
import { logWorkflowEnrolled } from "@/lib/prospect-activity";

export type StartWorkflowRunResult =
  | { ok: true; runId: string }
  | { ok: false; reason: "duplicate" | "unhandled" };

export async function startWorkflowRun(
  supabase: SupabaseClient<Database>,
  args: {
    workflowId: string;
    organizationId: string;
    prospectId: string;
    /** Parsed published definition. Callers parse once; we reuse. */
    definition: WorkflowDefinition;
    /** User who triggered the enrolment. May be NULL for system triggers. */
    startedByUserId: string | null;
    /**
     * Stashed on the run row. Keys recognised today:
     *   - source           : "booking" | "status_change" | "no_show" | …
     *   - event_id         : (on_booking) — used by uq_workflow_runs_booking_event
     *   - dedupe_key       : generic per-trigger dedupe, used by the
     *                        uq_workflow_runs_dedupe partial index added in
     *                        the Phase 2 migration. Format
     *                        "<trigger>:<stable id>" e.g. "noshow:<eventId>".
     *   - any other payload : free-form, available to step handlers.
     */
    enrollmentMetadata: Record<string, unknown>;
    /** Sentry feature tag, lets us trace which emitter created the run. */
    sentryAction: string;
  }
): Promise<StartWorkflowRunResult> {
  const {
    workflowId,
    organizationId,
    prospectId,
    definition,
    startedByUserId,
    enrollmentMetadata,
    sentryAction,
  } = args;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run, error: runErr } = await (supabase as any)
    .from("workflow_runs")
    .insert({
      workflow_id: workflowId,
      organization_id: organizationId,
      prospect_id: prospectId,
      started_by: startedByUserId,
      status: "running",
      current_step_index: 0,
      context: {} as Json,
      definition_snapshot: definition as unknown as Json,
      enrollment_metadata: enrollmentMetadata as unknown as Json,
    })
    .select("id")
    .single();

  if (runErr || !run) {
    const code = (runErr as { code?: string } | null)?.code;
    if (code === "23505") {
      // Dedupe index tripped — same event/key fired twice. Quiet skip.
      return { ok: false, reason: "duplicate" };
    }
    Sentry.captureException(runErr ?? new Error("missing_run_id"), {
      tags: { feature: "workflows", action: sentryAction },
      extra: { workflowId, prospectId, enrollmentMetadata },
    });
    return { ok: false, reason: "unhandled" };
  }

  const enq = await enqueueFirstStep(supabase, run.id, definition);
  if (!enq.ok) {
    // Roll back so the runs catalog reflects reality.
    await supabase.from("workflow_runs").delete().eq("id", run.id);
    Sentry.captureMessage("startWorkflowRun enqueueFirstStep failed", {
      level: "warning",
      extra: {
        workflowId,
        prospectId,
        enrollmentMetadata,
        error: enq.error,
      },
    });
    return { ok: false, reason: "unhandled" };
  }

  try {
    await logWorkflowEnrolled(supabase, {
      organization_id: organizationId,
      prospect_id: prospectId,
      workflow_id: workflowId,
      actor_id: startedByUserId,
      run_id: run.id,
    });
  } catch (logErr) {
    // Activity log failure is non-fatal; the run is real and queued.
    Sentry.captureException(logErr, {
      tags: { feature: "workflows", action: `${sentryAction}_log` },
    });
  }

  return { ok: true, runId: run.id };
}

/**
 * Helper for the common pattern: fetch + parse active workflows for an org
 * that match a given trigger_kind. Used by every concrete emitter (booking,
 * status_change, replies, etc.).
 */
export async function listActiveWorkflowsForTrigger(
  supabase: SupabaseClient<Database>,
  args: { organizationId: string; triggerKind: string }
): Promise<Array<{ id: string; definition: WorkflowDefinition; triggerConfig: Record<string, unknown> }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("workflows")
    .select("id, published_definition, trigger_config")
    .eq("organization_id", args.organizationId)
    .eq("is_active", true)
    .eq("trigger_kind", args.triggerKind)
    .not("published_definition", "is", null);

  if (error) {
    Sentry.captureException(error, {
      tags: { feature: "workflows", action: "list_active_workflows_for_trigger" },
      extra: { triggerKind: args.triggerKind },
    });
    return [];
  }

  const result: Array<{ id: string; definition: WorkflowDefinition; triggerConfig: Record<string, unknown> }> = [];
  for (const wf of (data ?? []) as Array<{
    id: string;
    published_definition: unknown;
    trigger_config: unknown;
  }>) {
    let definition: WorkflowDefinition;
    try {
      definition = parseWorkflowDefinition(wf.published_definition);
    } catch (parseErr) {
      Sentry.captureException(parseErr, {
        tags: { feature: "workflows", action: "parse_for_trigger" },
        extra: { workflowId: wf.id, triggerKind: args.triggerKind },
      });
      continue;
    }
    const triggerConfig =
      wf.trigger_config && typeof wf.trigger_config === "object"
        ? (wf.trigger_config as Record<string, unknown>)
        : {};
    result.push({ id: wf.id, definition, triggerConfig });
  }
  return result;
}
