import { createApiHandler, Errors } from "../../../../lib/api";

type ActivityType =
  | "prospect_added"
  | "prospect_imported"
  | "campaign_started"
  | "booking_created"
  | "call_session_completed"
  | "status_change"
  | "enrichment_completed"
  | "workflow_enrolled"
  | "workflow_step_completed"
  | "workflow_step_failed"
  | "workflow_run_completed";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  target_url?: string | null;
  actor_name?: string | null;
  actor_avatar?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  rdv: "RDV",
  proposal: "Proposition",
  won: "Signé",
  lost: "Perdu",
};

/**
 * GET /api/dashboard/activity
 * Returns recent activity for the dashboard (multiple types)
 */
export const GET = createApiHandler(async (_req, ctx): Promise<Activity[]> => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const PROSPECT_FEED_ACTIONS = [
    "status_change",
    "workflow_enrolled",
    "workflow_step_completed",
    "workflow_step_failed",
    "workflow_run_completed",
  ] as const;

  const [prospectsRes, campaignsRes, bookingsRes, sessionsRes, prospectFeedRes, bddRes, enrichedRes] =
    await Promise.all([
      ctx.supabase
        .from("prospects")
        .select("id, full_name, source, created_at")
        .eq("organization_id", ctx.workspaceId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      ctx.supabase
        .from("campaign_jobs")
        .select("id, type, total_count, created_by, created_at")
        .eq("organization_id", ctx.workspaceId)
        .order("created_at", { ascending: false })
        .limit(5),
      ctx.supabase
        .from("quick_bookings")
        .select("id, prospect_id, scheduled_for, created_at")
        .eq("organization_id", ctx.workspaceId)
        .order("created_at", { ascending: false })
        .limit(5),
      ctx.supabase
        .from("call_sessions")
        .select("id, title, status, total_duration_s, created_at")
        .eq("organization_id", ctx.workspaceId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5),
      ctx.supabase
        .from("prospect_activity")
        .select(
          "id, prospect_id, workflow_id, actor_id, action, details, created_at"
        )
        .eq("organization_id", ctx.workspaceId)
        .in("action", [...PROSPECT_FEED_ACTIONS])
        .order("created_at", { ascending: false })
        .limit(18),
      // Recent imports (listes created)
      ctx.supabase
        .from("bdd")
        .select("id, name, source, created_at")
        .eq("organization_id", ctx.workspaceId)
        .order("created_at", { ascending: false })
        .limit(5) as unknown as Promise<{
        data: { id: string; name: string; source: string | null; created_at: string | null }[] | null;
        error: unknown;
      }>,
      // Recent enrichments
      ctx.supabase
        .from("prospects")
        .select("id, full_name, enriched_at")
        .eq("organization_id", ctx.workspaceId)
        .is("deleted_at", null)
        .not("enriched_at", "is", null)
        .order("enriched_at", { ascending: false })
        .limit(5),
    ]);

  const allActorIds = new Set<string>();
  const allProspectIds = new Set<string>();

  for (const c of campaignsRes.data ?? []) {
    const by = (c as { created_by?: string }).created_by;
    if (by) allActorIds.add(by);
  }
  for (const s of prospectFeedRes.data ?? []) {
    if (s.actor_id) allActorIds.add(s.actor_id);
    if (s.prospect_id) allProspectIds.add(s.prospect_id);
  }
  for (const b of bookingsRes.data ?? []) {
    if (b.prospect_id) allProspectIds.add(b.prospect_id);
  }

  const profileMap = new Map<string, { name: string; avatar: string | null }>();
  const prospectNameMap = new Map<string, string>();

  const profileIds = [...allActorIds];
  if (profileIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        name: p.full_name ?? "Utilisateur",
        avatar: p.avatar_url ?? null,
      });
    }
  }

  const pIds = [...allProspectIds];
  if (pIds.length > 0) {
    const { data: prospects } = await ctx.supabase
      .from("prospects")
      .select("id, full_name")
      .in("id", pIds);
    for (const p of prospects ?? []) {
      prospectNameMap.set(p.id, p.full_name ?? "Prospect");
    }
  }

  function formatTs(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
      ", " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  const SOURCE_LABELS: Record<string, string> = {
    linkedin_extension: "LinkedIn",
    linkedin: "LinkedIn",
    csv: "CSV",
    xlsx: "Excel",
    manual: "Manuel",
  };

  const activities: Activity[] = [];

  for (const p of prospectsRes.data ?? []) {
    const src = SOURCE_LABELS[p.source ?? ""] ?? p.source ?? "manuel";
    activities.push({
      id: `prospect-${p.id}`,
      type: "prospect_added",
      title: "Nouveau prospect",
      description: `${p.full_name ?? "Sans nom"} — ajouté via ${src} · ${formatTs(p.created_at ?? new Date().toISOString())}`,
      target_url: `/prospect/${p.id}`,
      timestamp: p.created_at ?? new Date().toISOString(),
    });
  }

  for (const c of campaignsRes.data ?? []) {
    const creatorId = (c as { created_by?: string }).created_by;
    const actor = creatorId ? profileMap.get(creatorId) : null;
    const typeLabel =
      c.type === "invite"
        ? "Invitation"
        : c.type === "invite_with_note"
          ? "Invitation (note)"
          : c.type === "whatsapp"
            ? "WhatsApp"
            : "Contact";
    activities.push({
      id: `campaign-${c.id}`,
      type: "campaign_started",
      title: "Campagne lancée",
      description: `${typeLabel} · ${c.total_count} prospects${actor ? ` · par ${actor.name}` : ""} · ${formatTs(c.created_at)}`,
      actor_name: actor?.name ?? null,
      actor_avatar: actor?.avatar ?? null,
      target_url: `/campaigns/${c.id}`,
      timestamp: c.created_at,
    });
  }

  for (const b of bookingsRes.data ?? []) {
    const prospectName = prospectNameMap.get(b.prospect_id);
    const when = b.scheduled_for
      ? new Date(b.scheduled_for).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    activities.push({
      id: `booking-${b.id}`,
      type: "booking_created",
      title: "RDV réservé",
      description: prospectName
        ? `${prospectName}${when ? ` · prévu le ${when}` : ""}`
        : when
          ? `Prévu le ${when}`
          : "Nouveau rendez-vous",
      target_url: "/calendar",
      timestamp: b.created_at,
    });
  }

  for (const s of sessionsRes.data ?? []) {
    const dur =
      s.total_duration_s > 0 ? `${Math.floor(s.total_duration_s / 60)} min` : "";
    activities.push({
      id: `session-${s.id}`,
      type: "call_session_completed",
      title: "Session d'appels terminée",
      description: `${s.title ?? "Session"}${dur ? ` · ${dur}` : ""} · ${formatTs(s.created_at ?? new Date().toISOString())}`,
      target_url: `/call-sessions/${s.id}`,
      timestamp: s.created_at ?? new Date().toISOString(),
    });
  }

  for (const sa of prospectFeedRes.data ?? []) {
    const prospectName = sa.prospect_id
      ? prospectNameMap.get(sa.prospect_id) ?? "Prospect"
      : "Prospect";
    const actor = sa.actor_id ? profileMap.get(sa.actor_id) : null;

    if (sa.action === "status_change") {
      const details = sa.details as { from?: string; to?: string } | null;
      const fromLabel = STATUS_LABELS[details?.from ?? ""] ?? details?.from ?? "?";
      const toLabel = STATUS_LABELS[details?.to ?? ""] ?? details?.to ?? "?";
      activities.push({
        id: `status-${sa.id}`,
        type: "status_change",
        title: "Statut modifié",
        description: `${prospectName} · ${fromLabel} → ${toLabel}${actor ? ` · par ${actor.name}` : ""}`,
        actor_name: actor?.name ?? null,
        actor_avatar: actor?.avatar ?? null,
        target_url: sa.prospect_id ? `/prospect/${sa.prospect_id}` : null,
        timestamp: sa.created_at,
      });
      continue;
    }

    const d = (sa.details ?? {}) as Record<string, unknown>;
    const wname = typeof d.workflow_name === "string" ? d.workflow_name : "Workflow";
    const wfUrl = sa.workflow_id ? `/workflows/${sa.workflow_id}` : null;

    if (sa.action === "workflow_enrolled") {
      activities.push({
        id: `wfe-${sa.id}`,
        type: "workflow_enrolled",
        title: "Workflow",
        description: `${prospectName} · Inscrit à « ${wname} »${actor ? ` · par ${actor.name}` : ""}`,
        actor_name: actor?.name ?? null,
        actor_avatar: actor?.avatar ?? null,
        target_url: wfUrl ?? (sa.prospect_id ? `/prospect/${sa.prospect_id}` : null),
        timestamp: sa.created_at,
      });
    } else if (sa.action === "workflow_step_completed") {
      const st = typeof d.step_type === "string" ? d.step_type : "";
      const labels: Record<string, string> = {
        wait: "Attente terminée",
        linkedin_invite: "Invitation LinkedIn",
        linkedin_message: "Message LinkedIn",
        whatsapp_message: "Message WhatsApp",
      };
      const stepLabel = labels[st] ?? `Étape (${st || "?"})`;
      activities.push({
        id: `wfsc-${sa.id}`,
        type: "workflow_step_completed",
        title: "Workflow",
        description: `${prospectName} · ${stepLabel} · « ${wname} »`,
        actor_name: actor?.name ?? null,
        actor_avatar: actor?.avatar ?? null,
        target_url: wfUrl ?? (sa.prospect_id ? `/prospect/${sa.prospect_id}` : null),
        timestamp: sa.created_at,
      });
    } else if (sa.action === "workflow_step_failed") {
      const err = typeof d.error === "string" ? d.error.slice(0, 80) : "Erreur";
      activities.push({
        id: `wff-${sa.id}`,
        type: "workflow_step_failed",
        title: "Workflow",
        description: `${prospectName} · Échec · « ${wname} » — ${err}`,
        actor_name: actor?.name ?? null,
        actor_avatar: actor?.avatar ?? null,
        target_url: wfUrl ?? (sa.prospect_id ? `/prospect/${sa.prospect_id}` : null),
        timestamp: sa.created_at,
      });
    } else if (sa.action === "workflow_run_completed") {
      activities.push({
        id: `wfrc-${sa.id}`,
        type: "workflow_run_completed",
        title: "Workflow",
        description: `${prospectName} · Parcours terminé · « ${wname} »`,
        actor_name: actor?.name ?? null,
        actor_avatar: actor?.avatar ?? null,
        target_url: wfUrl ?? (sa.prospect_id ? `/prospect/${sa.prospect_id}` : null),
        timestamp: sa.created_at,
      });
    }
  }

  // Imports (listes)
  for (const b of bddRes.data ?? []) {
    if (!b.created_at) continue;
    const src = SOURCE_LABELS[b.source ?? ""] ?? b.source ?? "";
    activities.push({
      id: `import-${b.id}`,
      type: "prospect_imported",
      title: "Prospects importés",
      description: `Liste « ${b.name} »${src ? ` · ${src}` : ""} · ${formatTs(b.created_at)}`,
      target_url: `/crm?bdd_id=${b.id}`,
      timestamp: b.created_at,
    });
  }

  // Enrichments
  for (const e of enrichedRes.data ?? []) {
    if (!e.enriched_at) continue;
    activities.push({
      id: `enrich-${e.id}`,
      type: "enrichment_completed",
      title: "Profil enrichi",
      description: `${e.full_name ?? "Prospect"} · ${formatTs(e.enriched_at)}`,
      target_url: `/prospect/${e.id}`,
      timestamp: e.enriched_at,
    });
  }

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return activities.slice(0, 20);
});
