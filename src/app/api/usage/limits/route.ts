import { createApiHandler } from "@/lib/api";
import { readCapacity, type CappedResource } from "@/lib/billing/require-capacity";

/**
 * GET /api/usage/limits
 *
 * Plan-limit state for the active workspace. Returns `{ used, limit, canUse }`
 * for every capped resource the UI cares about. Used by the `useLimit` hook
 * to drive preventive-UX gates (e.g. hide "Inviter un membre" at the cap).
 *
 * Limit `-1` means unlimited. `canUse` is `false` when adding 1 more would
 * exceed the cap — clients should read this before showing an add action.
 */
export const GET = createApiHandler(
  async (_req, ctx) => {
    const resources: CappedResource[] = ["users", "prospects", "campaigns"];
    const entries = await Promise.all(
      resources.map(async (r) => [r, await readCapacity(ctx, r)] as const)
    );
    return Object.fromEntries(entries) as Record<
      CappedResource,
      { used: number; limit: number; canUse: boolean }
    >;
  },
  { requireWorkspace: true }
);
