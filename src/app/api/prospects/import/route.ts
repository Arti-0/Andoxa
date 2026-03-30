import { createApiHandler, Errors, parseBody } from "../../../../lib/api";
import {
  canImportRows,
  checkPlanLimit,
  getImportMaxRows,
  type PlanId,
} from "../../../../lib/config/plans-config";
import { deduplicateProspects, mapProspectRow } from "../../../../lib/utils/deduplicateProspects";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";
import { planAllowsAutoEnrichOnImport, readAutoEnrichOptIn } from "@/lib/enrichment/queue-helpers";
import { effectivePlanIdForLimits } from "@/lib/billing/effective-plan";

const SOURCE_LINKEDIN_EXTENSION = "linkedin_extension";
const SUPPORTED_SOURCES = [SOURCE_LINKEDIN_EXTENSION, "csv", "xlsx"] as const;
type ImportSource = (typeof SUPPORTED_SOURCES)[number];
type MappedProspect = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  linkedin: string | null;
  metadata: Record<string, string> | null;
};
const VALID_PLANS: PlanId[] = ["trial", "essential", "pro", "business", "demo"];

export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    name: string;
    source?: ImportSource;
    prospects: Array<
      | { name?: string; url?: string }
      | {
          full_name?: string;
          email?: string;
          phone?: string;
          company?: string;
          job_title?: string;
          linkedin?: string;
        }
    >;
  }>(req);

  const source = (body.source ?? SOURCE_LINKEDIN_EXTENSION) as ImportSource;

  if (!body.name?.trim()) {
    throw Errors.validation({ name: "Le nom de la liste est requis" });
  }
  if (!Array.isArray(body.prospects) || body.prospects.length === 0) {
    throw Errors.validation({ prospects: "Le tableau prospects ne peut pas etre vide" });
  }
  if (!SUPPORTED_SOURCES.includes(source)) {
    throw Errors.validation({ source: "Source d'import non supportee" });
  }

  const normalize = (value: unknown) => {
    const cleaned = String(value ?? "").trim();
    return cleaned.length > 0 ? cleaned : null;
  };

  const KNOWN_FIELDS = new Set(["full_name", "name", "email", "phone", "company", "job_title", "linkedin", "url"]);

  const normalizedRows = body.prospects
    .map((row) => {
      const legacy = row as { name?: string; url?: string };
      const mapped = row as {
        full_name?: string;
        email?: string;
        phone?: string;
        company?: string;
        job_title?: string;
        linkedin?: string;
      };

      const normalized = mapProspectRow({
        full_name: mapped.full_name ?? legacy.name ?? null,
        email: mapped.email ?? null,
        phone: mapped.phone ?? null,
        company: mapped.company ?? null,
        job_title: mapped.job_title ?? null,
        linkedin: mapped.linkedin ?? legacy.url ?? null,
      }) as Record<string, unknown>;

      const extraFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        if (!KNOWN_FIELDS.has(key) && value != null) {
          const cleaned = String(value).trim();
          if (cleaned.length > 0) extraFields[key] = cleaned;
        }
      }

      return {
        full_name: normalize(normalized.full_name),
        email: normalize(normalized.email)?.toLowerCase() ?? null,
        phone: normalize(normalized.phone),
        company: normalize(normalized.company),
        job_title: normalize(normalized.job_title),
        linkedin: normalize(normalized.linkedin),
        metadata: Object.keys(extraFields).length > 0 ? extraFields : null,
      } as MappedProspect;
    })
    .filter((row) => row.full_name || row.email || row.linkedin);

  if (normalizedRows.length === 0) {
    throw Errors.validation({
      prospects: "Aucune ligne valide. Au moins full_name, email ou linkedin est requis.",
    });
  }

  const planIdRaw = effectivePlanIdForLimits(
    ctx.workspace?.plan ?? null,
    ctx.workspace?.subscription_status ?? null
  );
  const planId = VALID_PLANS.includes(planIdRaw) ? planIdRaw : "trial";
  const maxImportRows = getImportMaxRows(planId);
  if (!canImportRows(planId, normalizedRows.length)) {
    throw Errors.validation({
      prospects: `Votre plan limite l'import a ${maxImportRows} lignes par fichier.`,
    });
  }

  const { count: currentProspectsCount } = await ctx.supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null);
  const currentProspects = currentProspectsCount ?? 0;

  const limitCheck = checkPlanLimit(planId, "prospects", currentProspects + normalizedRows.length);
  if (limitCheck.limit !== -1 && !limitCheck.canUse) {
    throw Errors.validation({
      prospects: `Limite de prospects atteinte (${limitCheck.limit}).`,
    });
  }

  const { data: existingRows } = await ctx.supabase
    .from("prospects")
    .select("email, phone, linkedin")
    .eq("organization_id", ctx.workspaceId);

  const existingKeys = new Set<string>();
  for (const row of existingRows ?? []) {
    if (row.email) existingKeys.add(String(row.email).trim().toLowerCase());
    if (row.phone) existingKeys.add(String(row.phone).trim().toLowerCase());
    if (row.linkedin) existingKeys.add(String(row.linkedin).trim().toLowerCase());
  }

  const metadataByIdx = new Map<number, Record<string, string> | null>();
  const rowsForDedup = normalizedRows.map((r, i) => {
    metadataByIdx.set(i, r.metadata);
    const { metadata: _meta, ...rest } = r;
    return rest;
  });

  const dedupResult = deduplicateProspects(
    rowsForDedup,
    existingKeys,
    ["email", "phone", "linkedin"]
  );

  const deduplicatedRows = dedupResult.map((r) => {
    const idx = rowsForDedup.indexOf(r as typeof rowsForDedup[number]);
    return { ...r, metadata: metadataByIdx.get(idx) ?? null } as MappedProspect;
  });

  const { data: bddRow, error: bddError } = await ctx.supabase
    .from("bdd")
    .insert({
      name: body.name.trim(),
      organization_id: ctx.workspaceId,
      proprietaire: ctx.userId,
      source,
      csv_url: null,
      csv_hash: null,
    })
    .select("id")
    .single();

  if (bddError || !bddRow) {
    console.error("[API] Prospects import BDD create error:", bddError);
    throw Errors.internal("Impossible de creer la liste d'import");
  }

  const bddId = bddRow.id;
  let inserted = 0;
  let enrichmentQueued = 0;
  let duplicates = normalizedRows.length - deduplicatedRows.length;
  let skipped = body.prospects.length - normalizedRows.length;

  const { data: orgRow } = await ctx.supabase
    .from("organizations")
    .select("metadata")
    .eq("id", ctx.workspaceId)
    .single();

  const autoEnrichEligible =
    planAllowsAutoEnrichOnImport(
      ctx.workspace?.plan,
      ctx.workspace?.subscription_status
    ) && readAutoEnrichOptIn(orgRow?.metadata);

  for (const prospect of deduplicatedRows) {
    const { data: created, error: prospectError } = await ctx.supabase
      .from("prospects")
      .insert({
        organization_id: ctx.workspaceId,
        user_id: ctx.userId,
        bdd_id: bddId,
        full_name: prospect.full_name,
        email: prospect.email,
        phone: prospect.phone,
        company: prospect.company,
        job_title: prospect.job_title,
        linkedin: prospect.linkedin,
        source,
        status: "new",
        metadata: prospect.metadata as unknown as import("@/lib/types/supabase").Json ?? undefined,
      })
      .select("id")
      .single();

    if (prospectError || !created) {
      if (prospectError?.code === "23505") {
        duplicates += 1;
        skipped += 1;
        continue;
      }
      console.warn("[API] Prospects import row error:", prospectError);
      skipped += 1;
      continue;
    }
    inserted += 1;

    if (
      autoEnrichEligible &&
      prospect.linkedin?.trim() &&
      extractLinkedInSlug(prospect.linkedin)
    ) {
      const { error: jobErr } = await ctx.supabase.from("enrichment_jobs").insert({
        organization_id: ctx.workspaceId,
        prospect_id: created.id,
        requested_by_user_id: ctx.userId,
        bdd_id: bddId,
        status: "pending",
      });
      if (!jobErr) enrichmentQueued += 1;
    }
  }

  return { bddId, inserted, skipped, duplicates, count: inserted, enrichment_queued: enrichmentQueued };
});
