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

// Limite de taille côté serveur (10 MB), miroir de la validation côté client.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/unipile/chats/[id]/messages
 * Send a message in a chat – proxy to Unipile API.
 *
 * Two payload shapes supported:
 *  - JSON `{ text }` for a plain text message
 *  - multipart/form-data with fields `text` (optional) and `attachments` (file)
 *    when the user wants to send an attachment.
 *
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

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let upstreamBody: BodyInit;
  if (isMultipart) {
    const incoming = await req.formData();
    const text = (incoming.get("text") ?? "").toString().trim();
    const file = incoming.get("attachments");

    if (!(file instanceof File) || file.size === 0) {
      throw Errors.validation({ attachments: "Fichier manquant ou vide" });
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw Errors.validation({
        attachments: "Le fichier dépasse la taille maximale autorisée (10 Mo).",
      });
    }

    const outgoing = new FormData();
    if (text) outgoing.append("text", text);
    outgoing.append("attachments", file, file.name);
    upstreamBody = outgoing;
  } else {
    const body = await parseBody<{ text: string }>(req);
    if (!body?.text || typeof body.text !== "string") {
      throw Errors.validation({ text: "Le texte du message est requis" });
    }
    upstreamBody = JSON.stringify({ text: body.text.trim() });
  }

  try {
    const data = await unipileFetch<UnipileMessageSent>(
      `/chats/${chatId}/messages`,
      {
        method: "POST",
        body: upstreamBody,
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
