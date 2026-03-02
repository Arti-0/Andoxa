import { createApiHandler } from "@/lib/api";

/**
 * GET /api/announcements
 * Fetch active announcements (RLS filters by active + date range)
 */
export const GET = createApiHandler(async (_req, ctx) => {
  const { data } = await ctx.supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return { announcements: data ?? [] };
});
