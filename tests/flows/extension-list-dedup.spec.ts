/**
 * Phase A regression: duplicate list names are rejected / reused.
 */

import { test, expect } from "@playwright/test";
import { resetTestOrg } from "../helpers/seed";

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";

test.describe("BDD list dedup", () => {
  let token: string;

  test.beforeAll(async () => {
    await resetTestOrg();

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

  test("creating the same list name twice returns the existing list", async ({ request }) => {
    if (!token) test.skip();

    const headers = { Authorization: `Bearer ${token}` };

    const first = await request.post(`${BASE_URL}/api/bdd`, {
      data: { name: "Dedup Test List" },
      headers,
    });
    expect(first.ok()).toBeTruthy();
    const j1 = await first.json();
    const id1 = (j1.data ?? j1).id as string;

    const second = await request.post(`${BASE_URL}/api/bdd`, {
      data: { name: "dedup test list" }, // different case
      headers,
    });
    expect(second.ok()).toBeTruthy();
    const j2 = await second.json();
    const data2 = j2.data ?? j2;
    expect(data2.id).toBe(id1);
    expect(data2.reused).toBe(true);
  });

  test("list rename is rejected when another list has the same name", async ({ request }) => {
    if (!token) test.skip();

    const headers = { Authorization: `Bearer ${token}` };

    const a = await request.post(`${BASE_URL}/api/bdd`, {
      data: { name: "List Alpha" },
      headers,
    });
    const idA = ((await a.json()).data ?? (await a.json())).id as string;

    const b = await request.post(`${BASE_URL}/api/bdd`, {
      data: { name: "List Beta" },
      headers,
    });
    const idB = ((await b.json()).data ?? (await b.json())).id as string;

    // Try to rename B to "List Alpha" — should 409
    const rename = await request.patch(`${BASE_URL}/api/bdd/${idB}`, {
      data: { name: "List Alpha" },
      headers,
    });
    expect(rename.status()).toBe(409);
    void idA;
  });
});
