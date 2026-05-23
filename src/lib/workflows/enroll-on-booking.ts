import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/lib/types/supabase";
import { listActiveWorkflowsForTrigger, startWorkflowRun } from "./start-run";

/**
 * Fires workflows whose `trigger_kind = 'on_booking'` whenever a prospect
 * books a meeting via the public booking page.
 *
 * Phase 3 refactor: this is now a thin wrapper around startWorkflowRun().
 * Every emitter (booking, status_change, replies, …) goes through the same
 * insert + enqueue + activity-log path so behaviour stays consistent.
 *
 * Semantics:
 *   - One run per (workflow, prospect, event) tuple. Enforced by the unique
 *     partial index `uq_workflow_runs_booking_event` (migration 20260517170000).
 *     A re-attempt for the same event is silently skipped.
 *   - A rebooking creates a new event_id → new tuple → workflow runs again.
 *   - Best-effort: failures are logged (Sentry) but never thrown to the
 *     booking caller — a workflow problem should not break the user-facing
 *     booking confirmation.
 *
 * Returns the count of workflows actually enrolled.
 */
export async function enrollOnBooking(
  supabase: SupabaseClient<Database>,
  args: {
    organizationId: string;
    prospectId: string;
    eventId: string;
    /** Booking-owner user id — stored as `started_by` for the run. */
    startedByUserId: string;
    meetUrl?: string | null;
    slotStartIso?: string | null;
  }
): Promise<number> {
  const {
    organizationId,
    prospectId,
    eventId,
    startedByUserId,
    meetUrl,
    slotStartIso,
  } = args;
  let enrolled = 0;

  try {
    const workflows = await listActiveWorkflowsForTrigger(supabase, {
      organizationId,
      triggerKind: "on_booking",
    });

    for (const wf of workflows) {
      const result = await startWorkflowRun(supabase, {
        workflowId: wf.id,
        organizationId,
        prospectId,
        definition: wf.definition,
        startedByUserId,
        enrollmentMetadata: {
          source: "booking",
          event_id: eventId,
          meet_url: meetUrl ?? null,
          slot_start: slotStartIso ?? null,
        },
        sentryAction: "enroll_on_booking_insert",
      });
      if (result.ok) enrolled += 1;
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "workflows", action: "enroll_on_booking_unhandled" },
    });
  }

  return enrolled;
}
