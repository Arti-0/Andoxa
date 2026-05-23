/**
 * Central workflow trigger emitter. Mutation sites (status change, reply
 * webhook, no-show update, list-add, tag-attach) call this once per event
 * and let the emitter handle the rest:
 *
 *   1. Fetch active workflows in the org matching the trigger kind.
 *   2. Filter them by their `trigger_config` against the event payload
 *      (e.g. only workflows whose `targetStatusId` matches the new status).
 *   3. Build a deterministic dedupe key per (trigger, event), stash it
 *      under `enrollment_metadata.dedupe_key`, and call startWorkflowRun.
 *
 * The dedupe key is enforced server-side by a partial unique index
 * `uq_workflow_runs_dedupe` added in the Phase 2 migration. Two events
 * carrying the same key (e.g. a Unipile webhook replayed) will trip the
 * index → startWorkflowRun returns { ok: false, reason: "duplicate" }
 * and we silently skip.
 *
 * Every emitter site wraps the call in try/catch: a failing trigger must
 * never break the underlying mutation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/lib/types/supabase";
import { isProspectAutomationExcluded } from "@/lib/prospects/automation-opt-out";
import {
  listActiveWorkflowsForTrigger,
  startWorkflowRun,
} from "./start-run";
import type { WorkflowTriggerKind } from "./trigger-kind";

// ---------- payload types (one per trigger kind) ----------------------------

export type WorkflowTriggerPayload =
  | { kind: "manual" /* unused — manual uses /api/workflows/[id]/runs directly */ }
  | { kind: "on_booking"; eventId: string }
  | { kind: "on_no_show"; eventId: string }
  | { kind: "on_status_change"; statusId: string; fromStatusId: string | null }
  | { kind: "on_linkedin_reply"; messageId: string; occurredAt: string }
  | { kind: "on_whatsapp_reply"; messageId: string; occurredAt: string }
  | {
      kind: "on_campaign_reply";
      messageId: string;
      campaignJobId: string;
      channel: "linkedin" | "whatsapp";
    }
  | {
      kind: "on_invite_accepted";
      providerId: string;
      accountId: string;
      /** NULL when the acceptance can't be paired to a campaign (e.g. single send). */
      campaignJobId: string | null;
    }
  | { kind: "on_list_add"; listId: string }
  | { kind: "on_tag"; tagId: string };

// ---------- public API ------------------------------------------------------

export async function emitWorkflowTrigger(
  supabase: SupabaseClient<Database>,
  args: {
    organizationId: string;
    prospectId: string;
    payload: WorkflowTriggerPayload;
    /** User who caused the event. NULL for system events (webhooks, cron). */
    startedByUserId?: string | null;
  }
): Promise<{ enrolled: number }> {
  const { organizationId, prospectId, payload, startedByUserId = null } = args;

  if (payload.kind === "manual") return { enrolled: 0 };

  // Prospect-level automation opt-out. Every system-triggered enrollment
  // (status change, reply webhook, invite accepted, etc.) routes through
  // this function, so a single guard here keeps opted-out prospects out of
  // every workflow automation. Manual enrollments go through
  // /api/workflows/[id]/runs and have their own check there.
  try {
    const { data: prospect } = await supabase
      .from("prospects")
      .select("metadata")
      .eq("id", prospectId)
      .maybeSingle();
    if (
      isProspectAutomationExcluded(
        prospect as { metadata?: unknown } | null | undefined
      )
    ) {
      return { enrolled: 0 };
    }
  } catch (err) {
    // Best-effort: if the opt-out lookup itself fails (network, RLS), don't
    // block the trigger — we'd rather over-enroll than miss legitimate
    // workflow fires. The error still gets reported.
    Sentry.captureException(err, {
      tags: { feature: "workflows", action: "opt_out_lookup" },
      extra: { prospectId, organizationId },
    });
  }

  let enrolled = 0;
  try {
    const workflows = await listActiveWorkflowsForTrigger(supabase, {
      organizationId,
      triggerKind: payload.kind,
    });

    for (const wf of workflows) {
      if (!matchesConfig(payload, wf.triggerConfig)) continue;

      const metadata = buildEnrollmentMetadata(payload);

      const result = await startWorkflowRun(supabase, {
        workflowId: wf.id,
        organizationId,
        prospectId,
        definition: wf.definition,
        startedByUserId,
        enrollmentMetadata: metadata,
        sentryAction: `emit_${payload.kind}`,
      });
      if (result.ok) enrolled += 1;
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "workflows", action: `emit_${payload.kind}_unhandled` },
      extra: { prospectId, organizationId },
    });
  }

  return { enrolled };
}

// ---------- pure helpers (testable in isolation) ----------------------------

/**
 * Match a payload against the workflow's trigger_config. Today only
 * on_status_change and on_tag carry mandatory config; the others always
 * match (any reply, any list add, any no-show fires).
 *
 * Exported for unit tests — pure function, no I/O.
 */
export function matchesConfig(
  payload: WorkflowTriggerPayload,
  config: Record<string, unknown>
): boolean {
  switch (payload.kind) {
    case "on_status_change": {
      const target = config["targetStatusId"];
      // If no target is configured, the workflow author meant "any change"
      // — accept everything. Once they set a target, only that match fires.
      if (target == null || target === "") return true;
      return target === payload.statusId;
    }
    case "on_tag": {
      const target = config["targetTagId"];
      if (target == null || target === "") return true;
      return target === payload.tagId;
    }
    case "on_campaign_reply": {
      // Optional scoping: workflow author may pin a specific campaign job.
      const scope = config["campaignJobId"];
      if (scope == null || scope === "") return true;
      return scope === payload.campaignJobId;
    }
    case "on_list_add": {
      // Optional scoping: trigger may target a specific list.
      const scope = config["targetListId"];
      if (scope == null || scope === "") return true;
      return scope === payload.listId;
    }
    case "on_booking":
    case "on_no_show":
    case "on_linkedin_reply":
    case "on_whatsapp_reply":
    case "on_invite_accepted":
      return true;
    case "manual":
      return false;
  }
}

/**
 * Build the enrollment_metadata jsonb to stash on workflow_runs. Always
 * includes a `source` (= trigger kind) and a `dedupe_key` so the unique
 * partial index `uq_workflow_runs_dedupe` can suppress duplicate fires.
 *
 * Booking keeps its legacy event_id key for backwards-compat with the
 * existing uq_workflow_runs_booking_event index.
 *
 * Exported for unit tests.
 */
export function buildEnrollmentMetadata(
  payload: WorkflowTriggerPayload
): Record<string, unknown> {
  switch (payload.kind) {
    case "on_booking":
      return {
        source: "booking",
        event_id: payload.eventId,
        dedupe_key: `booking:${payload.eventId}`,
      };
    case "on_no_show":
      return {
        source: "no_show",
        event_id: payload.eventId,
        dedupe_key: `noshow:${payload.eventId}`,
      };
    case "on_status_change":
      return {
        source: "status_change",
        status_id: payload.statusId,
        from_status_id: payload.fromStatusId,
        // Same prospect can re-cycle through a status; we don't dedupe by
        // status alone (that would block legitimate re-entries). Include
        // a timestamp ms so each transition is a fresh enrollment.
        dedupe_key: `status_change:${payload.statusId}:${Date.now()}`,
      };
    case "on_linkedin_reply":
      return {
        source: "linkedin_reply",
        message_id: payload.messageId,
        dedupe_key: `linkedin_reply:${payload.messageId}`,
      };
    case "on_whatsapp_reply":
      return {
        source: "whatsapp_reply",
        message_id: payload.messageId,
        dedupe_key: `whatsapp_reply:${payload.messageId}`,
      };
    case "on_campaign_reply":
      return {
        source: "campaign_reply",
        message_id: payload.messageId,
        campaign_job_id: payload.campaignJobId,
        channel: payload.channel,
        dedupe_key: `campaign_reply:${payload.messageId}`,
      };
    case "on_invite_accepted":
      return {
        source: "invite_accepted",
        provider_id: payload.providerId,
        account_id: payload.accountId,
        campaign_job_id: payload.campaignJobId,
        // Dedup by provider+account (the LinkedIn-side identity of the
        // acceptance event). If the same prospect somehow gets re-invited
        // after re-disconnecting they'd get the same dedupe key — accept
        // the trade-off; LinkedIn re-acceptances are rare.
        dedupe_key: `invite_accepted:${payload.accountId}:${payload.providerId}`,
      };
    case "on_list_add":
      return {
        source: "list_add",
        list_id: payload.listId,
        dedupe_key: `list_add:${payload.listId}`,
      };
    case "on_tag":
      return {
        source: "tag_added",
        tag_id: payload.tagId,
        dedupe_key: `tag_added:${payload.tagId}`,
      };
    case "manual":
      // Manual enrollments go through the explicit API route — not this
      // emitter — so this branch is unreachable.
      return { source: "manual" };
  }
}

// Re-export for callers that only need the kind list.
export type { WorkflowTriggerKind };
