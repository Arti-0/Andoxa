import { env } from "@/lib/config/environment";
import { buildBookingPublicUrlForProfile } from "@/lib/booking/public-path";
import {
  getLinkedInAccountIdForUserId,
  resolveWhatsAppAccountIdForOrganization,
} from "@/lib/unipile/account";
import {
  UnipileApiError,
  UnipileRateLimitError,
  unipileFetch,
} from "@/lib/unipile/client";
import { markUnipileAccountErroredFromError } from "@/lib/unipile/account-status";
import {
  applyMessageVariables,
  extractLinkedInSlug,
  sendLinkedInChatMessage,
  sendWhatsAppMessage,
} from "@/lib/unipile/campaign";
import { readCampaignAttachment, type CampaignJobType } from "@/lib/campaigns/types";
import { downloadCampaignAttachment } from "@/lib/campaigns/attachment";
import { normalizePhoneForWhatsApp } from "@/lib/utils/phone";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import {
  dailyPeriodKey,
  incrementUsageCounter,
  randomDelay,
  THROTTLE_MS,
  weeklyPeriodKey,
} from "./throttle";
import { insertProspectActivity } from "@/lib/prospect-activity";
import {
  consumeLinkedInInviteQuota,
  fetchLinkedInInviteWeeklyQuotaState,
} from "@/lib/linkedin/weekly-invite-quota";

const LOCK_STALE_SECONDS = 900;

/** Inline preview stored in prospect_activity.details (CRM timeline). */
function clipDetailMessage(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export type ProcessCampaignJobBatchOptions = {
  bypassDelay?: boolean;
  organizationId?: string | null;
};

export type ProcessCampaignJobBatchResult =
  | {
      ok: true;
      skipped?: false;
      processed: number;
      success: number;
      errors: number;
      remaining: boolean;
      message?: string;
      rateLimited?: boolean;
    }
  | { ok: true; skipped: true; reason: "locked" | "delay" | "no_account" }
  | { ok: false; code: "not_found" | "wrong_workspace" | "bad_status"; message: string };

type CampaignJobRow = Database["public"]["Tables"]["campaign_jobs"]["Row"];

export async function processCampaignJobBatch(
  supabase: SupabaseClient<Database>,
  jobId: string,
  options: ProcessCampaignJobBatchOptions = {}
): Promise<ProcessCampaignJobBatchResult> {
  const { data: job, error: jobError } = await supabase
    .from("campaign_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { ok: false, code: "not_found", message: "Campaign job" };
  }

  if (options.organizationId && job.organization_id !== options.organizationId) {
    return { ok: false, code: "wrong_workspace", message: "Campaign job" };
  }

  if (job.status !== "running" && job.status !== "pending") {
    return {
      ok: false,
      code: "bad_status",
      message: `Job is not running (${job.status})`,
    };
  }

  const { data: acquired, error: lockErr } = await supabase.rpc(
    "campaign_try_acquire_batch_lock",
    { p_job_id: jobId, p_stale_seconds: LOCK_STALE_SECONDS }
  );

  if (lockErr) {
    console.error("[campaign batch] lock rpc error", lockErr);
    return { ok: true, skipped: true, reason: "locked" };
  }

  if (!acquired) {
    return { ok: true, skipped: true, reason: "locked" };
  }

  try {
    if (!options.bypassDelay && job.last_batch_at) {
      const delayMs = job.delay_ms ?? 120_000;
      const elapsed = Date.now() - new Date(job.last_batch_at).getTime();
      if (elapsed < delayMs) {
        return { ok: true, skipped: true, reason: "delay" };
      }
    }

    return await dispatchBatch(supabase, job);
  } finally {
    await supabase.rpc("campaign_release_batch_lock", { p_job_id: jobId });
  }
}

async function dispatchBatch(
  supabase: SupabaseClient<Database>,
  job: CampaignJobRow
): Promise<ProcessCampaignJobBatchResult> {
  if (job.type === "whatsapp") {
    return runBatchWhatsApp(supabase, job);
  }
  return runBatchLinkedIn(supabase, job);
}

async function runBatchLinkedIn(
  supabase: SupabaseClient<Database>,
  job: CampaignJobRow
): Promise<ProcessCampaignJobBatchResult> {
  const jobId = job.id;

  if (job.status === "pending") {
    await supabase
      .from("campaign_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  const { data: pendingProspects } = await supabase
    .from("campaign_job_prospects")
    .select("id, prospect_id")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .limit(job.batch_size);

  if (!pendingProspects?.length) {
    await supabase
      .from("campaign_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        last_batch_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return {
      ok: true,
      processed: 0,
      success: 0,
      errors: 0,
      remaining: false,
      message: "Job completed",
    };
  }

  const accountId = await getLinkedInAccountIdForUserId(supabase, job.created_by);
  if (!accountId) {
    return { ok: true, skipped: true, reason: "no_account" };
  }

  const prospectIds = pendingProspects.map((p) => p.prospect_id);
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email, linkedin, metadata")
    .in("id", prospectIds);

  const prospectMap = new Map((prospects ?? []).map((p) => [p.id, p]));
  const messageTemplate = job.message_template ?? "";
  const meta = job.metadata as { message_overrides?: Record<string, string> } | null;
  const messageOverrides = meta?.message_overrides ?? {};

  let bookingLink: string | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_public_path, booking_slug")
    .eq("id", job.created_by)
    .single();
  if (profile) {
    const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
    bookingLink = buildBookingPublicUrlForProfile(appUrl, profile);
  }

  const { data: inboundRows } = await supabase
    .from("unipile_chat_prospects")
    .select("prospect_id")
    .eq("organization_id", job.organization_id)
    .in("prospect_id", prospectIds)
    .not("last_inbound_at", "is", null);

  const inboundReplyProspectIds = new Set(
    (inboundRows ?? []).map((r) => r.prospect_id)
  );

  // Invite-type batches go through atomic per-prospect consume below; we still
  // fetch the cap once so the per-iteration consume call knows the limit.
  // `invite_then_message` counts as an invite for quota purposes — the phase-1
  // wire call is a bare /users/invite. The phase-2 follow-up message is sent
  // from `record-invite-accepted.ts` when LinkedIn signals acceptance, and is
  // tracked under the daily linkedin_contact counter at that point.
  const weekKey = weeklyPeriodKey();
  const linkedInJobType = job.type as CampaignJobType;
  const isInviteBatch =
    linkedInJobType === "invite" ||
    linkedInJobType === "invite_with_note" ||
    linkedInJobType === "invite_then_message";
  const inviteCap = isInviteBatch
    ? (await fetchLinkedInInviteWeeklyQuotaState(supabase, job.created_by, weekKey))
        .cap
    : 0;

  // Single-file attachment — contact campaigns only (LinkedIn invitations
  // can't carry files). Downloaded once and reused across the whole batch.
  // A failed download is surfaced per-prospect below rather than dropping the
  // file silently.
  const attachment =
    linkedInJobType === "contact" ? readCampaignAttachment(job.metadata) : null;
  let attachmentFile: { blob: Blob; name: string } | null = null;
  let attachmentError: string | null = null;
  if (attachment) {
    try {
      attachmentFile = await downloadCampaignAttachment(supabase, attachment);
    } catch (err) {
      attachmentError =
        err instanceof Error ? err.message : "Pièce jointe indisponible";
    }
  }

  let batchSuccess = 0;
  let batchError = 0;
  let rateLimited = false;

  for (const cjp of pendingProspects) {
    if (inboundReplyProspectIds.has(cjp.prospect_id)) {
      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "skipped",
          error: "Skipped: prospect replied on LinkedIn",
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);
      batchError++;
      continue;
    }

    const prospect = prospectMap.get(cjp.prospect_id);
    if (!prospect || !prospect.linkedin) {
      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "skipped",
          error: "No LinkedIn URL",
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);
      batchError++;
      continue;
    }

    const slug = extractLinkedInSlug(prospect.linkedin);
    if (!slug) {
      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "error",
          error: "Invalid LinkedIn URL",
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);
      batchError++;
      continue;
    }

    // Atomic invite-quota reservation: must happen BEFORE the Unipile call.
    // Two concurrent batches for the same user no longer race past the cap.
    if (isInviteBatch) {
      const consumed = await consumeLinkedInInviteQuota(
        supabase,
        job.created_by,
        inviteCap,
        weekKey
      );
      if (!consumed.ok) {
        rateLimited = true;
        break;
      }
    }

    try {
      await supabase.from("campaign_job_prospects").update({ status: "processing" }).eq("id", cjp.id);

      const profileRes = await unipileFetch<{ provider_id?: string }>(
        `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
      );
      const providerId = (profileRes as { provider_id?: string })?.provider_id;
      if (!providerId) throw new Error("Could not resolve LinkedIn profile");

      const override = messageOverrides[cjp.prospect_id]?.trim();
      const text =
        override && override.length > 0
          ? override
          : applyMessageVariables(messageTemplate, prospect, { bookingLink });

      if (
        linkedInJobType === "invite" ||
        linkedInJobType === "invite_with_note" ||
        linkedInJobType === "invite_then_message"
      ) {
        const inviteBody: Record<string, unknown> = {
          account_id: accountId,
          provider_id: providerId,
        };
        // invite_then_message is a two-phase send: phase 1 is a bare invite
        // (no note attached), phase 2 fires from record-invite-accepted.ts
        // using the template stored on the job row.
        if (linkedInJobType === "invite_with_note" && text?.trim()) {
          inviteBody.message = text;
        }
        await unipileFetch("/users/invite", {
          method: "POST",
          body: JSON.stringify(inviteBody),
        });
      } else {
        if (attachment && !attachmentFile) {
          // Download failed during batch prep — mark this prospect as an error
          // instead of sending a message that references a missing file.
          throw new Error(attachmentError ?? "Pièce jointe indisponible");
        }
        const chatRes = await sendLinkedInChatMessage({
          accountId,
          providerId,
          text,
          attachment: attachmentFile,
        });
        const chatId = chatRes?.id;
        if (chatId) {
          await supabase.from("unipile_chat_prospects").upsert(
            {
              prospect_id: cjp.prospect_id,
              unipile_chat_id: chatId,
              organization_id: job.organization_id,
            },
            { onConflict: "prospect_id,unipile_chat_id" }
          );
        }
      }

      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "success",
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);
      batchSuccess++;

      if (
        linkedInJobType === "invite" ||
        linkedInJobType === "invite_with_note" ||
        linkedInJobType === "invite_then_message"
      ) {
        void insertProspectActivity(supabase, {
          organization_id: job.organization_id,
          prospect_id: cjp.prospect_id,
          actor_id: job.created_by,
          campaign_job_id: jobId,
          action: "linkedin_invite_sent",
          details: {
            message:
              linkedInJobType === "invite_with_note"
                ? clipDetailMessage(text ?? "", 500)
                : "",
            campaign_job_id: jobId,
            // Stored so the Unipile new_relation webhook can match the
            // acceptance back to this exact invite and emit
            // linkedin_invite_accepted with the right campaign_job_id.
            provider_id: providerId,
            account_id: accountId,
            // For invite_then_message we additionally pin the job type so
            // record-invite-accepted.ts can decide whether to dispatch a
            // follow-up message without re-fetching the campaign_jobs row.
            job_type: linkedInJobType,
          },
        });
      } else if (linkedInJobType === "contact") {
        void insertProspectActivity(supabase, {
          organization_id: job.organization_id,
          prospect_id: cjp.prospect_id,
          actor_id: job.created_by,
          campaign_job_id: jobId,
          action: "linkedin_message_outbound",
          details: {
            message: clipDetailMessage(text ?? "", 500),
            campaign_job_id: jobId,
          },
        });
      }

      // Note: linkedin_invite counter already incremented atomically above via
      // consumeLinkedInInviteQuota — do not increment again here.
      if (job.type === "contact") {
        void incrementUsageCounter(
          supabase,
          job.created_by,
          "linkedin_contact",
          dailyPeriodKey()
        );
      }
    } catch (err) {
      if (err instanceof UnipileRateLimitError) {
        await supabase
          .from("campaign_job_prospects")
          .update({
            status: "pending",
            error: null,
            processed_at: null,
          })
          .eq("id", cjp.id);
        rateLimited = true;
        break;
      }
      const msg = err instanceof UnipileApiError ? err.message : String(err);
      // If Unipile told us the account is broken (creds expired, disconnected,
      // etc.), flip user_unipile_accounts.status='error' so the in-app banner
      // appears even if the status webhook was missed. Best-effort, no throw.
      void markUnipileAccountErroredFromError(accountId, err);
      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "error",
          error: msg,
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);
      batchError++;
    }

    if (!rateLimited) {
      await randomDelay(THROTTLE_MS.linkedin.minDelay, THROTTLE_MS.linkedin.maxDelay);
    }
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("campaign_jobs")
    .update({
      processed_count: (job.processed_count ?? 0) + batchSuccess + batchError,
      success_count: (job.success_count ?? 0) + batchSuccess,
      error_count: (job.error_count ?? 0) + batchError,
      last_batch_at: nowIso,
    })
    .eq("id", jobId);

  const { data: remainingCheck } = await supabase
    .from("campaign_job_prospects")
    .select("id")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .limit(1);

  if (!remainingCheck?.length) {
    await supabase
      .from("campaign_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  return {
    ok: true,
    processed: batchSuccess + batchError,
    success: batchSuccess,
    errors: batchError,
    remaining: Boolean(remainingCheck?.length),
    ...(rateLimited
      ? {
          message: "rate_limited",
          rateLimited: true,
        }
      : {}),
  };
}

async function runBatchWhatsApp(
  supabase: SupabaseClient<Database>,
  job: CampaignJobRow
): Promise<ProcessCampaignJobBatchResult> {
  const jobId = job.id;

  if (job.status === "pending") {
    await supabase
      .from("campaign_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  const { data: pendingProspects } = await supabase
    .from("campaign_job_prospects")
    .select("id, prospect_id")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .limit(job.batch_size);

  if (!pendingProspects?.length) {
    await supabase
      .from("campaign_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        last_batch_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return {
      ok: true,
      processed: 0,
      success: 0,
      errors: 0,
      remaining: false,
      message: "Job completed",
    };
  }

  const accountId = await resolveWhatsAppAccountIdForOrganization(
    supabase,
    job.organization_id,
    job.created_by
  );
  if (!accountId) {
    return { ok: true, skipped: true, reason: "no_account" };
  }

  const prospectIds = pendingProspects.map((p) => p.prospect_id);
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email, metadata")
    .in("id", prospectIds);

  const prospectMap = new Map((prospects ?? []).map((p) => [p.id, p]));
  const messageTemplate = job.message_template ?? "";
  const meta = job.metadata as { message_overrides?: Record<string, string> } | null;
  const messageOverrides = meta?.message_overrides ?? {};

  let bookingLink: string | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_public_path, booking_slug")
    .eq("id", job.created_by)
    .single();
  if (profile) {
    const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
    bookingLink = buildBookingPublicUrlForProfile(appUrl, profile);
  }

  let batchSuccess = 0;
  let batchError = 0;
  let rateLimited = false;

  for (const cjp of pendingProspects) {
    const prospect = prospectMap.get(cjp.prospect_id);

    if (!prospect?.phone?.trim()) {
      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "skipped",
          error: "No phone number",
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);
      batchError++;
      continue;
    }

    // Normalised consistently with the workflow path: strips +/spaces, maps
    // 0033→33 and French local 0X→33X. Unipile WhatsApp needs this exact form.
    const phone = normalizePhoneForWhatsApp(prospect.phone);

    try {
      await supabase
        .from("campaign_job_prospects")
        .update({ status: "processing" })
        .eq("id", cjp.id);

      const override = messageOverrides[cjp.prospect_id]?.trim();
      const text =
        override && override.length > 0
          ? override
          : applyMessageVariables(messageTemplate, prospect, {
              bookingLink: bookingLink ?? undefined,
            });

      // multipart/form-data + WhatsApp JID — see sendWhatsAppMessage().
      const chatRes = await sendWhatsAppMessage({ accountId, phone, text });

      const chatId = chatRes?.id;
      if (chatId) {
        await supabase.from("unipile_chat_prospects").upsert(
          {
            prospect_id: cjp.prospect_id,
            unipile_chat_id: chatId,
            organization_id: job.organization_id,
          },
          { onConflict: "prospect_id,unipile_chat_id" }
        );
      }

      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "success",
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);

      void incrementUsageCounter(
        supabase,
        job.created_by,
        "whatsapp_new_chat",
        dailyPeriodKey()
      );

      void insertProspectActivity(supabase, {
        organization_id: job.organization_id,
        prospect_id: cjp.prospect_id,
        actor_id: job.created_by,
        campaign_job_id: jobId,
        action: "whatsapp_message_outbound",
        details: {
          message: clipDetailMessage(text ?? "", 500),
          campaign_job_id: jobId,
        },
      });

      batchSuccess++;
    } catch (err) {
      if (err instanceof UnipileRateLimitError) {
        await supabase
          .from("campaign_job_prospects")
          .update({ status: "pending", error: null, processed_at: null })
          .eq("id", cjp.id);
        rateLimited = true;
        break;
      }
      const msg = err instanceof UnipileApiError ? err.message : String(err);
      void markUnipileAccountErroredFromError(accountId, err);
      await supabase
        .from("campaign_job_prospects")
        .update({
          status: "error",
          error: msg,
          processed_at: new Date().toISOString(),
        })
        .eq("id", cjp.id);
      batchError++;
    }

    if (!rateLimited) {
      await randomDelay(THROTTLE_MS.whatsapp.minDelay, THROTTLE_MS.whatsapp.maxDelay);
    }
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("campaign_jobs")
    .update({
      processed_count: (job.processed_count ?? 0) + batchSuccess + batchError,
      success_count: (job.success_count ?? 0) + batchSuccess,
      error_count: (job.error_count ?? 0) + batchError,
      last_batch_at: nowIso,
    })
    .eq("id", jobId);

  const { data: remainingCheck } = await supabase
    .from("campaign_job_prospects")
    .select("id")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .limit(1);

  if (!remainingCheck?.length) {
    await supabase
      .from("campaign_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  return {
    ok: true,
    processed: batchSuccess + batchError,
    success: batchSuccess,
    errors: batchError,
    remaining: Boolean(remainingCheck?.length),
    ...(rateLimited ? { message: "rate_limited", rateLimited: true } : {}),
  };
}
