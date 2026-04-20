import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enrichProspectFromUnipile } from "@/lib/enrichment/unipile-enrich";
import { getLinkedInAccountIdForUserId } from "@/lib/unipile/account";
import { captureRouteError } from "@/lib/sentry/route-error";

const MAX_JOBS_PER_RUN = 3;
const BASE_DELAY_MS = 3000;

function jitterMs(): number {
  return BASE_DELAY_MS + Math.floor(Math.random() * 5000);
}

function backoffSeconds(attempts: number): number {
  return Math.min(900, Math.pow(2, Math.min(attempts, 8)) * 15);
}

/**
 * POST /api/cron/enrichment-jobs
 * Vercel Cron: processes pending LinkedIn enrichment jobs (Pro opt-in imports).
 */
export async function POST(req: Request) {
  const route = "api/cron/enrichment-jobs";
  try {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const results: { id: string; outcome: string }[] = [];

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const { data: candidate } = await supabase
      .from("enrichment_jobs")
      .select("id, organization_id, prospect_id, requested_by_user_id, attempts, max_attempts")
      .eq("status", "pending")
      .lte("run_after", nowIso)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!candidate) break;

    const { data: claimed, error: claimErr } = await supabase
      .from("enrichment_jobs")
      .update({
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) continue;

    const accountId = await getLinkedInAccountIdForUserId(
      supabase,
      candidate.requested_by_user_id
    );
    if (!accountId) {
      await supabase
        .from("enrichment_jobs")
        .update({
          status: "failed",
          last_error: "Aucun compte LinkedIn connecté pour l'utilisateur ayant importé",
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);
      results.push({ id: candidate.id, outcome: "failed_no_account" });
      continue;
    }

    const enrich = await enrichProspectFromUnipile({
      supabase,
      organizationId: candidate.organization_id,
      prospectId: candidate.prospect_id,
      accountId,
    });

    if (enrich.ok) {
      await supabase
        .from("enrichment_jobs")
        .update({
          status: "completed",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);
      results.push({ id: candidate.id, outcome: "completed" });
    } else {
      const nextAttempts = candidate.attempts + 1;
      const failed = nextAttempts >= candidate.max_attempts;
      const runAfter = new Date(
        Date.now() + backoffSeconds(nextAttempts) * 1000
      ).toISOString();

      await supabase
        .from("enrichment_jobs")
        .update({
          status: failed ? "failed" : "pending",
          attempts: nextAttempts,
          last_error: enrich.error.slice(0, 2000),
          run_after: failed ? nowIso : runAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);

      results.push({
        id: candidate.id,
        outcome: failed ? "failed_max" : "retry_scheduled",
      });

      if (enrich.retryable && !failed) {
        await new Promise((r) => setTimeout(r, jitterMs()));
      }
    }

    await new Promise((r) => setTimeout(r, jitterMs()));
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

/** Vercel Cron invokes GET by default on some plans. */
export async function GET(req: Request) {
  return POST(req);
}
