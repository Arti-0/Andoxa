import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/supabase";
import * as Sentry from "@sentry/nextjs";
import { enqueueFirstStep } from "./enqueue";
import { parseWorkflowDefinition } from "./schema";
import { logWorkflowEnrolled } from "@/lib/prospect-activity";

/**
 * Fires workflows whose `trigger_kind = 'on_booking'` whenever a prospect
 * books a meeting via the public booking page.
 *
 * Semantics:
 *   - One run per (workflow, prospect, event) tuple. Enforced by the unique
 *     partial index `uq_workflow_runs_booking_event` (migration 20260517170000).
 *     A re-attempt for the same event is silently skipped (Postgres 23505).
 *   - A rebooking creates a NEW event_id → NEW pair → workflow runs again,
 *     per product spec.
 *   - Best-effort: every failure path is logged (Sentry + console) but never
 *     surfaced to the public booking caller. A workflow-enrollment problem
 *     should not break the user's booking confirmation.
 *
 * Returns the count of workflows enrolled (0 when there are no matching
 * workflows, the prospect was already enrolled, or any step failed).
 */
export async function enrollOnBooking(
  supabase: SupabaseClient<Database>,
  args: {
    organizationId: string;
    prospectId: string;
    eventId: string;
    /** Booking-owner user id — used as `started_by` for the run. */
    startedByUserId: string;
  }
): Promise<number> {
  const { organizationId, prospectId, eventId, startedByUserId } = args;

  let enrolled = 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workflows, error } = await (supabase as any)
      .from("workflows")
      .select("id, published_definition")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .eq("trigger_kind", "on_booking")
      .not("published_definition", "is", null);

    if (error) {
      Sentry.captureException(error, {
        tags: { feature: "workflows", action: "enroll_on_booking_list" },
      });
      return 0;
    }

    for (const wf of (workflows ?? []) as Array<{
      id: string;
      published_definition: unknown;
    }>) {
      let definition;
      try {
        definition = parseWorkflowDefinition(wf.published_definition);
      } catch (parseErr) {
        Sentry.captureException(parseErr, {
          tags: { feature: "workflows", action: "enroll_on_booking_parse" },
          extra: { workflowId: wf.id },
        });
        continue;
      }

      const enrollment_metadata: Json = {
        source: "booking",
        event_id: eventId,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: run, error: runErr } = await (supabase as any)
        .from("workflow_runs")
        .insert({
          workflow_id: wf.id,
          organization_id: organizationId,
          prospect_id: prospectId,
          started_by: startedByUserId,
          status: "running",
          current_step_index: 0,
          context: {} as Json,
          definition_snapshot: definition as Json,
          enrollment_metadata,
        })
        .select("id")
        .single();

      if (runErr || !run) {
        // 23505 = unique-violation against uq_workflow_runs_booking_event.
        // That's the dedup index doing its job (same event re-fired) — quiet
        // skip without logging. Anything else: Sentry + continue.
        const code = (runErr as { code?: string } | null)?.code;
        if (code !== "23505") {
          Sentry.captureException(runErr ?? new Error("missing_run_id"), {
            tags: { feature: "workflows", action: "enroll_on_booking_insert" },
            extra: { workflowId: wf.id, prospectId, eventId },
          });
        }
        continue;
      }

      const enq = await enqueueFirstStep(supabase, run.id, definition);
      if (!enq.ok) {
        await supabase.from("workflow_runs").delete().eq("id", run.id);
        Sentry.captureMessage("on_booking workflow enqueueFirstStep failed", {
          level: "warning",
          extra: {
            workflowId: wf.id,
            prospectId,
            eventId,
            error: enq.error,
          },
        });
        continue;
      }

      try {
        await logWorkflowEnrolled(supabase, {
          organization_id: organizationId,
          prospect_id: prospectId,
          workflow_id: wf.id,
          actor_id: startedByUserId,
          run_id: run.id,
        });
      } catch (logErr) {
        // Activity-log failure is non-fatal for the run itself.
        Sentry.captureException(logErr, {
          tags: { feature: "workflows", action: "enroll_on_booking_log" },
        });
      }

      enrolled += 1;
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "workflows", action: "enroll_on_booking_unhandled" },
    });
  }

  return enrolled;
}
