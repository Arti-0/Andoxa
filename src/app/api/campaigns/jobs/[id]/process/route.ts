import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";
import { env } from "@/lib/config/environment";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { applyMessageVariables, extractLinkedInSlug } from "@/lib/unipile/campaign";
import type { UnipileChat } from "@/lib/unipile/types";

function extractJobId(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const processIdx = parts.indexOf("process");
  return processIdx > 0 ? parts[processIdx - 1] : parts[parts.length - 2];
}

/**
 * POST /api/campaigns/jobs/[id]/process
 * Process one batch of prospects for a campaign job
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
    const jobId = extractJobId(req);

    const { data: job, error: jobError } = await ctx.supabase
      .from("campaign_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("organization_id", ctx.workspaceId)
      .single();

    if (jobError || !job) throw Errors.notFound("Campaign job");
    if (job.status !== "running" && job.status !== "pending") {
      return { message: "Job is not running", status: job.status };
    }

    if (job.status === "pending") {
      await ctx.supabase
        .from("campaign_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    const { data: pendingProspects } = await ctx.supabase
      .from("campaign_job_prospects")
      .select("id, prospect_id")
      .eq("job_id", jobId)
      .eq("status", "pending")
      .limit(job.batch_size);

    if (!pendingProspects?.length) {
      await ctx.supabase
        .from("campaign_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return { message: "Job completed", processed: 0 };
    }

    const prospectIds = pendingProspects.map((p) => p.prospect_id);
    const { data: prospects } = await ctx.supabase
      .from("prospects")
      .select("id, full_name, company, job_title, phone, email, linkedin")
      .in("id", prospectIds);

    const prospectMap = new Map((prospects ?? []).map((p) => [p.id, p]));
    const accountId = await getAccountIdForUser(ctx);
    const messageTemplate = job.message_template ?? "";

    let bookingLink: string | null = null;
    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("booking_slug")
      .eq("id", ctx.userId)
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
        await ctx.supabase
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
        await ctx.supabase
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
        await ctx.supabase
          .from("campaign_job_prospects")
          .update({ status: "processing" })
          .eq("id", cjp.id);

        const profileRes = await unipileFetch<{ provider_id?: string }>(
          `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
        );
        const providerId = (profileRes as { provider_id?: string })?.provider_id;
        if (!providerId) throw new Error("Could not resolve LinkedIn profile");

        const text = applyMessageVariables(messageTemplate, prospect, { bookingLink });

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
            await ctx.supabase.from("unipile_chat_prospects").upsert(
              {
                prospect_id: cjp.prospect_id,
                unipile_chat_id: chatId,
                organization_id: ctx.workspaceId,
              },
              { onConflict: "prospect_id,unipile_chat_id" }
            );
          }
        }

        await ctx.supabase
          .from("campaign_job_prospects")
          .update({
            status: "success",
            processed_at: new Date().toISOString(),
          })
          .eq("id", cjp.id);
        batchSuccess++;
      } catch (err) {
        const msg = err instanceof UnipileApiError ? err.message : String(err);
        await ctx.supabase
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

    await ctx.supabase
      .from("campaign_jobs")
      .update({
        processed_count: (job.processed_count ?? 0) + batchSuccess + batchError,
        success_count: (job.success_count ?? 0) + batchSuccess,
        error_count: (job.error_count ?? 0) + batchError,
      })
      .eq("id", jobId);

    const { data: remainingCheck } = await ctx.supabase
      .from("campaign_job_prospects")
      .select("id")
      .eq("job_id", jobId)
      .eq("status", "pending")
      .limit(1);

    if (!remainingCheck?.length) {
      await ctx.supabase
        .from("campaign_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return {
      processed: batchSuccess + batchError,
      success: batchSuccess,
      errors: batchError,
      remaining: remainingCheck?.length ? true : false,
    };
  },
  { rateLimit: { name: "campaign-process", requests: 10, window: "1 m" } }
);
