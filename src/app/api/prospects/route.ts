import {
  createApiHandler,
  Errors,
  parseBody,
  getPagination,
  getSearchParams,
} from "../../../lib/api";

/**
 * GET /api/prospects
 * List prospects with filtering and pagination (no cache to avoid redis dependency when not installed)
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const params = getSearchParams(req);
  const { page, pageSize, offset } = getPagination(req);

  // Build query (exclude soft-deleted)
  let query = ctx.supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Apply filters
  if (params.status) {
    query = query.in("status", params.status.split(","));
  }
  if (params.source) {
    query = query.in("source", params.source.split(","));
  }
  if (params.bdd_id) {
    query = query.eq("bdd_id", params.bdd_id);
  }
  if (params.search) {
    query = query.or(
      `full_name.ilike.%${params.search}%,email.ilike.%${params.search}%,company.ilike.%${params.search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[API] Prospects fetch error:", error);
    throw Errors.internal("Failed to fetch prospects");
  }

  return {
    items: data || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  };
});

/**
 * POST /api/prospects
 * Create a new prospect
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    full_name: string;
    email?: string;
    phone?: string;
    company?: string;
    job_title?: string;
    linkedin_url?: string;
    bdd_id?: string;
    source?: string;
    status?: string;
  }>(req);

  // Validation
  if (!body.full_name) {
    throw Errors.validation({ full_name: "Le nom est requis" });
  }

  const insertPayload = {
    organization_id: ctx.workspaceId,
    user_id: ctx.userId,
    full_name: body.full_name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    job_title: body.job_title ?? null,
    linkedin: body.linkedin_url ?? null,
    bdd_id: body.bdd_id ?? null,
    source: body.source || "manual",
    status: body.status || "new",
  };

  const { data, error } = await ctx.supabase
    .from("prospects")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("[API] Prospect create error:", error);
    throw Errors.internal("Failed to create prospect");
  }

  return data;
});
