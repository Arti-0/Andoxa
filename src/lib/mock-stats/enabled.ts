/**
 * Local-dev mock stats flag (.env.local only — never enable in production).
 *
 * Set either variable in `.env.local`:
 *   MOCK_STATS=true                  — server API routes
 *   NEXT_PUBLIC_MOCK_STATS=true      — required for client-side KPI hooks
 *                                      (calendar KPI); also works on server.
 *
 * When enabled, numeric KPI / stat endpoints return plausible random values
 * instead of querying real aggregates. Tables and entity lists stay live.
 */
export function isMockStatsEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.MOCK_STATS === "true" ||
    process.env.NEXT_PUBLIC_MOCK_STATS === "true"
  );
}

/** Client bundle — only NEXT_PUBLIC_* is inlined at build time. */
export function isMockStatsEnabledClient(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_MOCK_STATS === "true";
}
