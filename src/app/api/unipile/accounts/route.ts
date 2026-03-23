import { createApiHandler, Errors } from "@/lib/api";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import type { UnipileListResponse } from "@/lib/unipile/types";

/**
 * GET /api/unipile/accounts
 * List Unipile accounts (LinkedIn, etc.) – proxy to Unipile API
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const q = new URLSearchParams();
  if (limit) q.set("limit", limit);
  if (cursor) q.set("cursor", cursor);
  const query = q.toString();
  const path = query ? `/accounts?${query}` : "/accounts";

  try {
    const data = await unipileFetch<UnipileListResponse<unknown>>(path);
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
