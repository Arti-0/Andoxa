import { createApiHandler, Errors } from "../../../../../lib/api";
import { getAccountIdForUser } from "../../../../../lib/unipile/account";
import { linkExistingChatForProspect } from "../../../../../lib/linkedin/link-existing-chat";
import type { NextRequest } from "next/server";

/**
 * POST /api/prospects/[id]/link-existing-chat
 *
 * Finds an existing Unipile chat with this prospect (by matching LinkedIn profile)
 * and links it in unipile_chat_prospects. Use when the conversation already exists
 * on LinkedIn but was not started via Andoxa. Shares its resolver with the
 * auto-link-on-create path (see src/lib/linkedin/link-existing-chat.ts).
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

  const accountId = await getAccountIdForUser(ctx);

  const result = await linkExistingChatForProspect(ctx.supabase, {
    organizationId: ctx.workspaceId,
    accountId,
    prospectId,
    linkedin: prospect.linkedin,
  });

  if (result.reason === "invalid_linkedin") {
    throw Errors.badRequest("URL LinkedIn du prospect invalide");
  }
  if (result.reason === "provider_unresolved") {
    throw Errors.badRequest(
      "Impossible de résoudre le profil LinkedIn. Vérifiez que le prospect existe sur LinkedIn.",
    );
  }
  if (!result.found) {
    return {
      found: false,
      message:
        "Aucune conversation existante trouvée avec ce prospect. Utilisez « Démarrer conversation » pour envoyer un premier message.",
    };
  }

  return {
    found: true,
    chat_id: result.chatId,
    message: "Conversation associée avec succès.",
  };
});
