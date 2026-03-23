import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";
import { performSessionQuickBooking } from "@/lib/call-sessions/session-booking";

/**
 * POST /api/call-sessions/[id]/booking
 * Quick-book a prospect from a call session.
 * Creates both a quick_booking record AND an event for the calendar.
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  const segments = new URL(req.url).pathname.split("/");
  const sessionId = segments[segments.indexOf("call-sessions") + 1];

  if (!sessionId || !ctx.workspaceId) throw Errors.badRequest("Session ID required");

  const body = await parseBody<{
    prospect_id: string;
    scheduled_for?: string;
    notes?: string;
  }>(req);

  if (!body.prospect_id) throw Errors.validation({ prospect_id: "Requis" });

  try {
    const data = await performSessionQuickBooking(ctx.supabase, {
      organizationId: ctx.workspaceId,
      sessionId,
      prospectId: body.prospect_id,
      userId: ctx.userId,
      scheduled_for: body.scheduled_for ?? null,
      notes: body.notes ?? null,
    });
    return data;
  } catch {
    throw Errors.internal("Failed to create booking");
  }
});
