import { createApiHandler, Errors } from "../../../../../lib/api";
import { getAccountIdForUser } from "../../../../../lib/unipile/account";
import { UnipileApiError, unipileFetch } from "../../../../../lib/unipile/client";
import { extractLinkedInSlug } from "../../../../../lib/unipile/campaign";
import type { UnipileListResponse } from "../../../../../lib/unipile/types";
import type { NextRequest } from "next/server";

interface UnipileAttendee {
  id?: string;
  provider_id?: string;
}

/**
 * POST /api/prospects/[id]/link-existing-chat
 *
 * Finds an existing Unipile chat with this prospect (by matching LinkedIn profile)
 * and links it in unipile_chat_prospects. Use when the conversation already exists
 * on LinkedIn but was not started via Andoxa.
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace requis");
  }

  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const prospectId = segments[segments.indexOf("prospects") + 1];
  if (!prospectId) {
    throw Errors.notFound("Prospect");
  }

  const { data: prospect, error: prospectError } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, linkedin")
    .eq("id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (prospectError || !prospect) {
    throw Errors.notFound("Prospect");
  }
  if (!prospect.linkedin?.trim()) {
    throw Errors.badRequest("Ce prospect n'a pas de profil LinkedIn");
  }

  const slug = extractLinkedInSlug(prospect.linkedin);
  if (!slug) {
    throw Errors.badRequest("URL LinkedIn du prospect invalide");
  }

  const accountId = await getAccountIdForUser(ctx);

  let providerId: string;
  try {
    const profileRes = await unipileFetch<{ provider_id?: string }>(
      `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
    );
    providerId = (profileRes as { provider_id?: string })?.provider_id ?? "";
    if (!providerId) {
      throw Errors.badRequest(
        "Impossible de résoudre le profil LinkedIn. Vérifiez que le prospect existe sur LinkedIn."
      );
    }
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.badRequest(err.message);
    }
    throw err;
  }

  let chatId: string | null = null;
  const limit = 100;

  try {
    const chatsData = await unipileFetch<UnipileListResponse<{ id: string }>>(
      `/chats?account_id=${accountId}&account_type=LINKEDIN&limit=${limit}`
    );
    const chats = chatsData?.items ?? [];

    for (const chat of chats) {
      const attendeesData = await unipileFetch<
        UnipileListResponse<UnipileAttendee> & { items?: UnipileAttendee[] }
      >(`/chats/${chat.id}/attendees`);
      const attendees = attendeesData?.items ?? [];
      const match = attendees.some(
        (a) =>
          a.id === providerId ||
          a.provider_id === providerId
      );
      if (match) {
        chatId = chat.id;
        break;
      }
    }
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.internal(err.message);
    }
    throw err;
  }

  if (!chatId) {
    return {
      found: false,
      message:
        "Aucune conversation existante trouvée avec ce prospect. Utilisez « Démarrer conversation » pour envoyer un premier message.",
    };
  }

  await ctx.supabase.from("unipile_chat_prospects").upsert(
    {
      prospect_id: prospectId,
      unipile_chat_id: chatId,
      organization_id: ctx.workspaceId,
    },
    { onConflict: "prospect_id,unipile_chat_id" }
  );

  return {
    found: true,
    chat_id: chatId,
    message: "Conversation associée avec succès.",
  };
});
