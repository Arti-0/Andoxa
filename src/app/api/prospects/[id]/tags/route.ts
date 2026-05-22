import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { z } from "zod";
import { emitWorkflowTrigger } from "@/lib/workflows/fire-trigger";

const AttachSchema = z.object({
  tag_id: z.string().uuid(),
});

const DetachSchema = z.object({
  tag_id: z.string().uuid(),
});

function prospectIdFrom(req: NextRequest): string | null {
  // /api/prospects/<id>/tags → ["", "api", "prospects", "<id>", "tags"]
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const idx = segments.indexOf("prospects");
  if (idx < 0 || idx + 1 >= segments.length) return null;
  const id = segments[idx + 1];
  return id && id !== "tags" ? id : null;
}

/**
 * POST /api/prospects/[id]/tags
 * Attach a tag to a prospect. Idempotent (ON CONFLICT DO NOTHING via the
 * junction PK). Emits the `on_tag` workflow trigger on a *new* insert.
 *
 * The trigger emission is best-effort — it must never break the attach.
 * Wrapped in a try/catch that swallows errors after logging.
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) throw Errors.badRequest("Workspace required");

  const prospectId = prospectIdFrom(req);
  if (!prospectId) throw Errors.notFound("Prospect");

  const body = await parseBody<z.infer<typeof AttachSchema>>(req);
  const parsed = AttachSchema.safeParse(body);
  if (!parsed.success) throw Errors.validation({ tag_id: "tag_id requis" });

  // Authorise: prospect must belong to the workspace.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prospect, error: pErr } = await (ctx.supabase as any)
    .from("prospects")
    .select("id, organization_id")
    .eq("id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .single();
  if (pErr || !prospect) throw Errors.notFound("Prospect");

  // Authorise: tag must belong to the same workspace.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tag, error: tErr } = await (ctx.supabase as any)
    .from("tags")
    .select("id, organization_id, name")
    .eq("id", parsed.data.tag_id)
    .eq("organization_id", ctx.workspaceId)
    .single();
  if (tErr || !tag) throw Errors.notFound("Tag");

  // Idempotent insert: upsert on the composite PK.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insertResult, error: insErr } = await (ctx.supabase as any)
    .from("prospect_tags")
    .upsert(
      {
        prospect_id: prospectId,
        tag_id: parsed.data.tag_id,
        created_by: ctx.userId,
      },
      { onConflict: "prospect_id,tag_id", ignoreDuplicates: true }
    )
    .select();

  if (insErr) throw Errors.internal("Failed to attach tag");

  // Only fire the workflow trigger when this is a new attachment.
  // With `ignoreDuplicates`, upsert returns [] for conflicts and [row] for inserts.
  const wasNewAttachment = Array.isArray(insertResult) && insertResult.length > 0;

  if (wasNewAttachment) {
    // Fire on_tag — best-effort. Each workflow checks its own
    // trigger_config.targetTagId against payload.tagId via matchesConfig.
    try {
      await emitWorkflowTrigger(ctx.supabase, {
        organizationId: ctx.workspaceId,
        prospectId,
        startedByUserId: ctx.userId,
        payload: { kind: "on_tag", tagId: parsed.data.tag_id },
      });
    } catch {
      // Sentry capture inside emitWorkflowTrigger.
    }
  }

  return { success: true, attached: wasNewAttachment };
});

/**
 * DELETE /api/prospects/[id]/tags
 * Detach a tag. Idempotent — deleting a non-existent attachment is OK.
 * Does NOT fire on_tag (that trigger is attach-only by design).
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const prospectId = prospectIdFrom(req);
  if (!prospectId) throw Errors.notFound("Prospect");

  const body = await parseBody<z.infer<typeof DetachSchema>>(req);
  const parsed = DetachSchema.safeParse(body);
  if (!parsed.success) throw Errors.validation({ tag_id: "tag_id requis" });

  // Auth check inline via prospect ownership.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prospect, error: pErr } = await (ctx.supabase as any)
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .single();
  if (pErr || !prospect) throw Errors.notFound("Prospect");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from("prospect_tags")
    .delete()
    .eq("prospect_id", prospectId)
    .eq("tag_id", parsed.data.tag_id);

  if (error) throw Errors.internal("Failed to detach tag");
  return { success: true };
});
