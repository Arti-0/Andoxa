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
  const workspaceId = ctx.workspaceId;
  if (!workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const params = getSearchParams(req);
  const { page, pageSize, offset } = getPagination(req);

  let query = ctx.supabase
    .from("bdd")
    .select("*", { count: "exact" })
    .eq("organization_id", workspaceId)
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

  const items = (data ?? []) as Array<{
    id: string;
    name: string;
    proprietaire: string | null;
    source: string;
    created_at: string | null;
    [k: string]: unknown;
  }>;

  // Fetch prospects count per list in parallel
  const bddIds = items.map((r) => r.id);
  const countPromises =
    bddIds.length > 0
      ? bddIds.map((bddId) =>
          ctx.supabase
            .from("prospects")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", workspaceId)
            .is("deleted_at", null)
            .eq("bdd_id", bddId)
        )
      : [];

  const countResults = await Promise.all(countPromises);
  const prospectsCountByBddId = new Map<string, number>();
  bddIds.forEach((id, i) => {
    const res = countResults[i];
    prospectsCountByBddId.set(id, res?.count ?? 0);
  });

  const phoneCountPromises =
    bddIds.length > 0
      ? bddIds.map((bddId) =>
          ctx.supabase
            .from("prospects")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", workspaceId)
            .is("deleted_at", null)
            .eq("bdd_id", bddId)
            .not("phone", "is", null)
            .neq("phone", "")
        )
      : [];

  const phoneCountResults = await Promise.all(phoneCountPromises);
  const phonesCountByBddId = new Map<string, number>();
  bddIds.forEach((id, i) => {
    const res = phoneCountResults[i];
    phonesCountByBddId.set(id, res?.count ?? 0);
  });

  const itemsWithCount = items.map((row) => ({
    ...row,
    prospects_count: prospectsCountByBddId.get(row.id) ?? 0,
    phones_count: phonesCountByBddId.get(row.id) ?? 0,
  }));

  return {
    items: itemsWithCount,
    total: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > offset + pageSize,
  };
});
