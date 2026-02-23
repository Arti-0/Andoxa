import { createApiHandler, Errors } from "@/lib/api";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type { UnipileChat, UnipileListResponse } from "@/lib/unipile/types";

/**
 * GET /api/unipile/chats
 * List chats – proxy to Unipile API
 * Resolves account_id from user's connected Unipile account.
 * Query: account_type (optional), limit, cursor, unread, before, after
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const accountId = await getAccountIdForUser(ctx);

  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get("account_type");
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const unread = searchParams.get("unread");
  const before = searchParams.get("before");
  const after = searchParams.get("after");

  const q = new URLSearchParams();
  q.set("account_id", accountId);
  if (accountType) q.set("account_type", accountType);
  else q.set("account_type", "LINKEDIN");
  if (limit) q.set("limit", limit);
  if (cursor) q.set("cursor", cursor);
  if (unread !== null && unread !== undefined) q.set("unread", unread);
  if (before) q.set("before", before);
  if (after) q.set("after", after);
  const query = q.toString();
  const path = query ? `/chats?${query}` : "/chats";

  try {
    const data = await unipileFetch<UnipileListResponse<UnipileChat>>(path);
    return data;
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.internal(err.message);
    }
    const message = err instanceof Error ? err.message : "Unipile API error";
    if (message.includes("UNIPILE_API_KEY")) {
      throw Errors.internal(
        "Unipile n'est pas configuré. Définissez UNIPILE_API_KEY."
      );
    }
    throw Errors.internal(message);
  }
});
