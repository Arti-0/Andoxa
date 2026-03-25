import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";
import { processCampaignJobBatch } from "@/lib/campaigns/process-job-batch";

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

    const result = await processCampaignJobBatch(ctx.supabase, jobId, {
      organizationId: ctx.workspaceId,
      bypassDelay: true,
    });

    if (!result.ok) {
      if (result.code === "not_found" || result.code === "wrong_workspace") {
        throw Errors.notFound("Campaign job");
      }
      throw Errors.badRequest(result.message);
    }

    if (result.skipped) {
      if (result.reason === "locked") {
        return {
          message: "Un traitement est déjà en cours pour cette campagne",
          processed: 0,
          success: 0,
          errors: 0,
          remaining: true,
          skipped: true,
        };
      }
      if (result.reason === "no_account") {
        throw Errors.badRequest(
          "Connectez votre compte LinkedIn depuis la page Installation pour activer cette fonctionnalité."
        );
      }
      return {
        message: "Batch ignoré",
        processed: 0,
        success: 0,
        errors: 0,
        remaining: true,
        skipped: true,
      };
    }

    return {
      processed: result.processed,
      success: result.success,
      errors: result.errors,
      remaining: result.remaining,
      message: result.message,
    };
  },
  { rateLimit: { name: "campaign-process", requests: 10, window: "1 m" } }
);
