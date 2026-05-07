import { createApiHandler, Errors } from "@/lib/api";
import { describeActivity } from "@/lib/prospect-activity";

/**
 * GET /api/prospects/:id/engagement   (CRM-14)
 *
 * Returns aggregate counters for the profile "Synthèse" card:
 *   • messages_total — rows whose canonical descriptor flags
 *     `countsAsMessage` (LinkedIn invites/messages, WhatsApp messages).
 *   • rdv_total      — rows flagging `countsAsRdv`.
 *   • no_show_total  — rows flagging `countsAsNoShow`.
 *
 * The classification lives in `lib/prospect-activity.ts` so every
 * activity-aware feature stays in sync.
 */

export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const url = new URL(req.url);
  const id = url.pathname.split("/").slice(-2, -1)[0];
  if (!id) throw Errors.notFound("Prospect");

  const { data, error } = await ctx.supabase
    .from("prospect_activity")
    .select("action")
    .eq("organization_id", ctx.workspaceId)
    .eq("prospect_id", id);

  if (error) {
    console.error("[API] engagement counters error:", error);
    throw Errors.internal("Failed to fetch engagement");
  }

  let messages = 0;
  let rdv = 0;
  let noShow = 0;
  for (const row of data ?? []) {
    const desc = describeActivity(row.action ?? "");
    if (desc.countsAsMessage) messages++;
    if (desc.countsAsNoShow) noShow++;
    else if (desc.countsAsRdv) rdv++;
  }

  return {
    messages_total: messages,
    rdv_total: rdv,
    no_show_total: noShow,
  };
});
