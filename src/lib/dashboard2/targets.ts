/**
 * Period objectives for dashboard v2.
 *
 * Until a dedicated `workspace_objectives` table exists we read targets from
 * `organizations.metadata.dashboard_targets` (a free-form JSON blob already in
 * use by other features). Missing keys fall back to sensible defaults derived
 * from realistic French outbound sales benchmarks.
 */

import type { Json } from "@/lib/types/supabase";

export interface DashboardTargets {
  rdv_per_month: number;
  closings_per_month: number;
}

const DEFAULT_TARGETS: DashboardTargets = {
  rdv_per_month: 30,
  closings_per_month: 8,
};

export function readDashboardTargets(metadata: Json | null | undefined): DashboardTargets {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { ...DEFAULT_TARGETS };
  }
  const raw = (metadata as Record<string, unknown>).dashboard_targets;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_TARGETS };
  }
  const obj = raw as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : fallback;
  return {
    rdv_per_month: num(obj.rdv_per_month, DEFAULT_TARGETS.rdv_per_month),
    closings_per_month: num(
      obj.closings_per_month,
      DEFAULT_TARGETS.closings_per_month,
    ),
  };
}
