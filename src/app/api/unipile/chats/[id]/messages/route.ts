import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type {
  UnipileListResponse,
  UnipileMessage,
  UnipileMessageSent,
} from "@/lib/unipile/types";
import type { NextRequest } from "next/server";

function getChatId(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/");
  const idx = parts.indexOf("chats");
  return idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null;
}

/**
 * GET /api/unipile/chats/[id]/messages
 * List messages in a chat – proxy to Unipile API
 * Requires user to have a connected Unipile account.
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  assertMessagerieAndTemplatesPlan(ctx);

  await getAccountIdForUser(ctx);

  const chatId = getChatId(req);
  if (!chatId) {
    throw Errors.badRequest("Chat ID required");
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const senderId = searchParams.get("sender_id");
  const q = new URLSearchParams();
  if (limit) q.set("limit", limit);
  if (cursor) q.set("cursor", cursor);
  if (senderId) q.set("sender_id", senderId);
  const query = q.toString();
  const path = query
    ? `/chats/${chatId}/messages?${query}`
    : `/chats/${chatId}/messages`;

  try {
    const data =
      await unipileFetch<UnipileListResponse<UnipileMessage>>(path);
    return data;
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.internal(err.message);
    }
    const message = err instanceof Error ? err.message : "Erreur de messagerie";
    if (message.includes("UNIPILE_API_KEY")) {
      throw Errors.internal(
        "La messagerie n'est pas configurée. Contactez l'administrateur."
      );
    }
    throw Errors.internal(message);
  }
});

/**
 * POST /api/unipile/chats/[id]/messages
 * Send a message in a chat – proxy to Unipile API
 * Requires user to have a connected Unipile account.
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  assertMessagerieAndTemplatesPlan(ctx);

  await getAccountIdForUser(ctx);

  const chatId = getChatId(req);
  if (!chatId) {
    throw Errors.badRequest("Chat ID required");
  }

  const body = await parseBody<{ text: string }>(req);
  if (!body?.text || typeof body.text !== "string") {
    throw Errors.validation({ text: "Le texte du message est requis" });
  }

  try {
    const data = await unipileFetch<UnipileMessageSent>(
      `/chats/${chatId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ text: body.text.trim() }),
      }
    );
    return data;
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.internal(err.message);
    }
    const message = err instanceof Error ? err.message : "Erreur de messagerie";
    if (message.includes("UNIPILE_API_KEY")) {
      throw Errors.internal(
        "La messagerie n'est pas configurée. Contactez l'administrateur."
      );
    }
    throw Errors.internal(message);
  }
});
