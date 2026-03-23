import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";
import { z } from "zod";
import { performSessionQuickBooking } from "@/lib/call-sessions/session-booking";

function getIds(req: NextRequest) {
  const segments = new URL(req.url).pathname.replace(/\/+$/, "").split("/");
  const csIdx = segments.indexOf("call-sessions");
  return {
    sessionId: segments[csIdx + 1] ?? "",
    prospectId: segments[csIdx + 3] ?? "",
  };
}

const bodySchema = z.object({
  prospect: z
    .object({
      email: z.string().optional(),
      phone: z.string().optional(),
      full_name: z.string().optional(),
    })
    .optional(),
  call_state: z
    .object({
      status: z.string().optional(),
      outcome: z.string().nullable().optional(),
      call_duration_s: z.number().int().min(0).optional(),
      called_at: z.string().nullable().optional(),
    })
    .optional(),
  booking: z
    .object({
      scheduled_for: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/call-sessions/[id]/prospects/[prospectId]/complete-step
 * Atomic-friendly flush when leaving a prospect: partial prospect update, session row, optional RDV.
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  const { sessionId, prospectId } = getIds(req);
  if (!sessionId || !prospectId || !ctx.workspaceId) {
    throw Errors.badRequest("Session and prospect IDs required");
  }

  const raw = await parseBody<Record<string, unknown>>(req);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    throw Errors.validation({ body: "Payload invalide" });
  }
  const body = parsed.data;

  const { data: session } = await ctx.supabase
    .from("call_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (!session) throw Errors.notFound("Call session");

  const { data: prospectRow } = await ctx.supabase
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (!prospectRow) throw Errors.notFound("Prospect");

  if (body.prospect) {
    const patch: Record<string, string> = {};
    if (body.prospect.email !== undefined) {
      const e = body.prospect.email.trim();
      if (e.length > 0) patch.email = e.toLowerCase();
    }
    if (body.prospect.phone !== undefined) {
      const p = body.prospect.phone.trim();
      if (p.length > 0) patch.phone = p;
    }
    if (body.prospect.full_name !== undefined) {
      const n = body.prospect.full_name.trim();
      if (n.length > 0) patch.full_name = n;
    }
    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { error: upErr } = await ctx.supabase
        .from("prospects")
        .update(patch)
        .eq("id", prospectId)
        .eq("organization_id", ctx.workspaceId);
      if (upErr) throw Errors.internal("Mise à jour prospect échouée");
    }
  }

  if (body.call_state && Object.keys(body.call_state).length > 0) {
    const updates: Record<string, unknown> = {};
    const cs = body.call_state;
    if (cs.status !== undefined) updates.status = cs.status;
    if (cs.outcome !== undefined) updates.outcome = cs.outcome;
    if (cs.call_duration_s !== undefined) updates.call_duration_s = cs.call_duration_s;
    if (cs.called_at !== undefined) updates.called_at = cs.called_at;
    if (Object.keys(updates).length > 0) {
      const { error: cspErr } = await ctx.supabase
        .from("call_session_prospects")
        .update(updates as never)
        .eq("call_session_id", sessionId)
        .eq("prospect_id", prospectId);
      if (cspErr) throw Errors.internal("Mise à jour appel échouée");
    }
  }

  if (body.booking && (body.booking.scheduled_for?.trim() || body.booking.notes?.trim())) {
    await performSessionQuickBooking(ctx.supabase, {
      organizationId: ctx.workspaceId,
      sessionId,
      prospectId,
      userId: ctx.userId,
      scheduled_for: body.booking.scheduled_for?.trim() || null,
      notes: body.booking.notes?.trim() || null,
    });
  }

  return { ok: true };
});
