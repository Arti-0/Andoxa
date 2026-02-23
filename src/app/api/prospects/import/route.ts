import { createApiHandler, Errors, parseBody } from "../../../../lib/api";

const SOURCE_LINKEDIN_EXTENSION = "linkedin_extension";

/**
 * POST /api/prospects/import
 * Create one BDD (list) + N prospects in one call (extension Chrome).
 * Body: { name: string, prospects: Array<{ name: string, url: string }> }
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    name: string;
    prospects: Array<{ name: string; url: string }>;
  }>(req);

  if (!body.name?.trim()) {
    throw Errors.validation({ name: "Le nom de la liste est requis" });
  }
  if (!Array.isArray(body.prospects)) {
    throw Errors.validation({ prospects: "prospects doit être un tableau" });
  }

  // 1. Create BDD row (one entry per import)
  const { data: bddRow, error: bddError } = await ctx.supabase
    .from("bdd")
    .insert({
      name: body.name.trim(),
      organization_id: ctx.workspaceId,
      proprietaire: ctx.userId,
      source: SOURCE_LINKEDIN_EXTENSION,
      csv_url: null,
      csv_hash: null,
    })
    .select("id")
    .single();

  if (bddError || !bddRow) {
    console.error("[API] Prospects import BDD create error:", bddError);
    throw Errors.internal("Impossible de créer la liste d'import");
  }

  const bddId = bddRow.id;
  let inserted = 0;

  // 2. Insert prospects (skip duplicate linkedin for MVP)
  for (const p of body.prospects) {
    const linkedin = p.url?.trim() || null;
    const fullName = p.name?.trim() || null;
    if (!fullName && !linkedin) continue;

    const { error: prospectError } = await ctx.supabase
      .from("prospects")
      .insert({
        organization_id: ctx.workspaceId,
        user_id: ctx.userId,
        bdd_id: bddId,
        full_name: fullName,
        linkedin: linkedin,
        source: SOURCE_LINKEDIN_EXTENSION,
        status: "new",
      });

    if (prospectError) {
      // 23505 = unique_violation (linkedin already exists) – skip
      if (prospectError.code === "23505") continue;
      console.warn("[API] Prospects import row error:", prospectError);
      continue;
    }
    inserted += 1;
  }

  return { bddId, count: inserted };
});
