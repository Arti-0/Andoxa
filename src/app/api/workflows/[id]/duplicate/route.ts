import { createApiHandler, Errors } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import type { Json } from "@/lib/types/supabase";
import {
  safeParseWorkflowDefinition,
  tryBuildPublishedDefinition,
  type WorkflowDefinition,
} from "@/lib/workflows";

const EMPTY_DRAFT: WorkflowDefinition = { schemaVersion: 1, steps: [] };

function getWorkflowIdFromUrl(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("workflows");
  return segments[i + 1] ?? "";
}

/**
 * POST /api/workflows/[id]/duplicate — new draft workflow (never published), same draft + listes mémorisées.
 */
export const POST = createApiHandler(
  async (_req, ctx) => {
    assertMessagerieAndTemplatesPlan(ctx);
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
    const id = getWorkflowIdFromUrl(_req);
    if (!id) throw Errors.badRequest("ID workflow manquant");

    const { data: src, error } = await ctx.supabase
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId)
      .maybeSingle();

    if (error || !src) throw Errors.notFound("Workflow");

    const parsed = safeParseWorkflowDefinition(src.draft_definition);
    const draft: WorkflowDefinition = parsed.success ? parsed.data : EMPTY_DRAFT;

    const meta =
      src.metadata && typeof src.metadata === "object" && !Array.isArray(src.metadata)
        ? ({ ...(src.metadata as Record<string, unknown>) } as Json)
        : ({} as Json);

    const baseName = String(src.name ?? "Workflow").trim() || "Workflow";
    const name = `${baseName} (copie)`;

    let published: Json | null = null;
    const built = await tryBuildPublishedDefinition(ctx.supabase, ctx.userId!, draft);
    if (built.ok) {
      published = built.definition as Json;
    }

    const { data: row, error: insErr } = await ctx.supabase
      .from("workflows")
      .insert({
        organization_id: ctx.workspaceId,
        name,
        created_by: ctx.userId!,
        is_active: false,
        draft_definition: draft as Json,
        published_definition: published,
        metadata: meta,
      })
      .select()
      .single();

    if (insErr || !row) throw Errors.internal("Duplication impossible");

    return { workflow: row };
  },
  { rateLimit: { name: "workflows-duplicate", requests: 20, window: "1 m" } }
);
