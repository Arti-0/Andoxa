import { createApiHandler, Errors } from "@/lib/api";
import type { NextRequest } from "next/server";
import {
  ensureUnipileAccountUsable,
  UnipileAccountUnusableError,
} from "@/lib/unipile/account-status";

function extractJobId(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("retry-errors");
  return i > 0 ? (parts[i - 1] ?? null) : null;
}

/**
 * POST /api/campaigns/jobs/[id]/retry-errors
 *
 * Re-queues the prospects that errored on a *finished* campaign. It does NOT
 * send anything itself — it simply flips the errored rows back to `pending` and
 * reopens the job, then hands control back to the campaign-jobs cron, which
 * drains them at the normal humanized pace (business hours + jittered cadence).
 * So a retry never bypasses or interferes with the LinkedIn pacer; the failed
 * actions just rejoin the queue.
 *
 * Only available once the job has settled (completed / failed) and has at least
 * one errored prospect.
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
    const jobId = extractJobId(req);
    if (!jobId) throw Errors.badRequest("ID requis");

    const { data: job, error: jobErr } = await ctx.supabase
      .from("campaign_jobs")
      .select("id, status, organization_id, type, created_by")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) throw Errors.notFound("Campaign job");
    if (job.organization_id !== ctx.workspaceId) throw Errors.forbidden();
    if (job.status !== "completed" && job.status !== "failed") {
      throw Errors.badRequest(
        "Le réessai n'est possible qu'une fois la campagne terminée.",
      );
    }

    const { data: errored } = await ctx.supabase
      .from("campaign_job_prospects")
      .select("id")
      .eq("job_id", jobId)
      .eq("status", "error");

    if (!errored?.length) {
      throw Errors.badRequest("Aucune action en erreur à réessayer.");
    }

    // Preflight the LinkedIn account so an obviously-disconnected account fails
    // fast with a clear "reconnect" message rather than silently re-queuing
    // actions that will only error again. This is a read — it never sends.
    const isLinkedInType =
      job.type === "invite" ||
      job.type === "invite_with_note" ||
      job.type === "invite_then_message" ||
      job.type === "contact";
    if (isLinkedInType) {
      try {
        await ensureUnipileAccountUsable(ctx.supabase, {
          userId: job.created_by ?? ctx.userId!,
          accountType: "LINKEDIN",
        });
      } catch (err) {
        if (err instanceof UnipileAccountUnusableError) {
          throw Errors.badRequest(err.localizedMessage);
        }
        throw err;
      }
    }

    // Flip every errored prospect back to pending, then reopen the job. The cron
    // owns the cadence from here — nothing is sent in this request.
    const ids = errored.map((r) => r.id);
    const { error: reqErr } = await ctx.supabase
      .from("campaign_job_prospects")
      .update({ status: "pending", error: null, processed_at: null })
      .in("id", ids);
    if (reqErr) throw Errors.internal("Impossible de remettre les actions en file");

    const { error: jobUpdErr } = await ctx.supabase
      .from("campaign_jobs")
      .update({ status: "pending" })
      .eq("id", jobId);
    if (jobUpdErr) throw Errors.internal("Impossible de relancer la campagne");

    return {
      ok: true as const,
      requeued: ids.length,
      message: `${ids.length} action${ids.length > 1 ? "s" : ""} ${
        ids.length > 1 ? "remises" : "remise"
      } en file. L'envoi suit le rythme habituel.`,
    };
  },
  { rateLimit: { name: "campaign-retry-errors", requests: 5, window: "1 m" } },
);
