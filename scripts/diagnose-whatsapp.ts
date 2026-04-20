/**
 * Diagnose WhatsApp campaign send issues.
 *
 * Run from repo root:
 *   bun run scripts/diagnose-whatsapp.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log("\n=== 1. WhatsApp accounts (user_unipile_accounts) ===");
  const { data: accounts, error: accErr } = await supabase
    .from("user_unipile_accounts")
    .select("id, user_id, account_type, provider_account_id, created_at")
    .eq("account_type", "WHATSAPP");

  if (accErr) {
    console.error("  Error:", accErr.message);
  } else if (!accounts?.length) {
    console.log(
      "  ⚠  No WHATSAPP accounts found — campaigns will silently skip all prospects."
    );
  } else {
    console.table(accounts);
  }

  console.log("\n=== 2. Latest WhatsApp campaign jobs ===");
  const { data: jobs, error: jobErr } = await supabase
    .from("campaign_jobs")
    .select("id, type, status, total_count, processed_count, created_at, created_by")
    .eq("type", "whatsapp")
    .order("created_at", { ascending: false })
    .limit(5);

  if (jobErr) {
    console.error("  Error:", jobErr.message);
  } else if (!jobs?.length) {
    console.log("  No WhatsApp campaign jobs found yet.");
  } else {
    console.table(jobs);

    // Prospect-level breakdown for the latest job
    const latestJobId = jobs[0].id;
    console.log(`\n=== 3. Prospect status breakdown for job ${latestJobId} ===`);
    const { data: prospects, error: pErr } = await supabase
      .from("campaign_job_prospects")
      .select("status, count:status")
      .eq("job_id", latestJobId);

    if (pErr) {
      console.error("  Error:", pErr.message);
    } else {
      // Manual group-by
      const counts: Record<string, number> = {};
      for (const row of prospects ?? []) {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
      }
      console.table(counts);

      // Check how many have a phone number
      const { data: prospectsWithPhone } = await supabase
        .from("campaign_job_prospects")
        .select("prospect_id, prospects!inner(phone)")
        .eq("job_id", latestJobId)
        .not("prospects.phone", "is", null);

      const total = (prospects ?? []).length;
      const withPhone = (prospectsWithPhone ?? []).length;
      console.log(
        `  ${withPhone}/${total} prospects have a phone number.`
      );
      if (withPhone === 0) {
        console.log(
          "  ⚠  No prospects with phone — all sends will be skipped."
        );
      }
    }
  }

  console.log("\n=== 4. Cron configuration check ===");
  console.log(
    "  Check vercel.json → /api/cron/campaign-jobs should run every minute."
  );
  console.log(
    "  Also verify CRON_SECRET env var is set in Vercel project settings."
  );

  console.log("\n=== 5. Summary ===");
  const hasAccounts = (accounts?.length ?? 0) > 0;
  if (!hasAccounts) {
    console.log(
      "  ROOT CAUSE: No WhatsApp account connected. Ask user to connect WhatsApp in settings."
    );
  } else {
    console.log(
      "  WhatsApp accounts found. Check logs for Unipile API errors and verify cron is firing."
    );
  }
}

run().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
