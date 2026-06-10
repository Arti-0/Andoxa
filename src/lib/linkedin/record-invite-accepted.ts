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
import type { Database, Json } from "@/lib/types/supabase";
import { computeFollowUpDelayMs, isWithinSendWindow } from "@/lib/linkedin/pacing";
import { insertProspectActivity } from "@/lib/prospect-activity";
import { emitWorkflowTrigger } from "@/lib/workflows/fire-trigger";
import { applyMessageVariables, sendLinkedInChatMessage } from "@/lib/unipile/campaign";
import { readCampaignAttachment } from "@/lib/campaigns/types";
import { downloadCampaignAttachment } from "@/lib/campaigns/attachment";
import { env } from "@/lib/config/environment";
import { buildBookingPublicUrlForProfile } from "@/lib/booking/public-path";
import {
  dailyPeriodKey,
  incrementUsageCounter,
} from "@/lib/campaigns/throttle";

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
  /** Number of phase-2 follow-ups *scheduled* (invite_then_message). They are
   *  sent later, paced, by `drainScheduledFollowUps` — not inline here. */
  followUpsScheduled: number;
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
    followUpsScheduled: 0,
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

    // Phase 2 of invite_then_message: rather than firing the follow-up message
    // inline (instant reply = bot tell), we *schedule* it on this acceptance row
    // and let `drainScheduledFollowUps` send it later, paced and in business
    // hours. The schedule rides on the linkedin_invite_accepted row's details so
    // we don't introduce a queue table or a timeline-polluting activity verb.
    const invDetails = (inv.details ?? null) as { job_type?: string | null } | null;
    const isFollowUp =
      invDetails?.job_type === "invite_then_message" && Boolean(inv.campaign_job_id);
    const followUp = isFollowUp
      ? {
          followup_status: "pending" as const,
          followup_scheduled_at: new Date(
            Date.now() + computeFollowUpDelayMs(),
          ).toISOString(),
        }
      : null;

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
        ...(followUp ?? {}),
      },
    });
    result.inserted += 1;
    if (followUp) result.followUpsScheduled += 1;

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

/** Max scheduled follow-ups inspected per drain tick. */
const FOLLOWUP_DRAIN_BATCH = 50;

type ScheduledFollowUpDetails = {
  provider_id?: string;
  account_id?: string;
  chat_id?: string;
};

/**
 * Sends due, paced phase-2 follow-up messages.
 *
 * Reads `linkedin_invite_accepted` rows that were marked `followup_status:
 * 'pending'` with a `followup_scheduled_at` now in the past, and sends at most
 * **one per user per tick** (so a clutch of acceptances doesn't fire back-to-back)
 * and only inside the business-hours window. The actual send + dedupe lives in
 * {@link dispatchInviteThenMessageFollowUp}; here we just gate timing and flip
 * the row's status so it leaves the queue. Best-effort: called from the
 * campaign-jobs cron every minute.
 */
export async function drainScheduledFollowUps(
  supabase: SupabaseClient<Database>,
): Promise<{ checked: number; sent: number }> {
  // Same window as outbound sends — never reply outside business hours.
  if (!isWithinSendWindow()) return { checked: 0, sent: 0 };

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("prospect_activity")
    .select("id, prospect_id, organization_id, actor_id, campaign_job_id, details")
    .eq("action", "linkedin_invite_accepted")
    .filter("details->>followup_status", "eq", "pending")
    .filter("details->>followup_scheduled_at", "lte", nowIso)
    .limit(FOLLOWUP_DRAIN_BATCH);

  if (error || !due?.length) return { checked: 0, sent: 0 };

  const handledUsers = new Set<string>();
  let sent = 0;

  for (const row of due) {
    const userId = row.actor_id;
    if (!userId || !row.campaign_job_id || !row.prospect_id) continue;
    // One follow-up per user per tick keeps the cadence human.
    if (handledUsers.has(userId)) continue;

    const details = (row.details ?? {}) as ScheduledFollowUpDetails;
    if (!details.provider_id || !details.account_id) {
      await markFollowUpDone(supabase, row.id, row.details, "skipped");
      continue;
    }

    handledUsers.add(userId);
    try {
      const dispatched = await dispatchInviteThenMessageFollowUp(supabase, {
        campaignJobId: row.campaign_job_id,
        prospectId: row.prospect_id,
        providerId: details.provider_id,
        accountId: details.account_id,
        chatId: details.chat_id ?? null,
        userId,
      });
      if (dispatched) sent += 1;
      // Either way it's resolved (sent, or skipped because already-sent / no
      // template) — flip status so it doesn't clog the next drain.
      await markFollowUpDone(supabase, row.id, row.details, dispatched ? "sent" : "skipped");
    } catch (err) {
      // Transient (e.g. Unipile hiccup) — leave pending for the next tick.
      console.error("[followup drain] dispatch:", err);
      Sentry.captureException(err, {
        tags: { feature: "linkedin", action: "followup_drain" },
      });
    }
  }

  return { checked: due.length, sent };
}

/** Flip a scheduled follow-up row's status so it leaves the pending queue. */
async function markFollowUpDone(
  supabase: SupabaseClient<Database>,
  id: string,
  details: Json,
  status: "sent" | "skipped",
): Promise<void> {
  const base =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : {};
  const merged = {
    ...base,
    followup_status: status,
    followup_sent_at: new Date().toISOString(),
  } as Json;
  const { error } = await supabase
    .from("prospect_activity")
    .update({ details: merged })
    .eq("id", id);
  if (error) console.error("[followup drain] mark done:", error.message);
}

/**
 * Phase-2 helper for the `invite_then_message` campaign type. Sends the
 * follow-up message stored on the campaign_job once LinkedIn confirms the
 * invite was accepted.
 *
 * Idempotency: returns false (without sending) when a
 * `linkedin_message_outbound` activity already exists for this
 * (campaign_job_id, prospect_id) pair — protects against duplicate webhooks
 * and the outbound-message inference path firing in parallel.
 *
 * Failure mode: any error is thrown back to the caller, which logs + reports
 * to Sentry but does not block the rest of the acceptance flow.
 */
async function dispatchInviteThenMessageFollowUp(
  supabase: SupabaseClient<Database>,
  args: {
    campaignJobId: string;
    prospectId: string;
    providerId: string;
    accountId: string;
    chatId: string | null;
    userId: string;
  }
): Promise<boolean> {
  // Dedupe — a previous webhook (or the outbound-inference path) may already
  // have triggered this follow-up. The pair (campaign_job_id, prospect_id) is
  // the natural key.
  const { data: existing } = await supabase
    .from("prospect_activity")
    .select("id")
    .eq("action", "linkedin_message_outbound")
    .eq("campaign_job_id", args.campaignJobId)
    .eq("prospect_id", args.prospectId)
    .limit(1)
    .maybeSingle();
  if (existing) return false;

  const { data: job } = await supabase
    .from("campaign_jobs")
    .select("organization_id, message_template, metadata, type")
    .eq("id", args.campaignJobId)
    .single();
  if (!job || job.type !== "invite_then_message") return false;
  const template = (job.message_template ?? "").trim();
  if (!template) return false;

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email")
    .eq("id", args.prospectId)
    .maybeSingle();
  if (!prospect) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_public_path, booking_slug")
    .eq("id", args.userId)
    .maybeSingle();
  const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
  const bookingLink = profile
    ? buildBookingPublicUrlForProfile(appUrl, profile)
    : null;

  const meta = (job.metadata as
    | { message_overrides?: Record<string, string> }
    | null) ?? null;
  const override = meta?.message_overrides?.[args.prospectId]?.trim();
  const text =
    override && override.length > 0
      ? override
      : applyMessageVariables(template, prospect, { bookingLink });

  // Optional single-file attachment, mirroring the `contact` campaign path.
  // A failed download throws — the caller logs + reports to Sentry and a later
  // acceptance signal / reconciler can retry (dedupe guards against doubles).
  const attachment = readCampaignAttachment(job.metadata);
  const attachmentFile = attachment
    ? await downloadCampaignAttachment(supabase, attachment)
    : null;

  // Send via /chats — LinkedIn opens the thread and posts the message in the
  // same call. Same wire shape as a `contact`-type campaign send.
  const chatRes = await sendLinkedInChatMessage({
    accountId: args.accountId,
    providerId: args.providerId,
    text,
    attachment: attachmentFile,
  });
  const newChatId = chatRes?.id ?? args.chatId ?? null;

  if (newChatId) {
    await supabase.from("unipile_chat_prospects").upsert(
      {
        prospect_id: args.prospectId,
        unipile_chat_id: newChatId,
        organization_id: job.organization_id,
      },
      { onConflict: "prospect_id,unipile_chat_id" }
    );
  }

  await insertProspectActivity(supabase, {
    organization_id: job.organization_id,
    prospect_id: args.prospectId,
    actor_id: args.userId,
    campaign_job_id: args.campaignJobId,
    action: "linkedin_message_outbound",
    details: {
      message: text.length > 500 ? `${text.slice(0, 499)}…` : text,
      campaign_job_id: args.campaignJobId,
      phase: "invite_then_message_followup",
      chat_id: newChatId,
    },
  });

  // Daily contact counter — keeps the dashboard's "messages sent today"
  // widget consistent with the contact campaign path.
  void incrementUsageCounter(
    supabase,
    args.userId,
    "linkedin_contact",
    dailyPeriodKey()
  );

  return true;
}
