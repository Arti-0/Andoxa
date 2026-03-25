import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { env } from "@/lib/config/environment";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { applyMessageVariables, extractLinkedInSlug } from "@/lib/unipile/campaign";
import type { UnipileChat } from "@/lib/unipile/types";

interface ProspectRow {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
}

/**
 * POST /api/unipile/campaigns/contact
 * Start LinkedIn conversations with prospects and send first message
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    prospect_ids: string[];
    message: string;
    message_by_prospect?: Record<string, string>;
  }>(req);
  if (!body?.prospect_ids?.length) {
    throw Errors.validation({ prospect_ids: "Au moins un prospect est requis" });
  }
  const messageTemplate =
    (body.message ?? "").trim() ||
    "Bonjour {{firstName}}, j'ai vu votre profil chez {{company}} et souhaiterais échanger avec vous.";

  const { data: prospects } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email, linkedin")
    .eq("organization_id", ctx.workspaceId)
    .in("id", body.prospect_ids)
    .not("linkedin", "is", null);

  let bookingLink: string | null = null;
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("booking_slug")
    .eq("id", ctx.userId)
    .single();
  if (profile?.booking_slug) {
    const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
    bookingLink = `${appUrl}/booking/${profile.booking_slug}`;
  }

  if (!prospects?.length) {
    throw Errors.badRequest(
      "Aucun prospect avec un profil LinkedIn trouvé parmi les sélectionnés"
    );
  }

  const accountId = await getAccountIdForUser(ctx);
  const byProspect = body.message_by_prospect ?? {};

  let lastChatId: string | null = null;
  let successCount = 0;
  const errors: string[] = [];

  for (const p of prospects as ProspectRow[]) {
    const slug = extractLinkedInSlug(p.linkedin);
    if (!slug) {
      errors.push(`${p.full_name ?? p.id}: URL LinkedIn invalide`);
      continue;
    }

    try {
      const profileRes = await unipileFetch<{ provider_id?: string }>(
        `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
      );
      const providerId = (profileRes as { provider_id?: string })?.provider_id;
      if (!providerId) {
        errors.push(`${p.full_name ?? slug}: Impossible de résoudre le profil LinkedIn`);
        continue;
      }

      const custom = byProspect[p.id]?.trim();
      const text =
        custom && custom.length > 0
          ? custom
          : applyMessageVariables(messageTemplate, p, { bookingLink });
      const chatRes = await unipileFetch<UnipileChat & { id: string }>("/chats", {
        method: "POST",
        body: JSON.stringify({
          account_id: accountId,
          attendees_ids: [providerId],
          text,
        }),
      });
      const chatId = chatRes?.id;
      if (!chatId) {
        errors.push(`${p.full_name ?? slug}: Chat créé mais ID manquant`);
        continue;
      }
      lastChatId = chatId;
      successCount++;

      await ctx.supabase.from("unipile_chat_prospects").upsert(
        {
          prospect_id: p.id,
          unipile_chat_id: chatId,
          organization_id: ctx.workspaceId,
        },
        { onConflict: "prospect_id,unipile_chat_id" }
      );

      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    } catch (err) {
      const msg = err instanceof UnipileApiError ? err.message : String(err);
      errors.push(`${p.full_name ?? slug}: ${msg}`);
    }
  }

  return {
    success_count: successCount,
    chat_id: lastChatId,
    errors: errors.slice(0, 10),
  };
}, { rateLimit: { name: "campaigns", requests: 5, window: "1 m" } });
