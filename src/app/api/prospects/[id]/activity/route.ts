import { createApiHandler, Errors } from "@/lib/api";

function getProspectIdFromUrl(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("prospects");
  return segments[i + 1] ?? "";
}

/**
 * GET /api/prospects/[id]/activity — historique org pour la fiche prospect (comme le fil dashboard).
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const prospectId = getProspectIdFromUrl(req);
  if (!prospectId) throw Errors.badRequest("ID prospect requis");

  const { data: prospect } = await ctx.supabase
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!prospect) throw Errors.notFound("Prospect");

  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 50)
  );

  const { data: rows, error } = await ctx.supabase
    .from("prospect_activity")
    .select("id, workflow_id, actor_id, action, details, created_at")
    .eq("organization_id", ctx.workspaceId)
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw Errors.internal("Impossible de charger l’activité");

  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const workflowIds = [...new Set((rows ?? []).map((r) => r.workflow_id).filter(Boolean))] as string[];

  const profileMap = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const p of profiles ?? []) profileMap.set(p.id, p.full_name ?? "Utilisateur");
  }

  const workflowMap = new Map<string, string>();
  if (workflowIds.length) {
    const { data: wfs } = await ctx.supabase
      .from("workflows")
      .select("id, name")
      .in("id", workflowIds);
    for (const w of wfs ?? []) workflowMap.set(w.id, w.name);
  }

  const items = (rows ?? []).map((r) => {
    const d = (r.details ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      action: r.action,
      created_at: r.created_at,
      actor_name: r.actor_id ? profileMap.get(r.actor_id) ?? null : null,
      workflow_id: r.workflow_id,
      workflow_name: r.workflow_id ? workflowMap.get(r.workflow_id) ?? null : null,
      title: activityTitle(r.action, d),
      description: activityDescription(r.action, d),
      target_url: r.workflow_id ? `/whatsapp/${r.workflow_id}` : undefined,
    };
  });

  return { items };
});

function activityTitle(action: string, d: Record<string, unknown>): string {
  switch (action) {
    case "status_change":
      return "Statut CRM";
    case "workflow_enrolled":
      return "Suivi WhatsApp";
    case "workflow_step_completed":
      return "Suivi WhatsApp";
    case "workflow_step_failed":
      return "Suivi WhatsApp";
    case "workflow_run_completed":
      return "Suivi WhatsApp";
    case "prospect_restored":
      return "Prospect restauré";
    default:
      return action;
  }
}

function activityDescription(action: string, d: Record<string, unknown>): string {
  const wn = typeof d.workflow_name === "string" ? d.workflow_name : null;
  switch (action) {
    case "status_change": {
      const from = typeof d.from === "string" ? d.from : "?";
      const to = typeof d.to === "string" ? d.to : "?";
      return `Statut : ${from} → ${to}`;
    }
    case "workflow_enrolled":
      return wn ? `Inscrit au parcours « ${wn} »` : "Inscrit à un parcours";
    case "workflow_step_completed": {
      const st = typeof d.step_type === "string" ? d.step_type : "";
      const labels: Record<string, string> = {
        wait: "Attente terminée",
        linkedin_invite: "Invitation LinkedIn envoyée",
        linkedin_message: "Message LinkedIn envoyé",
        whatsapp_message: "Message WhatsApp envoyé",
      };
      return labels[st] ?? `Étape terminée (${st || "?"})`;
    }
    case "workflow_step_failed":
      return typeof d.error === "string" ? `Échec : ${d.error.slice(0, 200)}` : "Échec d’étape";
    case "workflow_run_completed":
      return wn ? `Parcours « ${wn} » terminé` : "Parcours terminé";
    case "prospect_restored": {
      const list = typeof d.bdd_name === "string" ? d.bdd_name : null;
      return list ? `Restauré depuis la corbeille — ajouté à « ${list} »` : "Restauré depuis la corbeille";
    }
    default:
      return JSON.stringify(d).slice(0, 200);
  }
}
