/**
 * Records a LinkedIn invite acceptance: matches the acceptance back to the
 * sending invite(s), writes the `linkedin_invite_accepted` activity row,
 * upserts `linkedin_relations`, optionally upserts `unipile_chat_prospects`,
 * and fires the `on_invite_accepted` workflow trigger.
 *
 * Called from:
 *   - `new_relation` webhook (definitive acceptance signal)
 *   - `message_received` webhook, outbound branch (inference: messaging an
 *     attendee we previously invited implies they accepted)
 *   - Periodic reconciler cron (relations sample-check for stale invites)
 *
 * Best-effort: never throws. Callers wrap in try/catch anyway, but this
 * helper swallows individual sub-step errors so partial progress lands.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/lib/types/supabase";
import { insertProspectActivity } from "@/lib/prospect-activity";
import { emitWorkflowTrigger } from "@/lib/workflows/fire-trigger";

/**
 * How far back to look for a matching `linkedin_invite_sent` when inferring
 * acceptance from a non-definitive signal (e.g. message_received outbound,
 * relation sampling). LinkedIn invites typically expire after 6 months, but
 * we cap shorter here to avoid mislabeling old conversations.
 */
const INVITE_LOOKBACK_DAYS = 90;

/** How many recent matching invites to consider per call (different campaigns). */
const MAX_MATCHING_INVITES = 5;

export interface RecordInviteAcceptedArgs {
  userId: string;
  /** LinkedIn provider id of the acceptor (the *prospect*). */
  providerId: string;
  /** The Unipile account id that sent the invite (LinkedIn account on our side). */
  accountId: string;
  /** Chat id if known — lets us upsert `unipile_chat_prospects` immediately. */
  chatId?: string;
  /**
   * Reason the helper is being called. Used in Sentry tags + activity details.
   *   - "new_relation": definitive (LinkedIn told us via webhook)
   *   - "outbound_message": inferred (we sent them a message)
   *   - "reconciler": inferred (cron sampling)
   */
  source: "new_relation" | "outbound_message" | "reconciler";
}

export interface RecordInviteAcceptedResult {
  /** Number of `linkedin_invite_accepted` rows inserted. 0 = already recorded or no matching invite. */
  inserted: number;
  /** Whether `linkedin_relations` was upserted. */
  relationUpserted: boolean;
  /** Whether `unipile_chat_prospects` was upserted (only when chatId provided). */
  chatLinkUpserted: boolean;
  /** Number of workflow runs enrolled by the `on_invite_accepted` trigger. */
  workflowEnrolled: number;
}

export async function recordLinkedInInviteAccepted(
  supabase: SupabaseClient<Database>,
  args: RecordInviteAcceptedArgs
): Promise<RecordInviteAcceptedResult> {
  const result: RecordInviteAcceptedResult = {
    inserted: 0,
    relationUpserted: false,
    chatLinkUpserted: false,
    workflowEnrolled: 0,
  };

  // 1. Upsert linkedin_relations — the user is now 1st-degree with this
  //    attendee, regardless of whether we can pair the acceptance to an
  //    invite. Always safe to write.
  try {
    const { error } = await supabase.from("linkedin_relations").upsert(
      [
        {
          user_id: args.userId,
          attendee_id: args.providerId,
          connected_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,attendee_id", ignoreDuplicates: false }
    );
    if (error) {
      console.error("[invite-accepted] linkedin_relations upsert:", error);
      Sentry.captureException(error, {
        tags: { feature: "linkedin", action: "record_invite_accepted", source: args.source },
      });
    } else {
      result.relationUpserted = true;
    }
  } catch (err) {
    console.error("[invite-accepted] linkedin_relations exception:", err);
    Sentry.captureException(err);
  }

  // 2. Find matching invites. process-job-batch.ts stamps `provider_id` and
  //    `account_id` into the invite activity details when sending campaign
  //    invites; we filter on both to pin the right campaign_job_id.
  const sinceIso = new Date(
    Date.now() - INVITE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: matchingInvites, error: matchErr } = await supabase
    .from("prospect_activity")
    .select(
      "id, prospect_id, organization_id, actor_id, campaign_job_id, created_at, details"
    )
    .eq("action", "linkedin_invite_sent")
    .gte("created_at", sinceIso)
    .filter("details->>provider_id", "eq", args.providerId)
    .filter("details->>account_id", "eq", args.accountId)
    .order("created_at", { ascending: false })
    .limit(MAX_MATCHING_INVITES);

  if (matchErr) {
    console.error("[invite-accepted] match invites:", matchErr);
    Sentry.captureException(matchErr);
    return result;
  }

  const invites = matchingInvites ?? [];
  if (!invites.length) {
    // No invite to pair the acceptance with — the prospect may have been
    // added pre-Andoxa or invited outside the app. The relation upsert
    // above already records they're now connected.
    return result;
  }

  // 3. For each matching invite: dedupe by (prospect_id, campaign_job_id),
  //    insert linkedin_invite_accepted, then emit workflow trigger.
  for (const inv of invites) {
    if (!inv.prospect_id) continue;

    // Dedupe: skip if we've already recorded an acceptance for this
    // (prospect_id, campaign_job_id) tuple. campaign_job_id NULL is its own
    // bucket (direct/single sends).
    let dedupeQuery = supabase
      .from("prospect_activity")
      .select("id")
      .eq("action", "linkedin_invite_accepted")
      .eq("prospect_id", inv.prospect_id);
    dedupeQuery = inv.campaign_job_id
      ? dedupeQuery.eq("campaign_job_id", inv.campaign_job_id)
      : dedupeQuery.is("campaign_job_id", null);

    const { data: existing } = await dedupeQuery.limit(1).maybeSingle();
    if (existing) continue;

    await insertProspectActivity(supabase, {
      organization_id: inv.organization_id,
      prospect_id: inv.prospect_id,
      actor_id: inv.actor_id ?? args.userId,
      campaign_job_id: inv.campaign_job_id ?? null,
      action: "linkedin_invite_accepted",
      details: {
        campaign_job_id: inv.campaign_job_id ?? null,
        provider_id: args.providerId,
        account_id: args.accountId,
        source: args.source,
        ...(args.chatId ? { chat_id: args.chatId } : {}),
      },
    });
    result.inserted += 1;

    // Workflow trigger — fires once per acceptance event. Dedup is enforced
    // server-side via the `uq_workflow_runs_dedupe` partial index on
    // enrollment_metadata.dedupe_key. Errors are captured inside the emitter.
    try {
      const triggerResult = await emitWorkflowTrigger(supabase, {
        organizationId: inv.organization_id,
        prospectId: inv.prospect_id,
        startedByUserId: null,
        payload: {
          kind: "on_invite_accepted",
          providerId: args.providerId,
          accountId: args.accountId,
          campaignJobId: inv.campaign_job_id ?? null,
        },
      });
      result.workflowEnrolled += triggerResult.enrolled;
    } catch (err) {
      console.error("[invite-accepted] workflow trigger:", err);
    }
  }

  // 4. Upsert unipile_chat_prospects when we know the chat. We can only
  //    safely write this when we have a prospect_id from the invite match
  //    — otherwise we'd be linking an unknown chat to nothing. We pick
  //    the most-recent invite that wasn't already linked to a chat.
  if (args.chatId && invites.length > 0) {
    const orgId = invites[0]!.organization_id;
    const prospectId = invites[0]!.prospect_id;
    if (prospectId) {
      try {
        const { error: chatLinkErr } = await supabase
          .from("unipile_chat_prospects")
          .upsert(
            [
              {
                organization_id: orgId,
                prospect_id: prospectId,
                unipile_chat_id: args.chatId,
              },
            ],
            {
              onConflict: "unipile_chat_id",
              ignoreDuplicates: false,
            }
          );
        if (chatLinkErr) {
          console.error("[invite-accepted] unipile_chat_prospects:", chatLinkErr);
          Sentry.captureException(chatLinkErr);
        } else {
          result.chatLinkUpserted = true;
        }
      } catch (err) {
        console.error("[invite-accepted] chat link exception:", err);
        Sentry.captureException(err);
      }
    }
  }

  return result;
}
