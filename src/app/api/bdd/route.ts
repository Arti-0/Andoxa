import {
  createApiHandler,
  Errors,
  getSearchParams,
  getPagination,
} from "../../../lib/api";

/**
 * GET /api/bdd
 * List BDD (listes d'import) for the current workspace
 * Filters: source, proprietaire, date_from, date_to, search
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const params = getSearchParams(req);
  const { page, pageSize, offset } = getPagination(req);

  let query = ctx.supabase
    .from("bdd")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (params.source) {
    query = query.in("source", params.source.split(","));
  }
  if (params.proprietaire) {
    query = query.eq("proprietaire", params.proprietaire);
  }
  if (params.date_from) {
    query = query.gte("created_at", params.date_from);
  }
  if (params.date_to) {
    query = query.lte("created_at", params.date_to + "T23:59:59.999Z");
  }
  if (params.search?.trim()) {
    query = query.ilike("name", `%${params.search.trim()}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[API] BDD fetch error:", error);
    throw Errors.internal("Failed to fetch listes d'import");
  }

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > offset + pageSize,
  };
});
