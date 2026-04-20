/**
 * Seed helpers for Playwright tests.
 *
 * Uses Supabase service-role key to bypass RLS and create/reset test data.
 * All helpers are idempotent — safe to call in beforeEach.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *   ANDOXA_TEST_ORG_ID (defaults to 00000000-0000-0000-0000-000000000001)
 *   ANDOXA_TEST_EMAIL / ANDOXA_TEST_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";
import { TEST_EMAIL, TEST_PASSWORD, TEST_ORG_ID } from "./auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!;

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Ensure the test user exists; return their user id */
export async function ensureTestUser(): Promise<string> {
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === TEST_EMAIL);
  if (found) return found.id;

  const { data: created, error } =
    await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Test User" },
    });

  if (error || !created.user)
    throw new Error(`seed: could not create test user — ${error?.message}`);
  return created.user.id;
}

/** Delete all prospects + lists in the test org, then recreate known fixtures */
export async function resetTestOrg() {
  // Hard-delete trashed + live prospects
  await supabaseAdmin
    .from("prospects")
    .delete()
    .eq("organization_id", TEST_ORG_ID);

  // Delete lists
  await supabaseAdmin.from("bdd").delete().eq("organization_id", TEST_ORG_ID);
}

export async function seedList(name: string) {
  const userId = await ensureTestUser();
  const { data, error } = await supabaseAdmin
    .from("bdd")
    .insert({
      name,
      organization_id: TEST_ORG_ID,
      proprietaire: userId,
      source: "manual",
    })
    .select("id, name")
    .single();

  if (error || !data)
    throw new Error(`seed: could not create list "${name}" — ${error?.message}`);
  return data;
}

export async function seedProspect(opts: {
  full_name: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  bdd_id?: string | null;
  deleted_at?: string | null;
}) {
  const userId = await ensureTestUser();
  const { data, error } = await supabaseAdmin
    .from("prospects")
    .insert({
      full_name: opts.full_name,
      organization_id: TEST_ORG_ID,
      proprietaire: userId,
      source: "manual",
      linkedin: opts.linkedin ?? null,
      email: opts.email ?? null,
      phone: opts.phone ?? null,
      bdd_id: opts.bdd_id ?? null,
      deleted_at: opts.deleted_at ?? null,
    })
    .select("id, full_name, bdd_id, deleted_at")
    .single();

  if (error || !data)
    throw new Error(
      `seed: could not create prospect "${opts.full_name}" — ${error?.message}`
    );
  return data;
}
