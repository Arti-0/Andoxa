import {
  createApiHandler,
  Errors,
  parseBody,
  getPagination,
} from "../../../lib/api";

/**
 * GET /api/call-sessions
 * List call sessions for the workspace
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { page, pageSize, offset } = getPagination(req);

  const { data, error, count } = await ctx.supabase
    .from("call_sessions")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw Errors.internal("Failed to fetch call sessions");
  }

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > offset + pageSize,
  };
});

/**
 * POST /api/call-sessions
 * Create a new call session with prospect_ids or bdd_ids (listes)
 * Body: { prospect_ids?: string[], bdd_ids?: string[], title?: string }
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    prospect_ids?: string[];
    bdd_ids?: string[];
    title?: string;
  }>(req);

  let prospectIds: string[] = [];

  if (body.prospect_ids?.length) {
    prospectIds = body.prospect_ids;
  } else if (body.bdd_ids?.length) {
    const { data: prospects, error } = await ctx.supabase
      .from("prospects")
      .select("id")
      .eq("organization_id", ctx.workspaceId)
      .in("bdd_id", body.bdd_ids)
      .is("deleted_at", null);

    if (error) {
      throw Errors.internal("Failed to resolve prospects from listes");
    }
    prospectIds = (prospects ?? []).map((p) => p.id);
  }

  if (prospectIds.length === 0) {
    throw Errors.validation({
      prospect_ids: "Aucun prospect sélectionné. Choisissez des prospects ou des listes.",
    });
  }

  const { data: session, error: sessionError } = await ctx.supabase
    .from("call_sessions")
    .insert({
      organization_id: ctx.workspaceId,
      created_by: ctx.userId,
      title: body.title ?? `Session ${new Date().toLocaleDateString("fr-FR")}`,
    })
    .select()
    .single();

  if (sessionError || !session) {
    throw Errors.internal("Failed to create call session");
  }

  const rows = prospectIds.map((prospect_id) => ({
    call_session_id: session.id,
    prospect_id,
  }));

  const { error: linkError } = await ctx.supabase
    .from("call_session_prospects")
    .insert(rows);

  if (linkError) {
    await ctx.supabase.from("call_sessions").delete().eq("id", session.id);
    throw Errors.internal("Failed to link prospects to session");
  }

  return session;
});
