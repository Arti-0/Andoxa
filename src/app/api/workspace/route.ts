import { createApiHandler, Errors, parseBody } from "../../../lib/api";
import { planAllowsAutoEnrichOnImport } from "@/lib/enrichment/queue-helpers";
import type { Json } from "@/lib/types/supabase";

/**
 * GET /api/workspace
 * Get current workspace details
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspace) {
    throw Errors.notFound("Workspace");
  }

  const { data: membersData, error } = await ctx.supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", ctx.workspace.id);

  if (error) {
    throw Errors.internal("Failed to fetch workspace members");
  }

  const userIds = [...new Set((membersData ?? []).map((m: { user_id: string }) => m.user_id))];
  let members: Array<{ id: string; name: string; avatar_url: string | null; role: string }> = [];

  if (userIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string | null; avatar_url: string | null }) => [
        p.id,
        { name: p.full_name ?? "Inconnu", avatar_url: p.avatar_url ?? null },
      ])
    );

    members = (membersData ?? []).map((member: { user_id: string; role: string | null }) => ({
      id: member.user_id,
      name: profileMap.get(member.user_id)?.name ?? "Inconnu",
      avatar_url: profileMap.get(member.user_id)?.avatar_url ?? null,
      role: member.role ?? "member",
    }));
  }

  return {
    workspace: ctx.workspace,
    members,
  };
});

/**
 * PATCH /api/workspace
 * Update workspace settings
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspace) {
    throw Errors.notFound("Workspace");
  }

  const body = await parseBody<{
    name?: string;
    logo_url?: string;
    settings?: { auto_enrich_on_import?: boolean };
  }>(req);

  let mergedMetadata: Json | undefined;
  if (body.settings?.auto_enrich_on_import !== undefined) {
    if (
      !planAllowsAutoEnrichOnImport(
        ctx.workspace.plan,
        ctx.workspace.subscription_status
      )
    ) {
      throw Errors.badRequest(
        "L'enrichissement automatique à l'import est réservé aux plans Pro et Business."
      );
    }
    const { data: orgMeta } = await ctx.supabase
      .from("organizations")
      .select("metadata")
      .eq("id", ctx.workspace.id)
      .single();
    const prev =
      orgMeta?.metadata && typeof orgMeta.metadata === "object" && !Array.isArray(orgMeta.metadata)
        ? (orgMeta.metadata as Record<string, Json | undefined>)
        : {};
    mergedMetadata = {
      ...prev,
      auto_enrich_on_import: body.settings.auto_enrich_on_import,
    } as Json;
  }

  // Update workspace
  const { data, error } = await ctx.supabase
    .from("organizations")
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.logo_url !== undefined ? { logo_url: body.logo_url } : {}),
      ...(mergedMetadata !== undefined ? { metadata: mergedMetadata } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.workspace.id)
    .select()
    .single();

  if (error) {
    throw Errors.internal("Failed to update workspace");
  }

  return data;
});
