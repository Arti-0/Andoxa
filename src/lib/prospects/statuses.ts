/**
 * Per-org status fetch helpers, used by:
 *   - server code that needs to look up statuses by id/key during writes
 *   - client UIs (CRM kanban, status pill, workflow CRM picker, trigger
 *     config picker, CRM filters)
 *
 * Source of truth: `prospect_statuses` table. Every org is seeded with 10
 * defaults via the trigger in 20260521120000_prospect_statuses_new_defaults_and_org_trigger.
 *
 * The legacy 7-entry `PROSPECT_STATUS_LABELS` in @/lib/types/prospects
 * survives only as a synchronous fallback for the brief window before
 * /api/prospect-statuses resolves on first paint — callers should not
 * extend it for new statuses.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/lib/types/prospects";
import { useWorkspace } from "@/lib/workspace";

export interface ProspectStatusRow {
  id: string;
  key: string;
  name: string;
  color: string;
  sort_order: number;
  is_archived: boolean;
  /** Permanent status: renameable but not archivable/deletable. */
  is_system: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Stable key shared across every consumer so React Query dedupes the fetch. */
export const PROSPECT_STATUSES_QUERY_KEY = ["prospect-statuses"] as const;

// --------------------------------------------------------------------- server

export async function getProspectStatuses(
  supabase: SupabaseClient,
  organizationId: string,
  opts: { includeArchived?: boolean } = {}
): Promise<ProspectStatusRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("prospect_statuses")
    .select("id, key, name, color, sort_order, is_archived, is_system, created_at, updated_at")
    .eq("organization_id", organizationId);
  if (!opts.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q.order("sort_order").order("name");
  if (error) throw error;
  return (data ?? []) as ProspectStatusRow[];
}

/**
 * Resolve a status row from a free-form input (id, key, or name) within
 * the org. Used by /api/prospects/[id] PATCH so callers can keep sending
 * either the legacy key or the new id without breaking.
 */
export async function findStatusByAny(
  supabase: SupabaseClient,
  organizationId: string,
  value: string
): Promise<ProspectStatusRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("prospect_statuses")
    .select("id, key, name, color, sort_order, is_archived, is_system, created_at, updated_at")
    .eq("organization_id", organizationId)
    .or(`id.eq.${value},key.eq.${value},name.ilike.${value}`)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as ProspectStatusRow | null;
}

// --------------------------------------------------------------------- client

interface StatusesEnvelope {
  items?: ProspectStatusRow[];
}

function unwrapEnvelope<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * React hook — shared cache via React Query. Every consumer using the same
 * `includeArchived` option shares the underlying fetch.
 *
 * Default (active only) is what the kanban, status pills, and CRM filter
 * want. The settings page passes `includeArchived: true` so admins can
 * restore archived rows.
 */
export function useProspectStatuses(opts: { includeArchived?: boolean } = {}): {
  statuses: ProspectStatusRow[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const includeArchived = !!opts.includeArchived;
  const { workspaceId } = useWorkspace();
  const query = useQuery({
    // Workspace scoping in the key so cache flushes when the user switches orgs.
    queryKey: [...PROSPECT_STATUSES_QUERY_KEY, workspaceId, includeArchived] as const,
    queryFn: async () => {
      const url = includeArchived
        ? "/api/prospect-statuses?include_archived=1"
        : "/api/prospect-statuses";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const payload = unwrapEnvelope<StatusesEnvelope>(json);
      return payload?.items ?? [];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  return {
    statuses: query.data ?? [],
    loading: query.isPending,
    refresh: async () => {
      await query.refetch();
    },
  };
}

// --------------------------------------------------------------------- lookup

export interface ResolvedStatusDisplay {
  /** Display name (per-org override wins; falls back to the legacy label). */
  label: string;
  /** Per-org hex colour; falls back to a neutral slate when nothing is found. */
  hex: string;
  /** Stable id when the status exists in the per-org table, else null. */
  id: string | null;
}

const LEGACY_KEYS = Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[];

function isLegacyKey(value: string): value is ProspectStatus {
  return (LEGACY_KEYS as string[]).includes(value);
}

const LEGACY_HEX: Record<ProspectStatus, string> = {
  new: "#94a3b8",
  contacted: "#60a5fa",
  qualified: "#2563eb",
  rdv: "#0ea5e9",
  proposal: "#a855f7",
  won: "#16a34a",
  lost: "#ef4444",
};

/**
 * Hook returning a synchronous lookup function from the loaded per-org
 * statuses, falling back to the seeded label/hex maps for the 7 legacy
 * keys when the dynamic data hasn't arrived yet.
 *
 * Pattern is intentional: components shouldn't render blank pills during
 * the first render — the fallback gives correct values for every org
 * with the default seed, and the dynamic value upgrades silently once
 * the fetch resolves.
 */
export function useStatusResolver(): (
  key: string | null | undefined,
) => ResolvedStatusDisplay | null {
  const { statuses } = useProspectStatuses();
  return useMemo(() => {
    const byKey = new Map(statuses.map((s) => [s.key, s] as const));
    const byId = new Map(statuses.map((s) => [s.id, s] as const));
    return (key: string | null | undefined): ResolvedStatusDisplay | null => {
      if (!key) return null;
      const dynamic = byKey.get(key) ?? byId.get(key);
      if (dynamic) {
        return { label: dynamic.name, hex: dynamic.color, id: dynamic.id };
      }
      if (isLegacyKey(key)) {
        return {
          label: PROSPECT_STATUS_LABELS[key],
          hex: LEGACY_HEX[key],
          id: null,
        };
      }
      return null;
    };
  }, [statuses]);
}
