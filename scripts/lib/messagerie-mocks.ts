import type { Page } from "@playwright/test";

const MOCK_CHAT_ID = "screenshot-chat-001";
const MOCK_PROSPECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/** Intercept Unipile-backed routes so messagerie renders without a live account. */
export async function installMessagerieMocks(page: Page): Promise<void> {
  await page.route("**/api/unipile/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          connected: true,
          account_id: "screenshot-li-account",
          linkedin_status: "OK",
          linkedin_error: null,
          linkedin_is_premium: true,
          linkedin_premium_features: ["sales_navigator"],
          linkedin_tier: "sales_navigator",
          whatsapp_connected: true,
          whatsapp_status: "OK",
          whatsapp_error: null,
        },
      }),
    });
  });

  await page.route("**/api/unipile/chats?**", async (route) => {
    const now = new Date().toISOString();
    const items = [
      {
        object: "Chat",
        id: MOCK_CHAT_ID,
        account_id: "screenshot-li-account",
        account_type: "LINKEDIN",
        name: "Sophie Martin",
        timestamp: now,
        unread_count: 2,
        pinned_at: null,
        interlocutor_name: "Sophie Martin",
        picture_url: null,
      },
      {
        object: "Chat",
        id: "screenshot-chat-002",
        account_id: "screenshot-wa-account",
        account_type: "WHATSAPP",
        name: "Thomas Leroy",
        timestamp: new Date(Date.now() - 3600_000).toISOString(),
        unread_count: 0,
        pinned_at: null,
        interlocutor_name: "Thomas Leroy",
        picture_url: null,
      },
      {
        object: "Chat",
        id: "screenshot-chat-003",
        account_id: "screenshot-li-account",
        account_type: "LINKEDIN",
        name: "Camille Bernard",
        timestamp: new Date(Date.now() - 7200_000).toISOString(),
        unread_count: 0,
        pinned_at: new Date(Date.now() - 86400_000).toISOString(),
        interlocutor_name: "Camille Bernard",
        picture_url: null,
      },
    ];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { items, cursor: null },
      }),
    });
  });

  await page.route("**/api/unipile/chats/andoxa-ids", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          ids: [MOCK_CHAT_ID],
          chat_to_prospect: { [MOCK_CHAT_ID]: MOCK_PROSPECT_ID },
        },
      }),
    });
  });

  await page.route(
    `**/api/unipile/chats/${MOCK_CHAT_ID}/messages**`,
    async (route) => {
      const now = Date.now();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                object: "Message",
                id: "msg-1",
                text: "Bonjour Sophie, merci pour votre retour sur LinkedIn !",
                timestamp: new Date(now - 86400_000).toISOString(),
                sender_id: "me",
                is_sender: 1,
              },
              {
                object: "Message",
                id: "msg-2",
                text: "Bonjour Marie, oui je suis disponible jeudi pour un échange de 30 min.",
                timestamp: new Date(now - 82800_000).toISOString(),
                sender_id: "them",
                is_sender: 0,
              },
              {
                object: "Message",
                id: "msg-3",
                text: "Parfait — je vous envoie le lien de réservation.",
                timestamp: new Date(now - 3600_000).toISOString(),
                sender_id: "me",
                is_sender: 1,
              },
            ],
            cursor: null,
          },
        }),
      });
    }
  );

  await page.route("**/api/unipile/chats/*/messages**", async (route) => {
    if (route.request().url().includes(MOCK_CHAT_ID)) return;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { items: [], cursor: null },
      }),
    });
  });

  await page.route(`**/api/prospects/${MOCK_PROSPECT_ID}**`, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: MOCK_PROSPECT_ID,
          full_name: "Sophie Martin",
          company: "NovaTech",
          job_title: "Directrice Marketing",
          email: "sophie.martin@novatech.fr",
          phone: "+33601020304",
          linkedin: "https://linkedin.com/in/sophiemartin",
          status: "qualified",
          organization_id: "a1111111-1111-4111-8111-111111111111",
        },
      }),
    });
  });

  await page.route(
    `**/api/prospects/${MOCK_PROSPECT_ID}/activity**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: "act-1",
                type: "message_sent",
                label: "Message LinkedIn envoyé",
                created_at: new Date(Date.now() - 86400_000).toISOString(),
              },
              {
                id: "act-2",
                type: "message_received",
                label: "Réponse reçue",
                created_at: new Date(Date.now() - 82800_000).toISOString(),
              },
            ],
          },
        }),
      });
    }
  );
}

export { MOCK_CHAT_ID, MOCK_PROSPECT_ID };
