import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { z } from "zod";

const UpdateTagSchema = z.object({
  name: z.string().min(1).max(40).trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").optional(),
});

function idFrom(req: NextRequest): string | null {
  const id = req.nextUrl.pathname.split("/").pop();
  return id && id !== "tags" ? id : null;
}

/**
 * PATCH /api/tags/[id]
 * Rename / recolor. Rename is safe — prospect_tags is FK-linked by id.
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const id = idFrom(req);
  if (!id) throw Errors.notFound("Tag");

  const body = await parseBody<z.infer<typeof UpdateTagSchema>>(req);
  const parsed = UpdateTagSchema.safeParse(body);
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
    .from("tags")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw Errors.validation({ name: "Un tag avec ce nom existe déjà" });
    }
    throw Errors.internal("Failed to update tag");
  }
  return data;
});

/**
 * DELETE /api/tags/[id]
 *
 * Deletes the tag and (via ON DELETE CASCADE) every prospect_tags row
 * referencing it. This is the intentional UX: tags are lightweight
 * labels, deleting one detaches it everywhere in one operation.
 * Settings UI surfaces the usage count before confirming.
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const id = idFrom(req);
  if (!id) throw Errors.notFound("Tag");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (error) throw Errors.internal("Failed to delete tag");
  return { success: true };
});
