import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { z } from "zod";

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(60).trim(),
  sort_order: z.number().int().nonnegative().optional(),
});

/**
 * GET /api/template-categories
 * List the org's template categories. Returns rows in sort_order, then name.
 * `template_categories` was added in migration 20260517150000_*.sql and is
 * seeded per-org with 5 default buckets ("Première prise de contact", etc.)
 * so the response is never empty for an existing org.
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  assertMessagerieAndTemplatesPlan(ctx);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("template_categories")
    .select("id, name, sort_order, created_at, updated_at")
    .eq("organization_id", ctx.workspaceId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw Errors.internal("Failed to fetch categories");
  return { items: data ?? [] };
});

/**
 * POST /api/template-categories
 * Create a new category. Conflict (same case-insensitive name) returns 409.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) throw Errors.badRequest("Workspace required");
  assertMessagerieAndTemplatesPlan(ctx);

  const body = await parseBody<z.infer<typeof CreateCategorySchema>>(req);
  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    throw Errors.validation(fieldErrors);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("template_categories")
    .insert({
      organization_id: ctx.workspaceId,
      name: parsed.data.name,
      sort_order: parsed.data.sort_order ?? 0,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    // 23505 = unique violation → the org already has this name.
    if ((error as { code?: string }).code === "23505") {
      throw Errors.validation({ name: "Une catégorie avec ce nom existe déjà" });
    }
    throw Errors.internal("Failed to create category");
  }
  return data;
});
