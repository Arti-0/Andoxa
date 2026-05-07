import { createApiHandler, Errors } from "@/lib/api";
import {
  describeActivity,
  type ActivityKind,
} from "@/lib/prospect-activity";

/**
 * GET /api/prospects/:id/events   (CRM-13)
 *
 * Returns the unified activity timeline for a prospect, used by the
 * profile page TimelineSection. Reads `prospect_activity` (latest
 * first) and resolves each row's verb through the canonical registry
 * in `lib/prospect-activity.ts` so the kind / title / body match
 * exactly what the dashboard activity feed and the engagement
 * counters use.
 */

interface TimelineEventOut {
  id: string;
  kind: ActivityKind;
  /** "sent" / "received" — only meaningful for message kinds. */
  dir?: "sent" | "received";
  at: string;
  author: string | null;
  title: string;
  body: string;
}

export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const url = new URL(req.url);
  const id = url.pathname.split("/").slice(-2, -1)[0];
  if (!id) throw Errors.notFound("Prospect");

  const { data, error } = await ctx.supabase
    .from("prospect_activity")
    .select("id, action, details, actor_id, created_at")
    .eq("organization_id", ctx.workspaceId)
    .eq("prospect_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[API] prospect events error:", error);
    throw Errors.internal("Failed to fetch events");
  }

  // Resolve actor names in one batch.
  const actorIds = Array.from(
    new Set((data ?? []).map((r) => r.actor_id).filter(Boolean) as string[]),
  );
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      if (p.full_name) actorNames.set(p.id, p.full_name);
    }
  }

  const events: TimelineEventOut[] = (data ?? []).map((row) => {
    const desc = describeActivity(row.action ?? "");
    const details = (row.details ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      kind: desc.kind,
      dir: desc.dir,
      at: row.created_at ?? new Date().toISOString(),
      author: row.actor_id ? (actorNames.get(row.actor_id) ?? null) : "Système",
      title: desc.title,
      body: desc.body(details),
    };
  });

  return { events };
});
