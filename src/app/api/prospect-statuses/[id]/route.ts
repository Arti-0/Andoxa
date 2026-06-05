import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { z } from "zod";
import {
  deleteProspectStatus,
  StatusActionError,
} from "@/lib/prospects/status-delete";
import { invalidate } from "@/lib/cache/redis";

const UpdateStatusSchema = z.object({
  name: z.string().min(1).max(60).trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").optional(),
  sort_order: z.number().int().nonnegative().optional(),
  is_archived: z.boolean().optional(),
});

function idFrom(req: NextRequest): string | null {
  const id = req.nextUrl.pathname.split("/").pop();
  return id && id !== "prospect-statuses" ? id : null;
}

/**
 * PATCH /api/prospect-statuses/[id]
 *
 * Rename / recolor / reorder / archive. We deliberately DO NOT rewrite
 * `key` here — renaming a display label must not orphan the legacy
 * prospects.status text column. If the user wants to change the
 * machine identifier, they delete + recreate (and reassign).
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const id = idFrom(req);
  if (!id) throw Errors.notFound("Statut");

  const body = await parseBody<z.infer<typeof UpdateStatusSchema>>(req);
  const parsed = UpdateStatusSchema.safeParse(body);
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
    .from("prospect_statuses")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw Errors.validation({ name: "Un statut avec ce nom existe déjà" });
    }
    throw Errors.internal("Failed to update status");
  }
  return data;
});

const DeleteStatusSchema = z.object({
  transfer_to_id: z.string().uuid().optional(),
});

/**
 * DELETE /api/prospect-statuses/[id]
 *
 * When prospects or workflows reference this status, the client must send
 * `{ transfer_to_id }` so we reassign prospects and rewrite workflow
 * trigger/steps before deleting the row.
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const id = idFrom(req);
  if (!id) throw Errors.notFound("Statut");

  let transferToId: string | undefined;
  const rawBody = await req.text();
  if (rawBody.trim()) {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw Errors.badRequest("Invalid JSON body");
    }
    const parsed = DeleteStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw Errors.validation({
        transfer_to_id: "Statut de remplacement invalide",
      });
    }
    transferToId = parsed.data.transfer_to_id;
  }

  try {
    const result = await deleteProspectStatus(
      ctx.supabase,
      ctx.workspaceId,
      id,
      transferToId,
    );
    await invalidate.prospects(ctx.workspaceId);
    return { success: true, ...result };
  } catch (err) {
    // User-actionable problems (missing / identical replacement status, no
    // replacement chosen) carry a clean French message — surface it as a 400
    // so the dialog can guide the user. `badRequest` puts the text in
    // `error.message`, which is what the client reads.
    if (err instanceof StatusActionError) {
      throw Errors.badRequest(err.message);
    }
    // Anything else is an unexpected server/DB fault (e.g. a constraint from
    // migration drift). Log the full detail — the wrapped Postgres code/message
    // from `toDbError` — for Sentry, but show the user a clean line instead of
    // raw SQL like "column prospects.status_id does not exist [42703]".
    console.error("[prospect-statuses DELETE] failed:", err);
    throw Errors.internal(
      "La suppression du statut a échoué. Réessayez ; si le problème persiste, contactez le support.",
    );
  }
});
