import { createApiHandler, Errors } from "@/lib/api";
import type { NextRequest } from "next/server";
import {
  ensureUnipileAccountUsable,
  UnipileAccountUnusableError,
} from "@/lib/unipile/account-status";

function extractJobIdFromLaunchPath(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("launch");
  if (i > 0) return parts[i - 1] ?? null;
  return null;
}

/**
 * POST /api/campaigns/jobs/[id]/launch
 * Passe un job de draft → pending pour le cron / traitement batch.
 *
 * Preflight: rejects the launch when the user's LinkedIn account is in an
 * error state (or stale-connected and Unipile now reports broken). Catches
 * the case where the user drafted a job earlier, walked away, and now their
 * session has expired in the meantime.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const id = extractJobIdFromLaunchPath(req);
  if (!id) throw Errors.badRequest("ID requis");

  const { data: job, error: fetchErr } = await ctx.supabase
    .from("campaign_jobs")
    .select("id, status, organization_id, type, created_by")
    .eq("id", id)
    .single();

  if (fetchErr || !job) throw Errors.notFound("Campaign job");
  if (job.organization_id !== ctx.workspaceId) throw Errors.forbidden();
  if (job.status !== "draft") {
    throw Errors.badRequest(`Impossible de lancer un job en status '${job.status}'`);
  }

  const isLinkedInType =
    job.type === "invite" ||
    job.type === "invite_with_note" ||
    job.type === "contact";

  if (isLinkedInType) {
    try {
      // Check against the user who originally created the job — that's whose
      // LinkedIn account will be used to send (see process-job-batch.ts).
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

  const { error: updateErr } = await ctx.supabase
    .from("campaign_jobs")
    .update({ status: "pending" })
    .eq("id", id);

  if (updateErr) throw Errors.internal(updateErr.message);

  return { ok: true as const };
});
