import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { unipileFetch } from "@/lib/unipile/client";
import type { UnipileAccount } from "@/lib/unipile/types";

/**
 * Unipile webhook payloads:
 * - Hosted Auth notify_url: { status, account_id, name } — name = our user_id
 * - Dashboard AccountStatus: { AccountStatus: { account_id, message, account_type } } — no name
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
  name?: string;
  AccountStatus?: {
    account_id?: string;
    message?: string;
    account_type?: string;
  };
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

  const accountStatus = body.AccountStatus;
  const isAccountStatusCallback =
    accountStatus?.account_id &&
    accountStatus?.message &&
    ["CREATION_SUCCESS", "RECONNECTED"].includes(accountStatus.message);

  // Auth: required for dashboard webhooks (message_received, etc.)
  // Hosted Auth callback may not send Unipile-Auth header – skip auth check for it
  if (!isHostedAuthCallback && !isAccountStatusCallback) {
    const secret = process.env.UNIPILE_WEBHOOK_SECRET;
    if (secret) {
      const authHeader =
        req.headers.get("Unipile-Auth") ?? req.headers.get("X-Unipile-Auth");
      if (authHeader !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  async function storeUnipileAccount(rawName: string, accountId: string) {
    const isWhatsApp = rawName.endsWith("__whatsapp");
    const userId = isWhatsApp ? rawName.replace(/__whatsapp$/, "") : rawName;
    const accountType = isWhatsApp ? "WHATSAPP" : "LINKEDIN";

    const supabase = createServiceClient();
    const { error } = await supabase.from("user_unipile_accounts").upsert(
      [
        {
          user_id: userId,
          unipile_account_id: accountId,
          account_type: accountType,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,account_type" }
    );
    if (error) {
      console.error("[Unipile webhook] upsert user_unipile_accounts:", error);
      throw new Error("Failed to store account");
    }
  }

  // 1. Hosted Auth notify_url: { status, account_id, name }
  if (isHostedAuthCallback) {
    const validStatuses = ["CREATION_SUCCESS", "RECONNECTED"];
    if (validStatuses.includes(body.status!)) {
      try {
        await storeUnipileAccount(body.name!, body.account_id!);
        return NextResponse.json({ received: true }, { status: 200 });
      } catch (err) {
        console.error("[Unipile webhook] Hosted Auth store:", err);
        Sentry.captureException(err);
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Internal error" },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 2. Dashboard AccountStatus: { AccountStatus: { account_id, message } } — fetch account.name (user_id)
  if (isAccountStatusCallback) {
    const accountId = accountStatus!.account_id!;
    try {
      const account = await unipileFetch<UnipileAccount>(`/accounts/${accountId}`);
      const userId = account?.name;
      if (userId) {
        await storeUnipileAccount(userId, accountId);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    } catch (err) {
      console.error("[Unipile webhook] AccountStatus fetch/store:", err);
      Sentry.captureException(err);
      return NextResponse.json({ received: true }, { status: 200 });
    }
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

  const HANDLED_EVENTS = new Set(["message_received"]);
  if (
    typeof event === "string" &&
    event.length > 0 &&
    !HANDLED_EVENTS.has(event) &&
    !isHostedAuthCallback &&
    !isAccountStatusCallback
  ) {
    console.info("[Unipile webhook] Unknown event type (no-op)", { event });
    Sentry.captureMessage(`Unipile webhook unknown event: ${event}`, {
      level: "info",
      extra: { event },
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
