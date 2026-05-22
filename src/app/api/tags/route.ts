import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { z } from "zod";

const CreateTagSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(40).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").optional(),
});

/**
 * GET /api/tags
 * Lists the workspace's tag dictionary. Optional `?q=foo` does a
 * case-insensitive name prefix match for picker autocomplete.
 *
 * Returns `usage_count` (number of prospect_tags rows) so the settings
 * UI can warn before deleting an in-use tag. Counted via a left join
 * folded into the same round trip.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const q = req.nextUrl.searchParams.get("q")?.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from("tags")
    .select("id, name, color, created_at, updated_at, usage_count:prospect_tags(count)")
    .eq("organization_id", ctx.workspaceId);

  if (q) query = query.ilike("name", `${q}%`);

  const { data, error } = await query.order("name", { ascending: true });

  if (error) throw Errors.internal("Failed to fetch tags");

  // PostgREST returns aggregate as [{count: N}]; flatten for the client.
  const items = (data ?? []).map((row: { usage_count?: { count: number }[] } & Record<string, unknown>) => ({
    ...row,
    usage_count: Array.isArray(row.usage_count) ? row.usage_count[0]?.count ?? 0 : 0,
  }));

  return { items };
});

/**
 * POST /api/tags
 * Create a new tag. 23505 → friendly "already exists" error.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const body = await parseBody<z.infer<typeof CreateTagSchema>>(req);
  const parsed = CreateTagSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    throw Errors.validation(fieldErrors);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("tags")
    .insert({
      organization_id: ctx.workspaceId,
      name: parsed.data.name,
      color: parsed.data.color ?? "#64748b",
    })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw Errors.validation({ name: "Un tag avec ce nom existe déjà" });
    }
    throw Errors.internal("Failed to create tag");
  }
  return data;
});
