import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  pickDueWorkflowExecution,
  processWorkflowStepExecution,
  resetStaleProcessingExecutions,
} from "@/lib/workflows";
import { captureRouteError } from "@/lib/sentry/route-error";

const MAX_PER_RUN = 8;

/**
 * POST /api/cron/workflow-steps
 * Processes due workflow step executions (Vercel Cron + CRON_SECRET).
 */
export async function POST(req: Request) {
  const route = "api/cron/workflow-steps";
  try {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const results: { executionId: string; outcome: string }[] = [];

  await resetStaleProcessingExecutions(supabase);

  for (let i = 0; i < MAX_PER_RUN; i++) {
    const executionId = await pickDueWorkflowExecution(supabase);
    if (!executionId) break;

    const result = await processWorkflowStepExecution(supabase, executionId);
    results.push({
      executionId,
      outcome:
        result.outcome === "processed"
          ? "processed"
          : result.outcome === "skipped"
            ? `skipped_${result.reason}`
            : `error_${result.message?.slice(0, 80) ?? "unknown"}`,
    });
  }

  return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    captureRouteError(route, error, { extra: { step: "unhandled" } });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
