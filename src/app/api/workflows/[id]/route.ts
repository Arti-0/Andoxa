import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import type { Json } from "@/lib/types/supabase";
import {
  safeParseWorkflowDefinition,
  tryBuildPublishedDefinition,
  mergeWorkflowMetadata,
  isWorkflowColorKey,
  isWorkflowIconKey,
  type WorkflowUiState,
} from "@/lib/workflows";
import { getWorkflowPublishedDefinition } from "@/lib/workflows/queries";

function getWorkflowIdFromUrl(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("workflows");
  return segments[i + 1] ?? "";
}

/**
 * GET /api/workflows/[id]
 */
export const GET = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const id = getWorkflowIdFromUrl(req);
  if (!id) throw Errors.badRequest("ID workflow manquant");

  const { data: wf, error } = await ctx.supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (error) throw Errors.internal("Erreur chargement workflow");
  if (!wf) throw Errors.notFound("Workflow");

  const canLaunch = wf.published_definition != null;
  let launch_prereq_message: string | null = null;
  if (!canLaunch) {
    const parsed = safeParseWorkflowDefinition(wf.draft_definition);
    if (parsed.success) {
      const built = await tryBuildPublishedDefinition(ctx.supabase, ctx.userId!, parsed.data);
      if (!built.ok) {
        launch_prereq_message = built.message;
      } else {
        launch_prereq_message =
          "Le parcours est cohérent : enregistrez-le depuis cette fiche (Modifier → Sauvegarder) pour activer le lancement sur les listes.";
      }
    } else {
      launch_prereq_message =
        "Ajoutez au moins une étape valide, puis enregistrez le parcours depuis cette fiche.";
    }
  }

  return { workflow: wf, can_launch: canLaunch, launch_prereq_message };
});

/**
 * PATCH /api/workflows/[id]
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const id = getWorkflowIdFromUrl(req);
  if (!id) throw Errors.badRequest("ID workflow manquant");

  const body = await parseBody<{
    name?: string;
    description?: string | null;
    is_template?: boolean;
    is_active?: boolean;
    draft_definition?: unknown;
    pending_enrollment_bdd_ids?: string[];
    ui?: {
      icon?: string;
      color?: string;
      trigger?: string;
      canvas?: Record<string, { x: number; y: number }>;
    };
  }>(req);

  const { data: existing } = await ctx.supabase
    .from("workflows")
    .select("id, metadata, is_active")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (!existing) throw Errors.notFound("Workflow");

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw Errors.validation({ name: "Nom requis" });
    updates.name = name;
  }

  if (body.description !== undefined) {
    if (body.description === null) {
      updates.description = null;
    } else {
      const trimmed = String(body.description).trim();
      updates.description = trimmed.length ? trimmed : null;
    }
  }

  if (body.is_template !== undefined) {
    updates.is_template = Boolean(body.is_template);
  }

  if (body.is_active !== undefined) {
    const on = Boolean(body.is_active);
    if (on) {
      const pub = await getWorkflowPublishedDefinition(ctx.supabase, id);
      if (!pub) {
        throw Errors.badRequest(
          "Enregistrez d’abord un parcours prêt à lancer (étapes + comptes) depuis la fiche workflow."
        );
      }
    }
    updates.is_active = on;
  }

  // When a draft was sent but `tryBuildPublishedDefinition` rejects it
  // (validation issue or missing channel account), we keep the save successful
  // but surface the reason so the client can warn the user the workflow can
  // neither be activated nor launched until they fix it.
  let publishWarning: { reason: string; message: string } | null = null;

  if (body.draft_definition !== undefined) {
    if (existing.is_active) {
      throw Errors.badRequest("Mettez le workflow en pause pour modifier le parcours.");
    }
    const parsed = safeParseWorkflowDefinition(body.draft_definition);
    if (!parsed.success) {
      throw Errors.validation({
        draft_definition:
          parsed.error.flatten().formErrors.join(", ") || "Définition invalide",
      });
    }
    updates.draft_definition = parsed.data;
    const built = await tryBuildPublishedDefinition(ctx.supabase, ctx.userId, parsed.data);
    if (built.ok) {
      updates.published_definition = built.definition as Json;
    } else {
      // Wipe any stale published_definition so the canvas/list correctly
      // reflect that the workflow can't be launched.
      updates.published_definition = null;
      publishWarning = { reason: built.reason, message: built.message };
    }
  }

  if (body.pending_enrollment_bdd_ids !== undefined) {
    const ids = body.pending_enrollment_bdd_ids.filter(
      (x): x is string => typeof x === "string" && x.length > 0
    );
    const prevMeta =
      existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};
    updates.metadata = { ...prevMeta, pending_enrollment_bdd_ids: ids };
  }

  if (body.ui !== undefined) {
    const uiPatch: Partial<WorkflowUiState> = {};
    if (body.ui.icon !== undefined && isWorkflowIconKey(body.ui.icon)) {
      uiPatch.icon = body.ui.icon;
    }
    if (body.ui.color !== undefined && isWorkflowColorKey(body.ui.color)) {
      uiPatch.color = body.ui.color;
    }
    if (typeof body.ui.trigger === "string" && body.ui.trigger.length > 0) {
      uiPatch.trigger = body.ui.trigger;
    }
    if (body.ui.canvas !== undefined) {
      // Accept any record of step id → {x,y}; deeper validation in parseWorkflowUi at read time.
      const sanitized: Record<string, { x: number; y: number }> = {};
      for (const [k, v] of Object.entries(body.ui.canvas)) {
        if (
          v &&
          typeof v === "object" &&
          typeof (v as { x?: unknown }).x === "number" &&
          typeof (v as { y?: unknown }).y === "number"
        ) {
          sanitized[k] = { x: (v as { x: number }).x, y: (v as { y: number }).y };
        }
      }
      uiPatch.canvas = sanitized;
    }
    const prevMeta =
      (updates.metadata as Record<string, unknown> | undefined) ??
      (existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {});
    updates.metadata = mergeWorkflowMetadata(prevMeta, { ui: uiPatch }) as Json;
  }

  const { data: wf, error } = await ctx.supabase
    .from("workflows")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error || !wf) throw Errors.internal("Mise à jour impossible");

  return { workflow: wf, publish_warning: publishWarning };
});

/**
 * DELETE /api/workflows/[id]
 */
export const DELETE = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const id = getWorkflowIdFromUrl(req);
  if (!id) throw Errors.badRequest("ID workflow manquant");

  const { error, count } = await ctx.supabase
    .from("workflows")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (error) throw Errors.internal("Suppression impossible");
  if (!count) throw Errors.notFound("Workflow");

  return { deleted: true };
});
