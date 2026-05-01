import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/dashboard/priorities
 *
 * Returns the 5 cockpit priority cards for the active workspace:
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
    | "pending_workflows";
  count: number;
  label: string;
  sub: string;
  href: string;
}

interface PrioritiesPayload {
  generated_at: string;
  items: PriorityItem[];
}

function startOfTodayLocalIso(): { startIso: string; endIso: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
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

export const GET = createApiHandler(async (_req, ctx): Promise<PrioritiesPayload> => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { startIso: todayStartIso, endIso: todayEndIso } = startOfTodayLocalIso();
  const sevenDaysAgo = daysAgoIso(7);
  const twoDaysAgo = daysAgoIso(2);

  const [
    rdvTodayRes,
    nextRdvRes,
    staleChatsCountRes,
    unreadChatsCountRes,
    proposalsCountRes,
    proposalsSampleRes,
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
    ctx.supabase
      .from("prospects")
      .select("full_name")
      .eq("organization_id", ctx.workspaceId)
      .is("deleted_at", null)
      .eq("status", "proposal")
      .or(`last_contact.is.null,last_contact.lt.${twoDaysAgo}`)
      .order("updated_at", { ascending: false })
      .limit(2),
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

  const rdvCount = rdvTodayRes.count ?? 0;
  let rdvSub = "Aucun RDV planifié aujourd'hui";
  if (rdvCount > 0 && nextRdvRes.data && nextRdvRes.data.length > 0) {
    const next = nextRdvRes.data[0];
    const who = next.guest_name ?? next.title ?? "Prospect";
    rdvSub = `Prochain : ${formatHourMinute(next.start_time)}, ${who}`;
  } else if (rdvCount > 0) {
    rdvSub = `${rdvCount} RDV planifié${rdvCount > 1 ? "s" : ""} aujourd'hui`;
  }

  const staleCount = staleChatsCountRes.count ?? 0;
  const unreadCount = unreadChatsCountRes.count ?? 0;

  const proposalsCount = proposalsCountRes.count ?? 0;
  let proposalsSub = "Aucune proposition à relancer";
  if (proposalsCount > 0) {
    const names = (proposalsSampleRes.data ?? [])
      .map((p) => p.full_name ?? "Prospect")
      .filter(Boolean);
    proposalsSub = names.length > 0 ? names.join(" · ") : "Voir le pipeline";
  }

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
      sub: "LinkedIn + WhatsApp · 7 derniers jours",
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
      key: "pending_workflows",
      count: pendingCount,
      label: pendingCount > 1 ? "Workflows en attente" : "Workflow en attente",
      sub: pendingSub,
      href: "/workflows",
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    items,
  };
});
