import { createApiHandler, Errors } from "@/lib/api";
import type { NextRequest } from "next/server";
import type { Prospect } from "@/lib/types/prospects";

import { getProspectById } from "../route";
import { getLinkedChat, type LinkedChatPayload } from "../linked-chat/route";
import {
  getProspectEvents,
  type ProspectEventsPayload,
} from "../events/route";
import {
  getProspectEngagement,
  type ProspectEngagementPayload,
} from "../engagement/route";

/**
 * GET /api/prospects/[id]/overview
 *
 * Aggregator for the prospect detail page. One auth pass → parallel fan-out
 * for prospect data + linked chat + activity timeline + engagement counters.
 *
 * Replaces 4 separate /api/prospects/[id]/* calls that each paid the
 * createApiHandler boilerplate cost. The individual routes still exist for
 * direct callers (mutations, incremental refetches when one slice changes).
 *
 * `bdd` is fetched only when the prospect has `bdd_id` set — saves a round
 * trip for prospects not assigned to any list. (The CRM listing already
 * enriches `bdd_name` on the prospect itself; this is for the strip widget.)
 */

interface BddRow {
  id: string;
  name: string;
}

export interface ProspectOverviewPayload {
  prospect: Prospect;
  linkedChat: LinkedChatPayload;
  events: ProspectEventsPayload;
  engagement: ProspectEngagementPayload;
  bdd: BddRow | null;
}

export const GET = createApiHandler(
  async (req: NextRequest, ctx): Promise<ProspectOverviewPayload> => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    // .../prospects/<id>/overview
    const id = segments[segments.length - 2];
    if (!id) throw Errors.notFound("Prospect");

    // Prospect is needed first because we use `prospect.bdd_id` to decide
    // whether to look up the bdd row. The other three slices can fan out
    // alongside it.
    const [prospect, linkedChat, events, engagement] = await Promise.all([
      getProspectById(ctx, id),
      getLinkedChat(ctx, id),
      getProspectEvents(ctx, id),
      getProspectEngagement(ctx, id),
    ]);

    let bdd: BddRow | null = null;
    if (prospect.bdd_id) {
      const { data } = await ctx.supabase
        .from("bdd")
        .select("id, name")
        .eq("id", prospect.bdd_id)
        .eq("organization_id", ctx.workspaceId)
        .maybeSingle();
      bdd = (data as BddRow | null) ?? null;
    }

    return { prospect, linkedChat, events, engagement, bdd };
  },
);
