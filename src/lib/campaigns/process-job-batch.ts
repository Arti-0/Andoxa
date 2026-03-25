import { env } from "@/lib/config/environment";
import { getLinkedInAccountIdForUserId } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { applyMessageVariables, extractLinkedInSlug } from "@/lib/unipile/campaign";
import type { UnipileChat } from "@/lib/unipile/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

const LOCK_STALE_SECONDS = 900;

export type ProcessCampaignJobBatchOptions = {
  /** User-triggered API: ignore delay_ms vs last_batch_at */
  bypassDelay?: boolean;
  /** When set, job must belong to this organization */
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

    return await runBatch(supabase, job);
  } finally {
    await supabase.rpc("campaign_release_batch_lock", { p_job_id: jobId });
  }
}

async function runBatch(
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
    return { ok: true, processed: 0, success: 0, errors: 0, remaining: false, message: "Job completed" };
  }

  const accountId = await getLinkedInAccountIdForUserId(supabase, job.created_by);
  if (!accountId) {
    return { ok: true, skipped: true, reason: "no_account" };
  }

  const prospectIds = pendingProspects.map((p) => p.prospect_id);
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email, linkedin")
    .in("id", prospectIds);

  const prospectMap = new Map((prospects ?? []).map((p) => [p.id, p]));
  const messageTemplate = job.message_template ?? "";
  const meta = job.metadata as { message_overrides?: Record<string, string> } | null;
  const messageOverrides = meta?.message_overrides ?? {};

  let bookingLink: string | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_slug")
    .eq("id", job.created_by)
    .single();
  if (profile?.booking_slug) {
    const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
    bookingLink = `${appUrl}/booking/${profile.booking_slug}`;
  }

  let batchSuccess = 0;
  let batchError = 0;

  for (const cjp of pendingProspects) {
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

      if (job.type === "invite") {
        await unipileFetch("/users/invite", {
          method: "POST",
          body: JSON.stringify({
            account_id: accountId,
            provider_id: providerId,
            message: text,
          }),
        });
      } else {
        const chatRes = await unipileFetch<UnipileChat & { id: string }>("/chats", {
          method: "POST",
          body: JSON.stringify({
            account_id: accountId,
            attendees_ids: [providerId],
            text,
          }),
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
    } catch (err) {
      const msg = err instanceof UnipileApiError ? err.message : String(err);
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

    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
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
  };
}
