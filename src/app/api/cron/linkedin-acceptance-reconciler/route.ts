import { NextResponse } from "next/server";
import { timingSafeEqualStr } from "@/lib/security/timing-safe-equal";
import * as Sentry from "@sentry/nextjs";

import { createServiceClient } from "@/lib/supabase/service";
import { captureRouteError } from "@/lib/sentry/route-error";
import { unipileFetch } from "@/lib/unipile/client";
import { recordLinkedInInviteAccepted } from "@/lib/linkedin/record-invite-accepted";

/**
 * POST /api/cron/linkedin-acceptance-reconciler  (Vercel Cron, every 30 min)
 *
 * Safety net for the Unipile new_relation webhook. Webhooks miss for many
 * reasons (LinkedIn rate-limits Unipile's polling, network drops, Unipile
 * outages, our endpoint returning 5xx and exhausting retries) — without a
 * reconciler, an invite that gets accepted silently never moves the CRM
 * forward.
 *
 * Approach per tick:
 *   1. Find LinkedIn accounts that have pending campaign invites (i.e.
 *      `linkedin_invite_sent` activity rows in the last 14 days with no
 *      paired `linkedin_invite_accepted`).
 *   2. For each such account, sample the user's most recent relations via
 *      Unipile (small page — we don't want to hammer the API).
 *   3. Cross-reference each relation's provider_id against pending invites.
 *      Matches go through recordLinkedInInviteAccepted, which dedupes
 *      against existing acceptance rows.
 *
 * Per Unipile guidance, we cap concurrency and stagger by account.
 * Idempotent: a duplicate run is a no-op (helper dedupes).
 */

const MAX_ACCOUNTS_PER_TICK = 20;
const RELATIONS_SAMPLE_LIMIT = 50;
const PENDING_INVITE_LOOKBACK_DAYS = 14;
const INTER_ACCOUNT_DELAY_MS = 250;

type RelationsResponse = {
  object?: string;
  items?: Array<{ provider_id?: string; id?: string; member_id?: string }>;
};

function providerIdFromRelation(
  item: NonNullable<RelationsResponse["items"]>[number]
): string | null {
  const raw = item.provider_id ?? item.id ?? item.member_id ?? null;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

async function reconcileOneAccount(
  supabase: ReturnType<typeof createServiceClient>,
  account: { user_id: string; unipile_account_id: string }
): Promise<{ matched: number; sampled: number; error?: string }> {
  // Pull a sample of recent relations from Unipile.
  let sample: RelationsResponse;
  try {
    sample = await unipileFetch<RelationsResponse>(
      `/users/relations?account_id=${encodeURIComponent(
        account.unipile_account_id
      )}&limit=${RELATIONS_SAMPLE_LIMIT}`
    );
  } catch (err) {
    return { matched: 0, sampled: 0, error: (err as Error).message };
  }

  const providers = (sample.items ?? [])
    .map(providerIdFromRelation)
    .filter((p): p is string => p != null);

  if (!providers.length) return { matched: 0, sampled: 0 };

  // Filter to providers that actually correspond to a pending invite from
  // this account. We could call the helper for every relation, but that's
  // wasteful — the helper's invite lookup is per-call. Batch-check first.
  const sinceIso = new Date(
    Date.now() - PENDING_INVITE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: pendingInvites } = await supabase
    .from("prospect_activity")
    .select("prospect_id, details")
    .eq("action", "linkedin_invite_sent")
    .filter("details->>account_id", "eq", account.unipile_account_id)
    .gte("created_at", sinceIso);

  const pendingProviders = new Set<string>();
  for (const inv of pendingInvites ?? []) {
    const pid = (inv.details as { provider_id?: string } | null)?.provider_id;
    if (pid) pendingProviders.add(pid);
  }

  if (!pendingProviders.size) {
    return { matched: 0, sampled: providers.length };
  }

  let matched = 0;
  for (const providerId of providers) {
    if (!pendingProviders.has(providerId)) continue;
    try {
      const result = await recordLinkedInInviteAccepted(supabase, {
        userId: account.user_id,
        providerId,
        accountId: account.unipile_account_id,
        source: "reconciler",
      });
      if (result.inserted > 0) matched += 1;
    } catch (err) {
      console.error("[acceptance-reconciler] record:", err);
      Sentry.captureException(err);
    }
  }

  return { matched, sampled: providers.length };
}

export async function POST(req: Request) {
  const route = "api/cron/linkedin-acceptance-reconciler";
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      captureRouteError(route, new Error("CRON_SECRET not configured"), {
        extra: { step: "auth" },
      });
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!auth || !timingSafeEqualStr(auth, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const sinceIso = new Date(
      Date.now() - PENDING_INVITE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // Pick distinct unipile account_ids that have at least one pending
    // invite in the lookback window. We can't do a clean DISTINCT through
    // PostgREST on a JSON path, so we read recent invite rows and project
    // to a unique set client-side. Bounded by MAX_ACCOUNTS_PER_TICK * a
    // reasonable invite-per-account fanout — fine at current scale.
    const { data: inviteRows, error: scanErr } = await supabase
      .from("prospect_activity")
      .select("details")
      .eq("action", "linkedin_invite_sent")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(500);

    if (scanErr) {
      captureRouteError(route, scanErr, { extra: { step: "scan_invites" } });
      return NextResponse.json({ error: scanErr.message }, { status: 500 });
    }

    const accountIds = new Set<string>();
    for (const row of inviteRows ?? []) {
      const aid = (row.details as { account_id?: string } | null)?.account_id;
      if (aid) accountIds.add(aid);
      if (accountIds.size >= MAX_ACCOUNTS_PER_TICK) break;
    }

    if (!accountIds.size) {
      return NextResponse.json({ ok: true, processed: 0, results: [] });
    }

    const { data: accounts } = await supabase
      .from("user_unipile_accounts")
      .select("user_id, unipile_account_id, status, account_type")
      .in("unipile_account_id", Array.from(accountIds))
      .eq("account_type", "LINKEDIN")
      .eq("status", "connected");

    const results: Array<{
      accountId: string;
      matched: number;
      sampled: number;
      error?: string;
    }> = [];

    for (const acc of accounts ?? []) {
      const r = await reconcileOneAccount(supabase, {
        user_id: acc.user_id as string,
        unipile_account_id: acc.unipile_account_id as string,
      });
      results.push({
        accountId: acc.unipile_account_id as string,
        ...r,
      });
      // Stagger calls to Unipile (per their guidance) — small delay
      // between accounts is enough at this scale.
      if (INTER_ACCOUNT_DELAY_MS > 0) {
        await new Promise((res) => setTimeout(res, INTER_ACCOUNT_DELAY_MS));
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      totalMatched: results.reduce((s, r) => s + r.matched, 0),
      results,
    });
  } catch (err) {
    captureRouteError(route, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Vercel Cron invokes with GET — same handler, same Bearer auth.
export async function GET(req: Request) {
  return POST(req);
}
