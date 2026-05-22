import { useQuery } from "@tanstack/react-query";

import type { CappedResource } from "@/lib/billing/require-capacity";

export interface LimitState {
  /** Current count of the resource in the active workspace. */
  used: number;
  /** Plan cap. `-1` means unlimited. */
  limit: number;
  /** True if the workspace can add one more unit of the resource. */
  canUse: boolean;
  /** `limit - used`, or `Infinity` when unlimited. */
  remaining: number;
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
}

type LimitsPayload = Record<
  CappedResource,
  { used: number; limit: number; canUse: boolean }
>;

async function fetchLimits(): Promise<LimitsPayload> {
  const res = await fetch("/api/usage/limits", { credentials: "include" });
  if (!res.ok) throw new Error("Impossible de charger les limites du plan");
  const json = await res.json();
  return (json?.data ?? json) as LimitsPayload;
}

/**
 * Read the current plan-limit state for one resource (seats, prospects,
 * campaigns) in the active workspace.
 *
 *   const seats = useLimit("users");
 *   if (!seats.canUse) showUpgradePrompt();
 *
 * The underlying `/api/usage/limits` response covers every capped resource
 * in one round-trip, so multiple `useLimit` calls share a single React Query
 * cache entry — no fan-out.
 */
export function useLimit(resource: CappedResource): LimitState {
  const { data, isLoading } = useQuery({
    queryKey: ["plan-limits"],
    queryFn: fetchLimits,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const slot = data?.[resource];
  const limit = slot?.limit ?? -1;
  const used = slot?.used ?? 0;
  const remaining = limit === -1 ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);
  return {
    used,
    limit,
    canUse: slot?.canUse ?? true,
    remaining,
    isLoading,
  };
}
