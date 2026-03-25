import {
  createApiHandler,
  Errors,
  parseBody,
  getPagination,
  getSearchParams,
} from "../../../lib/api";

/** Retire % et _ pour un fallback ilike sans caractères joker utilisateur */
function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().replace(/[%_]/g, " ");
}

/**
 * GET /api/prospects
 * List prospects with filtering and pagination (no cache to avoid redis dependency when not installed)
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }
  const workspaceId: string = ctx.workspaceId;

  const params = getSearchParams(req);
  const { page, pageSize, offset } = getPagination(req);

  const searchTrimmed = params.search?.trim() ?? "";

  async function enrichWithLinkedChat<T extends { id: string }>(items: T[]): Promise<(T & { linked_chat_id: string | null })[]> {
    const prospectIds = items.map((p) => p.id);
    const prospectToChat: Record<string, string> = {};
    if (prospectIds.length > 0) {
      const { data: chatRows } = await ctx.supabase
        .from("unipile_chat_prospects")
        .select("prospect_id, unipile_chat_id")
        .eq("organization_id", workspaceId)
        .in("prospect_id", prospectIds);

      for (const r of chatRows ?? []) {
        if (r.prospect_id && r.unipile_chat_id) {
          prospectToChat[r.prospect_id] = r.unipile_chat_id;
        }
      }
    }
    return items.map((p) => ({
      ...p,
      linked_chat_id: prospectToChat[p.id] ?? null,
    }));
  }

  // Recherche : RPC insensible à la casse et aux accents (extension unaccent — voir migrations/003)
  if (searchTrimmed) {
    const statuses = params.status ? params.status.split(",").filter(Boolean) : null;
    const sources = params.source ? params.source.split(",").filter(Boolean) : null;
    const bddId = params.bdd_id?.trim() || null;

    const { data: rpcResult, error: rpcError } = await ctx.supabase.rpc("rpc_prospects_list_with_search", {
      p_organization_id: workspaceId,
      p_search: searchTrimmed,
      p_limit: pageSize,
      p_offset: offset,
      p_bdd_id: bddId,
      p_statuses: statuses && statuses.length > 0 ? statuses : null,
      p_sources: sources && sources.length > 0 ? sources : null,
    });

    if (!rpcError && rpcResult && typeof rpcResult === "object" && "items" in rpcResult) {
      const parsed = rpcResult as { items: unknown[]; total: number };
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      const total = typeof parsed.total === "number" ? parsed.total : 0;
      const itemsWithChat = await enrichWithLinkedChat(rawItems as { id: string }[]);

      return {
        items: itemsWithChat,
        total,
        page,
        pageSize,
        hasMore: total > offset + pageSize,
      };
    }

    if (rpcError) {
      console.warn("[API] rpc_prospects_list_with_search indisponible, fallback ilike:", rpcError.message);
    }

    let query = ctx.supabase
      .from("prospects")
      .select("*", { count: "exact" })
      .eq("organization_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params.status) {
      query = query.in("status", params.status.split(","));
    }
    if (params.source) {
      query = query.in("source", params.source.split(","));
    }
    if (params.bdd_id) {
      query = query.eq("bdd_id", params.bdd_id);
    }
    const safe = sanitizeIlikeTerm(searchTrimmed);
    if (safe.length > 0) {
      query = query.or(
        `full_name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[API] Prospects fetch error:", error);
      throw Errors.internal("Failed to fetch prospects");
    }

    const items = data || [];
    const itemsWithChat = await enrichWithLinkedChat(items);

    return {
      items: itemsWithChat,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > offset + pageSize,
    };
  }

  // Build query (exclude soft-deleted)
  let query = ctx.supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .eq("organization_id", workspaceId)
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

  const { data, error, count } = await query;

  if (error) {
    console.error("[API] Prospects fetch error:", error);
    throw Errors.internal("Failed to fetch prospects");
  }

  const items = data || [];
  const itemsWithChat = await enrichWithLinkedChat(items);

  return {
    items: itemsWithChat,
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
