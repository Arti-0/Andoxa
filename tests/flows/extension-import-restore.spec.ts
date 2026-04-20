/**
 * Phase A regression: import → trash → re-import restores the prospect.
 *
 * This test calls the API directly (no browser extension) to simulate the
 * same code path the extension uses: POST /api/prospects/import.
 */

import { test, expect } from "@playwright/test";
import {
  supabaseAdmin,
  resetTestOrg,
  seedList,
  seedProspect,
} from "../helpers/seed";
import { TEST_ORG_ID } from "../helpers/auth";

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";

test.describe("Extension import — trash restore", () => {
  let listId: string;
  let token: string;

  test.beforeAll(async () => {
    await resetTestOrg();
    const list = await seedList("Test Import Restore");
    listId = list.id;

    // Get an extension token via the API (requires a running dev server)
    const res = await fetch(`${BASE_URL}/api/extension/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.ANDOXA_TEST_EMAIL ?? "test@andoxa.dev",
        password: process.env.ANDOXA_TEST_PASSWORD ?? "AndoxaTest2026!",
      }),
    });
    if (res.ok) {
      const j = await res.json();
      token = j.token ?? j.data?.token ?? "";
    }
  });

  test("re-importing a trashed prospect restores it", async ({ request }) => {
    if (!token) test.skip();

    const linkedinUrl = "https://linkedin.com/in/test-restore-prospect";

    // 1. Import the prospect for the first time
    const importPayload = {
      bdd_id: listId,
      prospects: [
        {
          full_name: "Test Restore Prospect",
          linkedin: linkedinUrl,
          company: "Test Corp",
        },
      ],
    };

    const import1 = await request.post(`${BASE_URL}/api/prospects/import`, {
      data: importPayload,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(import1.ok()).toBeTruthy();
    const result1 = await import1.json();
    const r1 = result1.data ?? result1;
    expect(r1.created).toBe(1);

    // Find the prospect ID
    const { data: prospects } = await supabaseAdmin
      .from("prospects")
      .select("id, deleted_at")
      .eq("organization_id", TEST_ORG_ID)
      .eq("linkedin", linkedinUrl)
      .is("deleted_at", null)
      .limit(1);

    expect(prospects?.length).toBe(1);
    const prospectId = prospects![0].id;

    // 2. Soft-delete the prospect
    await supabaseAdmin
      .from("prospects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", prospectId);

    // 3. Re-import
    const import2 = await request.post(`${BASE_URL}/api/prospects/import`, {
      data: importPayload,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(import2.ok()).toBeTruthy();
    const result2 = await import2.json();
    const r2 = result2.data ?? result2;
    expect(r2.restored).toBe(1);
    expect(r2.created).toBe(0);

    // 4. Verify the prospect is live again
    const { data: restored } = await supabaseAdmin
      .from("prospects")
      .select("id, deleted_at, bdd_id")
      .eq("id", prospectId)
      .single();

    expect(restored?.deleted_at).toBeNull();
    expect(restored?.bdd_id).toBe(listId);
  });
});
