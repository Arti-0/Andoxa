/**
 * Audit user_unipile_accounts for duplicate rows (post–Sprint 5 verification).
 *
 * Run from repo root (loads .env / .env.local if present when using bun):
 *   bun run scripts/audit-unipile-duplicates.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 */

import { createClient } from "@supabase/supabase-js";

type Row = {
  user_id: string;
  unipile_account_id: string;
  account_type: string;
};

function providerLabel(accountType: string): "linkedin" | "whatsapp" | string {
  const u = accountType.toUpperCase();
  if (u === "LINKEDIN") return "linkedin";
  if (u === "WHATSAPP") return "whatsapp";
  return accountType.toLowerCase();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !key) {
    console.error(
      JSON.stringify(
        {
          error:
            "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("user_unipile_accounts")
    .select("user_id, unipile_account_id, account_type");

  if (error) {
    console.error(JSON.stringify({ error: error.message, details: error }, null, 2));
    process.exit(1);
  }

  const list = (rows ?? []) as Row[];

  // (user_id, provider) -> unipile_account_ids
  const byUserProvider = new Map<string, string[]>();
  for (const r of list) {
    const provider = providerLabel(r.account_type);
    const keyMap = `${r.user_id}::${provider}`;
    const arr = byUserProvider.get(keyMap) ?? [];
    arr.push(r.unipile_account_id);
    byUserProvider.set(keyMap, arr);
  }

  const users_with_duplicates: Array<{
    user_id: string;
    provider: string;
    account_ids: string[];
  }> = [];

  for (const [k, account_ids] of byUserProvider) {
    if (account_ids.length <= 1) continue;
    const [user_id, provider] = k.split("::");
    users_with_duplicates.push({
      user_id,
      provider,
      account_ids: [...account_ids],
    });
  }

  // unipile_account_id -> distinct user_ids + row count
  const byAccountId = new Map<string, { user_ids: Set<string>; rowCount: number }>();
  for (const r of list) {
    const cur = byAccountId.get(r.unipile_account_id) ?? {
      user_ids: new Set<string>(),
      rowCount: 0,
    };
    cur.user_ids.add(r.user_id);
    cur.rowCount += 1;
    byAccountId.set(r.unipile_account_id, cur);
  }

  const shared_account_ids: Array<{
    unipile_account_id: string;
    user_ids: string[];
  }> = [];

  for (const [unipile_account_id, { user_ids, rowCount }] of byAccountId) {
    if (rowCount <= 1) continue;
    shared_account_ids.push({
      unipile_account_id,
      user_ids: [...user_ids],
    });
  }

  const report = {
    users_with_duplicates,
    shared_account_ids,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: String(e) }, null, 2));
  process.exit(1);
});
