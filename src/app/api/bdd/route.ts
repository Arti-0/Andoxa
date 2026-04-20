import {
  createApiHandler,
  Errors,
  getSearchParams,
  getPagination,
  parseBody,
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

  const { data, error } = await ctx.supabase.rpc("get_bdd_with_counts", {
    p_organization_id: workspaceId,
    p_limit: pageSize,
    p_offset: offset,
    p_search: params.search?.trim() || null,
    p_source: params.source?.trim() || null,
    p_proprietaire: params.proprietaire?.trim() || null,
    p_date_from: params.date_from?.trim() || null,
    p_date_to: params.date_to?.trim()
      ? `${params.date_to.trim()}T23:59:59.999Z`
      : null,
  });

  if (error) {
    console.error("[API] BDD RPC error:", error);
    throw Errors.internal("Failed to fetch listes d'import");
  }

  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    source: string;
    proprietaire: string | null;
    created_at: string | null;
    updated_at: string | null;
    prospects_count: number | string;
    phones_count: number | string;
    total_count: number | string;
  }>;

  const total = rows[0] != null ? Number(rows[0].total_count) : 0;

  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    source: row.source,
    proprietaire: row.proprietaire,
    created_at: row.created_at,
    updated_at: row.updated_at,
    prospects_count: Number(row.prospects_count),
    phones_count: Number(row.phones_count),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: total > offset + pageSize,
  };
});

/**
 * POST /api/bdd
 * Crée une liste d’import (BDD) dans le workspace courant.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{ name?: string }>(req);
  const name = String(body.name ?? "").trim();
  if (!name) {
    throw Errors.validation({ name: "Le nom de la liste est requis" });
  }

  const { data: existing } = await ctx.supabase
    .from("bdd")
    .select("*")
    .eq("organization_id", ctx.workspaceId)
    .ilike("name", name)
    .limit(5);
  const matched = (existing ?? []).find(
    (l) => l.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (matched) {
    const { count: prospectsCount } = await ctx.supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("bdd_id", matched.id)
      .is("deleted_at", null);
    return {
      ...matched,
      prospects_count: prospectsCount ?? 0,
      phones_count: 0,
      reused: true,
    };
  }

  const { data, error } = await ctx.supabase
    .from("bdd")
    .insert({
      name,
      organization_id: ctx.workspaceId,
      proprietaire: ctx.userId,
      source: "linkedin_extension",
      csv_url: null,
      csv_hash: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[API] BDD create error:", error);
    throw Errors.internal("Impossible de creer la liste");
  }

  return {
    ...data,
    prospects_count: 0,
    phones_count: 0,
    reused: false,
  };
});
