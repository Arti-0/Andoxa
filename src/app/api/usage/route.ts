import { createApiHandler } from "@/lib/api";
import { weeklyPeriodKey, dailyPeriodKey } from "@/lib/campaigns/throttle";

/**
 * GET /api/usage
 * Compteurs d'usage (LinkedIn / WhatsApp) pour l'utilisateur courant.
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    const thisWeek = weeklyPeriodKey();
    const today = dailyPeriodKey();

    const { data } = await ctx.supabase
      .from("usage_counters")
      .select("action, period_key, count, last_action_at")
      .eq("user_id", ctx.userId)
      .in("period_key", [thisWeek, today]);

    const counters = data ?? [];
    const get = (action: string, period: string) =>
      counters.find((c) => c.action === action && c.period_key === period)?.count ?? 0;

    return {
      linkedin_invites_this_week: get("linkedin_invite", thisWeek),
      linkedin_contacts_today: get("linkedin_contact", today),
      whatsapp_new_chats_today: get("whatsapp_new_chat", today),
      period_week: thisWeek,
      period_day: today,
    };
  },
  { requireWorkspace: false }
);
