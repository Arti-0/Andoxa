import { createApiHandler, Errors } from "@/lib/api";
import { dailyPeriodKey, weeklyPeriodKey } from "@/lib/campaigns/throttle";

/**
 * GET /api/dashboard/linkedin-usage
 *
 * Today's LinkedIn usage for the current user in the active workspace (UTC day).
 * - invitations_sent: workflow invites (prospect_activity) + CRM direct (`linkedin_invite_direct` in usage_counters).
 * - invitations_workflow / invitations_direct: breakdown for the settings detail view.
 * - messages_sent: workflow `linkedin_message` completions + campaign `linkedin_contact`
 *   counter for today (usage_counters).
 * - profile_views: not tracked yet — always 0 (TODO).
 * - invitations_week: weekly `linkedin_invite` usage_counters (workflows + CRM).
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);
  const startIso = startOfDayUtc.toISOString();

  const todayKey = dailyPeriodKey();
  const weekKey = weeklyPeriodKey();

  const [
    invitesTodayRes,
    messagesWorkflowRes,
    contactTodayRes,
    invitesWeekRes,
    invitesDirectTodayRes,
  ] = await Promise.all([
    ctx.supabase
      .from("prospect_activity")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .eq("actor_id", ctx.userId)
      .eq("action", "workflow_step_completed")
      .filter("details->>step_type", "eq", "linkedin_invite")
      .gte("created_at", startIso),
    ctx.supabase
      .from("prospect_activity")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .eq("actor_id", ctx.userId)
      .eq("action", "workflow_step_completed")
      .filter("details->>step_type", "eq", "linkedin_message")
      .gte("created_at", startIso),
    ctx.supabase
      .from("usage_counters")
      .select("count")
      .eq("user_id", ctx.userId)
      .eq("action", "linkedin_contact")
      .eq("period_key", todayKey)
      .maybeSingle(),
    ctx.supabase
      .from("usage_counters")
      .select("count")
      .eq("user_id", ctx.userId)
      .eq("action", "linkedin_invite")
      .eq("period_key", weekKey)
      .maybeSingle(),
    ctx.supabase
      .from("usage_counters")
      .select("count")
      .eq("user_id", ctx.userId)
      .eq("action", "linkedin_invite_direct")
      .eq("period_key", todayKey)
      .maybeSingle(),
  ]);

  const invitations_workflow = invitesTodayRes.count ?? 0;
  const invitations_direct = invitesDirectTodayRes.data?.count ?? 0;
  const invitations_sent = invitations_workflow + invitations_direct;
  const workflowMessages = messagesWorkflowRes.count ?? 0;
  const campaignContacts = contactTodayRes.data?.count ?? 0;
  const messages_sent = workflowMessages + campaignContacts;

  return {
    invitations_sent,
    invitations_workflow,
    invitations_direct,
    messages_sent,
    profile_views: 0,
    invitations_week: invitesWeekRes.data?.count ?? 0,
  };
});
