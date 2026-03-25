import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type { UnipileListResponse } from "@/lib/unipile/types";
import type { NextRequest } from "next/server";

/** Unipile attendee - first_name, last_name, etc. */
interface UnipileAttendee {
  id?: string;
  provider_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
}

function getChatId(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/");
  const idx = parts.indexOf("chats");
  return idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null;
}

/**
 * GET /api/unipile/chats/[id]/attendees
 * List attendees of a chat – proxy to Unipile API.
 * Used to get interlocutor name (first_name, last_name).
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

  try {
    const data = await unipileFetch<
      UnipileListResponse<UnipileAttendee> & { items?: UnipileAttendee[] }
    >(`/chats/${chatId}/attendees`);
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
