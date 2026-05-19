import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { z } from "zod";

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(60).trim().optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

function idFrom(req: NextRequest): string | null {
  const id = req.nextUrl.pathname.split("/").pop();
  return id && id !== "template-categories" ? id : null;
}

/**
 * PATCH /api/template-categories/[id]
 * Rename or reorder. Templates pointing at the category keep their FK.
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  assertMessagerieAndTemplatesPlan(ctx);

  const id = idFrom(req);
  if (!id) throw Errors.notFound("Catégorie");

  const body = await parseBody<z.infer<typeof UpdateCategorySchema>>(req);
  const parsed = UpdateCategorySchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    throw Errors.validation(fieldErrors);
  }
  if (Object.keys(parsed.data).length === 0) {
    throw Errors.validation({ _: "Aucune modification fournie" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("template_categories")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw Errors.validation({ name: "Une catégorie avec ce nom existe déjà" });
    }
    throw Errors.internal("Failed to update category");
  }
  return data;
});

/**
 * DELETE /api/template-categories/[id]
 * Removes the category. Templates pointing at it get category_id = NULL
 * (ON DELETE SET NULL on the FK).
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  assertMessagerieAndTemplatesPlan(ctx);

  const id = idFrom(req);
  if (!id) throw Errors.notFound("Catégorie");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from("template_categories")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (error) throw Errors.internal("Failed to delete category");
  return { success: true };
});
