import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { insertProspectActivity } from "@/lib/prospect-activity";
import { sendLinkedInChatMessage } from "@/lib/unipile/campaign";

/**
 * POST /api/unipile/chats/start
 *
 * Opens a LinkedIn conversation with a 1st-degree prospect (typically one who
 * just accepted an invitation and has no chat yet) by sending the first
 * message via Unipile `/chats` — LinkedIn creates the thread and posts the
 * message in one call. Links the new chat to the prospect so messagerie
 * swaps the synthetic "pending" row for the real conversation.
 *
 * Body: { prospect_id, provider_id, account_id, text }
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }
  assertMessagerieAndTemplatesPlan(ctx);

  const body = (await req.json().catch(() => null)) as {
    prospect_id?: string;
    provider_id?: string;
    account_id?: string;
    text?: string;
  } | null;

  const prospectId = body?.prospect_id?.trim();
  const providerId = body?.provider_id?.trim();
  const accountId = body?.account_id?.trim();
  const text = body?.text?.trim();
  if (!prospectId || !providerId || !accountId || !text) {
    throw Errors.badRequest(
      "prospect_id, provider_id, account_id et text sont requis",
    );
  }

  // The Unipile account must belong to the caller — never let a forged
  // account_id send from someone else's LinkedIn session.
  const { data: account } = await ctx.supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id")
    .eq("user_id", ctx.userId)
    .eq("unipile_account_id", accountId)
    .maybeSingle();
  if (!account) {
    throw Errors.badRequest("Compte LinkedIn introuvable pour cet utilisateur");
  }

  // The prospect must belong to the workspace (RLS also enforces this).
  const { data: prospect } = await ctx.supabase
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .maybeSingle();
  if (!prospect) {
    throw Errors.badRequest("Prospect introuvable");
  }

  const chatRes = await sendLinkedInChatMessage({
    accountId,
    providerId,
    text,
  });
  const chatId = chatRes?.id ?? null;

  if (chatId) {
    await ctx.supabase.from("unipile_chat_prospects").upsert(
      {
        organization_id: ctx.workspaceId,
        prospect_id: prospectId,
        unipile_chat_id: chatId,
      },
      { onConflict: "unipile_chat_id" },
    );
  }

  await insertProspectActivity(ctx.supabase, {
    organization_id: ctx.workspaceId,
    prospect_id: prospectId,
    actor_id: ctx.userId,
    action: "linkedin_message_outbound",
    details: {
      message: text.length > 500 ? `${text.slice(0, 499)}…` : text,
      chat_id: chatId,
      phase: "messagerie_first_message",
    },
  });

  return { chat_id: chatId };
});
