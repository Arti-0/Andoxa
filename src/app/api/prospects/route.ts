import {
  createApiHandler,
  Errors,
  parseBody,
  getPagination,
  getSearchParams,
} from "../../../lib/api";
import { invalidate } from "@/lib/cache/redis";
import { enrichProspects } from "../../../lib/crm/enrich-prospects";
import { isMockStatsEnabled, mockProspectsTotal } from "@/lib/mock-stats";
import type { Prospect } from "../../../lib/types/prospects";

/** Retire % et _ pour un fallback ilike sans caractères joker utilisateur */
function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().replace(/[%_]/g, " ");
}

function shouldMockProspectsTotal(params: Record<string, string | undefined>): boolean {
  return (
    !params.ids &&
    !params.search?.trim() &&
    !params.status &&
    !params.source &&
    !params.bdd_id
  );
}

function resolveTotal(
  params: Record<string, string | undefined>,
  count: number,
): number {
  if (isMockStatsEnabled() && shouldMockProspectsTotal(params)) {
    return mockProspectsTotal();
  }
  return count;
}

/**
 * GET /api/prospects
 * List prospects with filtering and pagination.
 * Listing is not wrapped in cache yet; prospect mutation routes still call
 * `invalidate.prospects` so keys stay coherent when list caching is enabled.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }
  const workspaceId: string = ctx.workspaceId;

  const params = getSearchParams(req);
  const { page, pageSize, offset } = getPagination(req);

  // ── Bulk-by-ids short-circuit (used by /messagerie to hydrate conversation
  // rows in one round-trip instead of N x /api/prospects/[id]). Returns the
  // raw rows without enrichProspects since the messagerie row only needs the
  // display fields. Hard cap at 200 to avoid pathological queries.
  const idsParam = params.ids?.trim();
  if (idsParam) {
    const ids = [
      ...new Set(
        idsParam
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      ),
    ].slice(0, 200);
    if (ids.length === 0) {
      return { items: [], total: 0, page: 1, pageSize: 0, hasMore: false };
    }
    const { data, error } = await ctx.supabase
      .from("prospects")
      .select("*")
      .eq("organization_id", workspaceId)
      .in("id", ids);
    if (error) {
      console.error("[API] Prospects bulk-ids fetch error:", error);
      throw Errors.internal("Failed to fetch prospects");
    }
    const items = (data ?? []) as Prospect[];
    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      hasMore: false,
    };
  }

  const searchTrimmed = params.search?.trim() ?? "";

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
      const total = resolveTotal(
        params,
        typeof parsed.total === "number" ? parsed.total : 0,
      );
      const enriched = await enrichProspects(
        ctx.supabase,
        workspaceId,
        rawItems as Prospect[],
      );
      return {
        items: enriched,
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

    const items = (data || []) as Prospect[];
    const enriched = await enrichProspects(ctx.supabase, workspaceId, items);

    return {
      items: enriched,
      total: resolveTotal(params, count || 0),
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

  const items = (data || []) as Prospect[];
  const enriched = await enrichProspects(ctx.supabase, workspaceId, items);

  return {
    items: enriched,
    total: resolveTotal(params, count || 0),
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

  await invalidate.prospects(ctx.workspaceId);

  return data;
});
