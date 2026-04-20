/**
 * Phase E regression: POST /api/campaigns/jobs with launch_now=true creates job in pending status.
 */

import { test, expect } from "@playwright/test";
import { resetTestOrg, seedList, seedProspect } from "../helpers/seed";

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";

test.describe("Campaign one-click launch", () => {
  let token: string;
  let prospectId: string;

  test.beforeAll(async () => {
    await resetTestOrg();
    const list = await seedList("Launch Test List");
    const prospect = await seedProspect({
      full_name: "Launch Test Prospect",
      linkedin: "https://linkedin.com/in/launch-test",
      bdd_id: list.id,
    });
    prospectId = prospect.id;

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

  test("launch_now=true creates job with pending status", async ({ request }) => {
    if (!token) test.skip();

    const res = await request.post(`${BASE_URL}/api/campaigns/jobs`, {
      data: {
        type: "invite",
        prospect_ids: [prospectId],
        message_template: "Bonjour {{firstName}} !",
        launch_now: true,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const job = json.data ?? json;
    expect(job.status).toBe("pending");
  });

  test("launch_now=false (default) creates job with draft status", async ({ request }) => {
    if (!token) test.skip();

    const res = await request.post(`${BASE_URL}/api/campaigns/jobs`, {
      data: {
        type: "invite",
        prospect_ids: [prospectId],
        message_template: "Bonjour {{firstName}} !",
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const job = json.data ?? json;
    expect(job.status).toBe("draft");
  });
});
