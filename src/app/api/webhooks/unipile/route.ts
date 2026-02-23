import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Unipile webhook payload
 * - message_received: event, chat_id, account_id, etc.
 * - Hosted Auth callback: status (CREATION_SUCCESS, RECONNECTED), account_id, name (our user_id)
 */
interface UnipileWebhookPayload {
  account_id?: string;
  account_type?: string;
  event?: string;
  chat_id?: string;
  message_id?: string;
  message?: string;
  timestamp?: string;
  status?: string;
  name?: string; // our internal user_id (from Hosted Auth link request)
  account_info?: { user_id?: string };
  sender?: { attendee_provider_id?: string };
}

/**
 * POST /api/webhooks/unipile
 * Receives Unipile webhook events (new messages, etc.)
 *
 * Configuration: Document the URL in Unipile dashboard:
 *   https://{your-domain}/api/webhooks/unipile
 *
 * Authentication: Add header "Unipile-Auth" with secret when creating webhook.
 * Set UNIPILE_WEBHOOK_SECRET in env to verify incoming requests.
 *
 * On "message_received": identifies chat_id. unipile_chat_prospects links
 * prospects to chats. Optional: write to unread_messages table for badge.
 * MessagingInbox fetches unread_count from Unipile chats API.
 */
export async function POST(req: NextRequest) {
  let body: UnipileWebhookPayload;
  try {
    body = (await req.json()) as UnipileWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isHostedAuthCallback =
    body.status && body.account_id && body.name;

  // Auth: required for dashboard webhooks (message_received, etc.)
  // Hosted Auth callback may not send Unipile-Auth header – skip auth check for it
  if (!isHostedAuthCallback) {
    const secret = process.env.UNIPILE_WEBHOOK_SECRET;
    if (secret) {
      const authHeader =
        req.headers.get("Unipile-Auth") ?? req.headers.get("X-Unipile-Auth");
      if (authHeader !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  // Hosted Auth callback: account connected (status, account_id, name)
  if (isHostedAuthCallback) {
    const validStatuses = ["CREATION_SUCCESS", "RECONNECTED"];
    if (validStatuses.includes(body.status!)) {
      console.log("[Unipile webhook] Hosted Auth callback:", {
        status: body.status,
        account_id: body.account_id,
        user_id: body.name,
      });
      try {
        const supabase = createServiceClient();
        const { error } = await supabase.from("user_unipile_accounts").upsert(
          [
            {
              user_id: body.name!,
              unipile_account_id: body.account_id!,
              account_type: "LINKEDIN",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "user_id" }
        );
        if (error) {
          console.error("[Unipile webhook] upsert user_unipile_accounts:", error);
          return NextResponse.json(
            { error: "Failed to store account" },
            { status: 500 }
          );
        }
      } catch (err) {
        console.error("[Unipile webhook] createServiceClient or upsert:", err);
        return NextResponse.json(
          { error: "Internal error" },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const event = body.event;
  const chatId = body.chat_id;

  if (event === "message_received" && chatId) {
    const accountInfo = body.account_info as { user_id?: string } | undefined;
    const sender = body.sender as { attendee_provider_id?: string } | undefined;
    const isOutbound =
      accountInfo?.user_id &&
      sender?.attendee_provider_id &&
      accountInfo.user_id === sender.attendee_provider_id;

    if (!isOutbound) {
      // Message reçu (inbound) – chat_id peut être enrichi via unipile_chat_prospects
      // pour lier au prospect. Optionnel : écrire dans unread_messages pour badge.
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
