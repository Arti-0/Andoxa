import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { invalidate } from "@/lib/cache/redis";
import { PROSPECT_STATUSES, type ProspectStatus } from "@/lib/types/prospects";
import type { Database } from "@/lib/types/supabase";

type ProspectUpdateRow = Database["public"]["Tables"]["prospects"]["Update"];

/**
 * POST /api/prospects/bulk   (CRM-10)
 *
 * One endpoint for the four bulk actions exposed by the CRM toolbar /
 * Pipeline bulk bar. The shape is:
 *
 *   { ids: string[], action: "status" | "bdd" | "delete" | "restore", value?: string | null }
 *
 *   • action="status"  — value must be a canonical ProspectStatus
 *   • action="bdd"     — value is the target bdd_id (null to detach)
 *   • action="delete"  — soft-delete (sets deleted_at = now()); ignores value
 *   • action="restore" — clears deleted_at; ignores value
 *
 * Returns `{ updated: <number>, ids: string[] }`. Always pins
 * `organization_id = workspaceId` so callers can't reach across orgs even if
 * they pass foreign ids.
 */

const ACTIONS = ["status", "bdd", "delete", "restore"] as const;
type BulkAction = (typeof ACTIONS)[number];

export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const workspaceId = ctx.workspaceId;

  const body = await parseBody<{
    ids?: unknown;
    action?: unknown;
    value?: unknown;
  }>(req);

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  if (ids.length === 0) {
    throw Errors.validation({ ids: "Aucun prospect sélectionné" });
  }

  const action = body.action as BulkAction;
  if (!ACTIONS.includes(action)) {
    throw Errors.validation({ action: "Action invalide" });
  }

  const update: ProspectUpdateRow = {};
  switch (action) {
    case "status": {
      if (
        typeof body.value !== "string" ||
        !(PROSPECT_STATUSES as readonly string[]).includes(body.value)
      ) {
        throw Errors.validation({ value: "Statut invalide" });
      }
      update.status = body.value as ProspectStatus;
      break;
    }
    case "bdd": {
      if (body.value !== null && typeof body.value !== "string") {
        throw Errors.validation({ value: "bdd_id invalide" });
      }
      update.bdd_id = body.value as string | null;
      break;
    }
    case "delete": {
      update.deleted_at = new Date().toISOString();
      break;
    }
    case "restore": {
      update.deleted_at = null;
      break;
    }
  }

  const { data, error } = await ctx.supabase
    .from("prospects")
    .update(update)
    .eq("organization_id", workspaceId)
    .in("id", ids)
    .select("id");

  if (error) {
    console.error("[API] prospects/bulk error:", error);
    throw Errors.internal("Échec de l'action en masse");
  }

  await invalidate.prospects(workspaceId);

  return {
    updated: (data ?? []).length,
    ids: (data ?? []).map((r) => r.id),
  };
});
