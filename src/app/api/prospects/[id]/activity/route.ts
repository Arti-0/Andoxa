import { createApiHandler, Errors } from "@/lib/api";
import { describeActivity } from "@/lib/prospect-activity";
import { getProspectStatuses } from "@/lib/prospects/statuses";

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

  // Per-org status names so "Statut : X → Y" reflects renamed/custom rows.
  const orgStatuses = await getProspectStatuses(ctx.supabase, ctx.workspaceId);
  const statusLabelByKey = new Map(
    orgStatuses.map((s) => [s.key, s.name] as const),
  );

  const items = (rows ?? []).map((r) => {
    const d = (r.details ?? {}) as Record<string, unknown>;
    const desc = describeActivity(r.action ?? "");
    // For status_change, swap the raw db keys for the org's current names.
    let body = desc.body(d);
    if (r.action === "status_change") {
      const from = typeof d.from === "string" ? d.from : "?";
      const to = typeof d.to === "string" ? d.to : "?";
      const fromLabel = statusLabelByKey.get(from) ?? from;
      const toLabel = statusLabelByKey.get(to) ?? to;
      body = `Statut : ${fromLabel} → ${toLabel}`;
    }
    return {
      id: r.id,
      action: r.action,
      created_at: r.created_at,
      actor_name: r.actor_id ? profileMap.get(r.actor_id) ?? null : null,
      workflow_id: r.workflow_id,
      workflow_name: r.workflow_id ? workflowMap.get(r.workflow_id) ?? null : null,
      title: desc.title,
      description: body,
      target_url: r.workflow_id ? `/workflows/${r.workflow_id}` : undefined,
    };
  });

  return { items };
});
