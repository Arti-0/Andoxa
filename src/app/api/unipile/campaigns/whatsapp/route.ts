import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { getWhatsAppAccountIdForUserId } from "@/lib/unipile/account";
import { unipileFetch } from "@/lib/unipile/client";
import { applyMessageVariables } from "@/lib/unipile/campaign";
import {
  randomDelay,
  THROTTLE_MS,
  incrementUsageCounter,
  dailyPeriodKey,
} from "@/lib/campaigns/throttle";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/unipile/campaigns/whatsapp
 * Envoi direct (sans job batch) pour petits volumes.
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

    const body = await parseBody<{
      prospect_ids: string[];
      message: string;
      message_by_prospect?: Record<string, string>;
    }>(req);

    if (!body.prospect_ids?.length) {
      throw Errors.validation({ prospect_ids: "At least one prospect required" });
    }

    const service = createServiceClient();
    const accountId = await getWhatsAppAccountIdForUserId(service, ctx.userId);
    if (!accountId) {
      throw Errors.badRequest(
        "Connectez votre compte WhatsApp depuis les paramètres pour envoyer des messages."
      );
    }

    const { data: prospects } = await service
      .from("prospects")
      .select("id, full_name, company, job_title, phone, email")
      .eq("organization_id", ctx.workspaceId)
      .in("id", body.prospect_ids);

    const prospectMap = new Map((prospects ?? []).map((p) => [p.id, p]));
    const results: {
      prospect_id: string;
      status: "success" | "error" | "skipped";
      error?: string;
    }[] = [];

    for (let i = 0; i < body.prospect_ids.length; i++) {
      const prospectId = body.prospect_ids[i]!;
      const prospect = prospectMap.get(prospectId);

      if (!prospect?.phone?.trim()) {
        results.push({ prospect_id: prospectId, status: "skipped", error: "No phone number" });
        continue;
      }

      const phone = prospect.phone.replace(/[\s\-().]/g, "").replace(/^00/, "");
      const override = body.message_by_prospect?.[prospectId]?.trim();
      const text =
        override && override.length > 0
          ? override
          : applyMessageVariables(body.message, prospect, {});

      try {
        const chatRes = await unipileFetch<{ id?: string }>("/chats", {
          method: "POST",
          body: JSON.stringify({
            account_id: accountId,
            attendees_ids: [phone],
            text,
          }),
        });

        const chatId = chatRes?.id;
        if (chatId) {
          await service.from("unipile_chat_prospects").upsert(
            {
              prospect_id: prospectId,
              unipile_chat_id: chatId,
              organization_id: ctx.workspaceId,
            },
            { onConflict: "prospect_id,unipile_chat_id" }
          );
        }

        void incrementUsageCounter(service, ctx.userId, "whatsapp_new_chat", dailyPeriodKey());
        results.push({ prospect_id: prospectId, status: "success" });
      } catch (err) {
        results.push({
          prospect_id: prospectId,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (i < body.prospect_ids.length - 1) {
        await randomDelay(THROTTLE_MS.whatsapp.minDelay, THROTTLE_MS.whatsapp.maxDelay);
      }
    }

    const success = results.filter((r) => r.status === "success").length;
    const errors = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return { results, success, errors, skipped };
  },
  { rateLimit: { name: "whatsapp-campaigns", requests: 3, window: "1 m" } }
);
