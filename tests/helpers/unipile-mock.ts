/**
 * Unipile API mock for Playwright tests.
 *
 * Intercepts all unipile.com routes so tests don't depend on the live API.
 * Call setupUnipileMock(page) in beforeEach.
 */

import type { Page } from "@playwright/test";

export async function setupUnipileMock(page: Page) {
  await page.route("**/unipile.com/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // POST /chats — create a new chat
    if (method === "POST" && url.includes("/chats")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ object: "Chat", id: "mock-chat-id" }),
      });
      return;
    }

    // POST /users/invite — send LinkedIn invite
    if (method === "POST" && url.includes("/users/invite")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ object: "Success" }),
      });
      return;
    }

    // GET /users — return empty list
    if (method === "GET" && url.includes("/users")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ object: "List", items: [] }),
      });
      return;
    }

    // Default: pass through (log unexpected calls)
    console.warn("[unipile-mock] unmocked request:", method, url);
    await route.continue();
  });
}
