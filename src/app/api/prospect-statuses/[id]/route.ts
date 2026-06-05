import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { z } from "zod";
import { deleteProspectStatus } from "@/lib/prospects/status-delete";
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
    const message = err instanceof Error ? err.message : "Suppression impossible";
    if (
      message.includes("remplacement") ||
      message.includes("transférer") ||
      message.includes("différent") ||
      message.includes("introuvable")
    ) {
      throw Errors.validation({ _: message });
    }
    // Surface the real cause instead of an opaque "Failed to delete status" —
    // a swallowed DB error (e.g. a constraint from migration drift) made this
    // impossible to diagnose.
    console.error("[prospect-statuses DELETE] failed:", err);
    throw Errors.internal(`Suppression du statut impossible : ${message}`);
  }
});
