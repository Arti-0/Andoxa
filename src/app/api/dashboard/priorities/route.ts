import { createApiHandler, Errors, type ApiContext } from "@/lib/api";
import { isMockStatsEnabled, mockDashboardPriorities } from "@/lib/mock-stats";
import { todayBoundsIso } from "@/lib/dashboard/timezone";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import {
  isScreenshotWorkspace,
  screenshotPriorities,
} from "@/lib/dashboard/screenshot-stats";

/**
 * GET /api/dashboard/priorities
 *
 * Returns the cockpit priority cards for the active workspace (the
 * pending_workflows card is omitted while the workflows #FF is off):
 *   • rdv_today           — events scheduled for today
 *   • stale_conversations — Unipile chats with last_inbound > 7d (silent threads)
 *   • unread_responses    — recent inbound replies (last 7d, not yet acted on)
 *   • proposals_to_follow — prospects in stage='proposal' with last_contact > 2d
 *   • pending_workflows   — paused workflow_runs awaiting manual action
 */

interface PriorityItem {
  key:
    | "rdv_today"
    | "stale_conversations"
    | "unread_responses"
    | "proposals_to_follow"
    | "active_campaigns"
    | "pending_workflows";
  count: number;
  label: string;
  sub: string;
  href: string;
}

export interface PrioritiesPayload {
  generated_at: string;
  items: PriorityItem[];
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatHourMinute(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Reusable inner data fetch — called both by the dedicated route and by
 * /api/dashboard/overview so the dashboard load only auths once.
 */
export async function getDashboardPriorities(
  ctx: ApiContext,
): Promise<PrioritiesPayload> {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  // Dedicated marketing-screenshot org: serve fixed figures (localhost + prod).
  if (isScreenshotWorkspace(ctx.workspaceId)) return screenshotPriorities();
  if (isMockStatsEnabled()) return mockDashboardPriorities();

  // "Today" boundaries computed in the org's display timezone (defaults to
  // Europe/Paris). Critical to avoid the UTC-midnight rollover: at 23:30 in
  // Paris, server-local "today" already shifted to tomorrow in UTC, so the
  // RDV count would jump ahead a day.
  const { startIso: todayStartIso, endIso: todayEndIso } = todayBoundsIso();
  const sevenDaysAgo = daysAgoIso(7);
  const twoDaysAgo = daysAgoIso(2);

  const [
    rdvTodayRes,
    nextRdvRes,
    staleChatsCountRes,
    unreadChatsCountRes,
    proposalsCountRes,
    activeCampaignsRes,
    pendingRunsCountRes,
    pendingRunSampleRes,
  ] = await Promise.all([
    ctx.supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .gte("start_time", todayStartIso)
      .lte("start_time", todayEndIso),
    // Earliest upcoming event from now → end of day for the sub-label.
    ctx.supabase
      .from("events")
      .select("title, guest_name, start_time, prospect_id")
      .eq("organization_id", ctx.workspaceId)
      .gte("start_time", new Date().toISOString())
      .lte("start_time", todayEndIso)
      .order("start_time", { ascending: true })
      .limit(1),
    ctx.supabase
      .from("unipile_chat_prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .lt("last_inbound_at", sevenDaysAgo)
      .not("last_inbound_at", "is", null),
    ctx.supabase
      .from("unipile_chat_prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .gte("last_inbound_at", sevenDaysAgo),
    ctx.supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .is("deleted_at", null)
      .eq("status", "proposal")
      .or(`last_contact.is.null,last_contact.lt.${twoDaysAgo}`),
    // Active campaigns — jobs currently sending (status 'running').
    ctx.supabase
      .from("campaign_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .eq("status", "running"),
    ctx.supabase
      .from("workflow_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.workspaceId)
      .eq("status", "paused"),
    ctx.supabase
      .from("workflow_runs")
      .select("id, workflow_id, current_step_index, definition_snapshot")
      .eq("organization_id", ctx.workspaceId)
      .eq("status", "paused")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  // Sub-labels describe what each metric tracks (its window / criterion) rather
  // than restating the count — so they stay meaningful at zero. The only
  // dynamic one is the next RDV, which is genuinely useful extra context.
  const rdvCount = rdvTodayRes.count ?? 0;
  let rdvSub: string;
  if (nextRdvRes.data && nextRdvRes.data.length > 0) {
    const next = nextRdvRes.data[0];
    const who = next.guest_name ?? next.title ?? "Prospect";
    rdvSub = `Prochain : ${formatHourMinute(next.start_time)}, ${who}`;
  } else if (rdvCount > 0) {
    rdvSub = "RDV du jour terminés";
  } else {
    rdvSub = "Agenda libre aujourd'hui";
  }

  const staleCount = staleChatsCountRes.count ?? 0;
  const unreadCount = unreadChatsCountRes.count ?? 0;

  const proposalsCount = proposalsCountRes.count ?? 0;
  const proposalsSub = "Sans relance depuis 2 jours";

  const pendingCount = pendingRunsCountRes.count ?? 0;
  let pendingSub = "Aucun workflow en attente";
  if (pendingCount > 0 && pendingRunSampleRes.data && pendingRunSampleRes.data.length > 0) {
    const r = pendingRunSampleRes.data[0];
    const def = (r.definition_snapshot ?? {}) as { name?: string; steps?: unknown[] };
    const total = Array.isArray(def.steps) ? def.steps.length : null;
    const stepLabel =
      total != null ? `étape ${(r.current_step_index ?? 0) + 1}/${total}` : "en pause";
    pendingSub = `« ${def.name ?? "Parcours"} » · ${stepLabel}`;
  }

  // Channel wording follows the #FF: WhatsApp is hidden until that flag ships.
  const channelSub = isFeatureEnabled("whatsapp")
    ? "LinkedIn + WhatsApp · 7 derniers jours"
    : "LinkedIn · 7 derniers jours";

  const activeCampaignsCount = activeCampaignsRes.count ?? 0;
  const activeCampaignsSub = "Séquences d'envoi en cours";

  const items: PriorityItem[] = [
    {
      key: "rdv_today",
      count: rdvCount,
      label: "RDV aujourd'hui",
      sub: rdvSub,
      href: "/calendar",
    },
    {
      key: "stale_conversations",
      count: staleCount,
      label: "Conversations à relancer",
      sub: "Silence > 7 jours",
      href: "/messagerie",
    },
    {
      key: "unread_responses",
      count: unreadCount,
      label: "Réponses récentes",
      sub: channelSub,
      href: "/messagerie",
    },
    {
      key: "proposals_to_follow",
      count: proposalsCount,
      label: "Propositions à suivre",
      sub: proposalsSub,
      href: "/crm?status=proposal",
    },
    {
      key: "active_campaigns",
      count: activeCampaignsCount,
      label: "Campagnes actives",
      sub: activeCampaignsSub,
      href: "/campaigns?status=running",
    },
    // #FF: workflows — the "en attente" card links to /workflows (hidden while
    // the feature is gated), so it's only surfaced when workflows are enabled.
    ...(isFeatureEnabled("workflows")
      ? [
          {
            key: "pending_workflows" as const,
            count: pendingCount,
            label:
              pendingCount > 1 ? "Workflows en attente" : "Workflow en attente",
            sub: pendingSub,
            href: "/workflows",
          },
        ]
      : []),
  ];

  return {
    generated_at: new Date().toISOString(),
    items,
  };
}

export const GET = createApiHandler(async (_req, ctx) => getDashboardPriorities(ctx));
