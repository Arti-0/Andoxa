import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processCampaignJobBatch } from "@/lib/campaigns/process-job-batch";

const MAX_JOBS_PER_RUN = 8;

/**
 * POST /api/cron/campaign-jobs
 * Processes due batches for running campaign jobs (so progress does not depend on an open browser tab).
 * Secured with CRON_SECRET when set (same pattern as enrichment-jobs).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const now = Date.now();
  const results: { jobId: string; outcome: string }[] = [];

  const { data: runningJobs, error: jobsError } = await supabase
    .from("campaign_jobs")
    .select("id, delay_ms, last_batch_at")
    .in("status", ["pending", "running"])
    .order("last_batch_at", { ascending: true, nullsFirst: true });

  if (jobsError) {
    console.error("[cron campaign-jobs] list jobs", jobsError);
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  let processedCount = 0;
  for (const row of runningJobs ?? []) {
    if (processedCount >= MAX_JOBS_PER_RUN) break;

    const { count: pendingCount, error: countErr } = await supabase
      .from("campaign_job_prospects")
      .select("id", { count: "exact", head: true })
      .eq("job_id", row.id)
      .eq("status", "pending");

    if (countErr || !pendingCount) continue;

    const delayMs = row.delay_ms ?? 120_000;
    if (row.last_batch_at) {
      const elapsed = now - new Date(row.last_batch_at).getTime();
      if (elapsed < delayMs) continue;
    }

    const result = await processCampaignJobBatch(supabase, row.id, {
      bypassDelay: false,
    });

    processedCount++;

    if (!result.ok) {
      results.push({ jobId: row.id, outcome: result.code });
      continue;
    }
    if (result.skipped) {
      results.push({ jobId: row.id, outcome: `skipped_${result.reason}` });
      continue;
    }
    results.push({
      jobId: row.id,
      outcome: `processed_${result.processed}_remaining_${result.remaining}`,
    });
  }

  return NextResponse.json({ checked: runningJobs?.length ?? 0, results });
}

export async function GET(req: Request) {
  return POST(req);
}
