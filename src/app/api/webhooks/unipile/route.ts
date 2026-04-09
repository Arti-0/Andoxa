import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { unipileFetch } from "@/lib/unipile/client";
import type { UnipileAccount } from "@/lib/unipile/types";

/** Unipile event/status → statut normalisé stocké en base */
const UNIPILE_STATUS_MAP: Record<string, string> = {
  CREATION_SUCCESS: "connected",
  RECONNECTED: "connected",
  ACCOUNT_STATUS_OK: "connected",
  ACCOUNT_CONNECTING: "connecting",
  ACCOUNT_STOPPED: "stopped",
  ACCOUNT_DELETION: "disconnected",
  ACCOUNT_ERROR: "error",
  ACCOUNT_CREDENTIALS: "error",
  ACCOUNT_PERMISSIONS: "error",
  CREATION_ERROR: "error",
};

/** Messages lisibles pour les erreurs critiques */
const UNIPILE_ERROR_LABELS: Record<string, string> = {
  ACCOUNT_ERROR: "Erreur de compte LinkedIn — reconnexion requise.",
  ACCOUNT_CREDENTIALS: "Identifiants LinkedIn invalides — reconnexion requise.",
  ACCOUNT_PERMISSIONS: "Permissions LinkedIn insuffisantes — reconnexion requise.",
  CREATION_ERROR: "Échec de la connexion LinkedIn.",
  ACCOUNT_STOPPED: "Compte LinkedIn suspendu ou arrêté.",
};

/**
 * Unipile webhook payloads:
 * - Hosted Auth notify_url: { status, account_id, name } — name = our user_id
 * - Dashboard AccountStatus: { AccountStatus: { account_id, message, account_type } } — no name
 */
function extractPremiumData(account: UnipileAccount): {
  isPremium: boolean;
  premiumFeatures: string[];
} {
  const im = account.connection_params?.im;
  const isPremium = !!im?.premiumId;
  const premiumFeatures = im?.premiumFeatures ?? [];
  return { isPremium, premiumFeatures };
}

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
  account_info?: { user_id?: string; id?: string };
  sender?: { attendee_provider_id?: string };
}

async function storeUnipileAccount(
  rawName: string,
  accountId: string,
  eventCode?: string,
  premiumData?: { isPremium: boolean; premiumFeatures: string[] }
) {
  const isWhatsApp = rawName.endsWith("__whatsapp");
  const userId = isWhatsApp ? rawName.replace(/__whatsapp$/, "") : rawName;
  const accountType = isWhatsApp ? "WHATSAPP" : "LINKEDIN";

  const status = eventCode
    ? (UNIPILE_STATUS_MAP[eventCode] ?? "unknown")
    : "connected";
  const isError = status === "error" || status === "stopped";

  const supabase = createServiceClient();
  const { error } = await supabase.from("user_unipile_accounts").upsert(
    [
      {
        user_id: userId,
        unipile_account_id: accountId,
        account_type: accountType,
        status,
        error_code: isError ? (eventCode ?? null) : null,
        error_message: isError
          ? (UNIPILE_ERROR_LABELS[eventCode ?? ""] ?? null)
          : null,
        last_status_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(premiumData != null && {
          is_premium: premiumData.isPremium,
          premium_features: premiumData.premiumFeatures,
        }),
      },
    ],
    { onConflict: "user_id,account_type" }
  );

  if (error) {
    console.error("[Unipile webhook] upsert user_unipile_accounts:", error);
    throw new Error("Failed to store account");
  }
}

/**
 * POST /api/webhooks/unipile
 * Receives Unipile webhook events (new messages, etc.)
 *
 * Configuration: Document the URL in Unipile dashboard:
 *   https://{your-domain}/api/webhooks/unipile
 *
 * Optional auth: if your Unipile project can send a custom header on webhooks, set
 * UNIPILE_WEBHOOK_SECRET and configure the same value as header "Unipile-Auth" (or
 * X-Unipile-Auth) in Unipile. If Unipile does not send this header, leave
 * UNIPILE_WEBHOOK_SECRET unset — otherwise non-Hosted-Auth payloads will return 401.
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

  // Événements Hosted Auth (notify_url) : { status, account_id, name }
  const isHostedAuthCallback =
    typeof body.status === "string" &&
    typeof body.account_id === "string" &&
    typeof body.name === "string";

  // Événements AccountStatus dashboard : { AccountStatus: { account_id, message } }
  const ACCOUNT_STATUS_EVENTS = new Set([
    "CREATION_SUCCESS",
    "RECONNECTED",
    "ACCOUNT_STATUS_OK",
    "ACCOUNT_CONNECTING",
    "ACCOUNT_STOPPED",
    "ACCOUNT_DELETION",
    "ACCOUNT_ERROR",
    "ACCOUNT_CREDENTIALS",
    "ACCOUNT_PERMISSIONS",
  ]);
  const accountStatus = body.AccountStatus;
  const isAccountStatusCallback =
    typeof accountStatus?.account_id === "string" &&
    typeof accountStatus?.message === "string" &&
    ACCOUNT_STATUS_EVENTS.has(accountStatus.message);

  // Optional shared secret (only if Unipile sends Unipile-Auth). Hosted Auth skips this.
  if (!isHostedAuthCallback && !isAccountStatusCallback) {
    const secret = process.env.UNIPILE_WEBHOOK_SECRET?.trim();
    if (secret) {
      const authHeader =
        req.headers.get("Unipile-Auth") ?? req.headers.get("X-Unipile-Auth");
      if (authHeader !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  if (isHostedAuthCallback) {
    const eventCode = body.status!;
    const isLinkedIn = !body.name!.endsWith("__whatsapp");
    const isSuccess =
      eventCode === "CREATION_SUCCESS" || eventCode === "RECONNECTED";

    let premiumData:
      | { isPremium: boolean; premiumFeatures: string[] }
      | undefined;

    if (isLinkedIn && isSuccess) {
      try {
        const account = await unipileFetch<UnipileAccount>(
          `/accounts/${body.account_id}`
        );
        premiumData = extractPremiumData(account);
      } catch (err) {
        console.warn("[Unipile webhook] Premium fetch failed:", err);
      }
    }

    try {
      await storeUnipileAccount(
        body.name!,
        body.account_id!,
        eventCode,
        premiumData
      );
    } catch (err) {
      console.error("[Unipile webhook] Hosted Auth store:", err);
      Sentry.captureException(err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    if (eventCode === "CREATION_ERROR") {
      Sentry.captureMessage(`Unipile CREATION_ERROR for ${body.name}`, {
        level: "warning",
        extra: { name: body.name, account_id: body.account_id },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (isAccountStatusCallback) {
    const accountId = accountStatus!.account_id!;
    const eventCode = accountStatus!.message!;
    const isSuccess =
      eventCode === "CREATION_SUCCESS" || eventCode === "RECONNECTED";
    try {
      const account = await unipileFetch<UnipileAccount>(`/accounts/${accountId}`);
      const userId = account?.name;
      if (userId) {
        const isLinkedIn = !userId.endsWith("__whatsapp");
        const premiumData =
          isLinkedIn && isSuccess ? extractPremiumData(account) : undefined;
        await storeUnipileAccount(userId, accountId, eventCode, premiumData);
      }
    } catch (err) {
      console.error("[Unipile webhook] AccountStatus fetch/store:", err);
      Sentry.captureException(err);
    }

    const criticalEvents = new Set([
      "ACCOUNT_ERROR",
      "ACCOUNT_CREDENTIALS",
      "ACCOUNT_PERMISSIONS",
      "ACCOUNT_STOPPED",
    ]);
    if (criticalEvents.has(eventCode)) {
      Sentry.captureMessage(`Unipile account issue: ${eventCode} on ${accountId}`, {
        level: "warning",
        extra: { accountId, eventCode },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  const event = body.event;
  const chatId = body.chat_id;

  if (event === "message_received" && chatId) {
    const accountInfo = body.account_info as
      | { user_id?: string; id?: string }
      | undefined;
    const sender = body.sender as { attendee_provider_id?: string } | undefined;

    const unipileAccountId =
      body.account_id ?? accountInfo?.id ?? null;

    const isOutbound =
      accountInfo?.user_id &&
      sender?.attendee_provider_id &&
      accountInfo.user_id === sender.attendee_provider_id;

    if (!isOutbound) {
      const supabase = createServiceClient();

      const { error: inboundErr } = await supabase
        .from("unipile_chat_prospects")
        .update({ last_inbound_at: new Date().toISOString() })
        .eq("unipile_chat_id", chatId);

      if (inboundErr) {
        console.error("[Unipile webhook] inbound last_inbound_at:", inboundErr);
        Sentry.captureException(inboundErr);
      }

      if (unipileAccountId) {
        const { data: accountRow } = await supabase
          .from("user_unipile_accounts")
          .select("user_id, account_type")
          .eq("unipile_account_id", unipileAccountId)
          .maybeSingle();

        if (accountRow?.user_id) {
          const messageId = body.message_id ?? null;
          const occurredAt = body.timestamp
            ? new Date(body.timestamp).toISOString()
            : new Date().toISOString();

          const row = {
            user_id: accountRow.user_id,
            chat_id: chatId,
            account_type: accountRow.account_type ?? "LINKEDIN",
            message_id: messageId,
            occurred_at: occurredAt,
          };

          if (messageId) {
            const { error: eventErr } = await supabase
              .from("inbox_events")
              .upsert([row], {
                onConflict: "user_id,message_id",
                ignoreDuplicates: true,
              });
            if (eventErr) {
              console.error("[Unipile webhook] inbox_events upsert:", eventErr);
              Sentry.captureException(eventErr);
            }
          } else {
            const { error: eventErr } = await supabase
              .from("inbox_events")
              .insert([row]);
            if (eventErr) {
              console.error("[Unipile webhook] inbox_events insert:", eventErr);
              Sentry.captureException(eventErr);
            }
          }
        }
      }
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
