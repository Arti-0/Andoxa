import { createApiHandler, Errors, parseBody } from "../../../../lib/api";
import {
  canImportRows,
  checkPlanLimit,
  getImportMaxRows,
  type PlanId,
} from "../../../../lib/config/plans-config";
import { classifyProspectsForImport, mapProspectRow } from "../../../../lib/utils/deduplicateProspects";
import { insertProspectActivity } from "@/lib/prospect-activity";
import { ensureLinkedInRelationFromUnipileProfile } from "@/lib/linkedin/ensure-relation-from-unipile-profile";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";
import { getLinkedInAccountIdForUserId } from "@/lib/unipile/account";
import { planAllowsAutoEnrichOnImport } from "@/lib/enrichment/queue-helpers";
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
    name?: string;
    bdd_id?: string;
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

  const bddIdFromBody = typeof body.bdd_id === "string" ? body.bdd_id.trim() : "";
  if (!bddIdFromBody && !body.name?.trim()) {
    throw Errors.validation({
      name: "Le nom de la liste est requis si bdd_id n'est pas fourni",
    });
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
    .select("id, email, phone, linkedin, deleted_at")
    .eq("organization_id", ctx.workspaceId);

  const existingLiveKeys = new Set<string>();
  const trashedByKey = new Map<string, string>();
  for (const row of existingRows ?? []) {
    const keys: string[] = [];
    if (row.email) keys.push(String(row.email).trim().toLowerCase());
    if (row.phone) keys.push(String(row.phone).trim().toLowerCase());
    if (row.linkedin) keys.push(String(row.linkedin).trim().toLowerCase());
    if (row.deleted_at) {
      for (const k of keys) {
        if (!existingLiveKeys.has(k) && !trashedByKey.has(k)) {
          trashedByKey.set(k, row.id);
        }
      }
    } else {
      for (const k of keys) {
        existingLiveKeys.add(k);
        trashedByKey.delete(k);
      }
    }
  }

  const metadataByIdx = new Map<number, Record<string, string> | null>();
  const rowsForDedup = normalizedRows.map((r, i) => {
    metadataByIdx.set(i, r.metadata);
    const { metadata: _meta, ...rest } = r;
    return rest;
  });

  const { inserts, restores, duplicates: dupRows } = classifyProspectsForImport(
    rowsForDedup,
    existingLiveKeys,
    trashedByKey,
    ["email", "phone", "linkedin"]
  );

  const withMeta = (r: typeof rowsForDedup[number]) => {
    const idx = rowsForDedup.indexOf(r);
    return { ...r, metadata: metadataByIdx.get(idx) ?? null } as MappedProspect;
  };

  let bddId: string;

  if (bddIdFromBody) {
    const { data: existingBdd } = await ctx.supabase
      .from("bdd")
      .select("id")
      .eq("id", bddIdFromBody)
      .eq("organization_id", ctx.workspaceId)
      .maybeSingle();

    if (!existingBdd) {
      throw Errors.notFound("Liste");
    }
    bddId = existingBdd.id;
  } else {
    const desiredName = body.name!.trim();
    const { data: existingByName } = await ctx.supabase
      .from("bdd")
      .select("id, name")
      .eq("organization_id", ctx.workspaceId)
      .ilike("name", desiredName)
      .limit(5);
    const matched = (existingByName ?? []).find(
      (l) => l.name.trim().toLowerCase() === desiredName.toLowerCase()
    );
    if (matched) {
      bddId = matched.id;
    } else {
      const { data: bddRow, error: bddError } = await ctx.supabase
        .from("bdd")
        .insert({
          name: desiredName,
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
      bddId = bddRow.id;
    }
  }
  let created = 0;
  let restored = 0;
  let enrichmentQueued = 0;
  let duplicates = dupRows.length;
  let skipped = body.prospects.length - normalizedRows.length;

  const { data: profileRow } = await ctx.supabase
    .from("profiles")
    .select("linkedin_auto_enrich")
    .eq("id", ctx.userId)
    .single();

  const autoEnrichEligible =
    planAllowsAutoEnrichOnImport(
      ctx.workspace?.plan,
      ctx.workspace?.subscription_status
    ) && profileRow?.linkedin_auto_enrich === true;

  const linkedInAccountId = await getLinkedInAccountIdForUserId(
    ctx.supabase,
    ctx.userId
  );

  for (const restoreEntry of restores) {
    const prospect = withMeta(restoreEntry.row);
    const { error: restoreError } = await ctx.supabase
      .from("prospects")
      .update({
        deleted_at: null,
        bdd_id: bddId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restoreEntry.prospectId)
      .eq("organization_id", ctx.workspaceId);

    if (restoreError) {
      console.warn("[API] Prospects import restore error:", restoreError);
      skipped += 1;
      continue;
    }
    restored += 1;

    await insertProspectActivity(ctx.supabase, {
      organization_id: ctx.workspaceId,
      prospect_id: restoreEntry.prospectId,
      actor_id: ctx.userId,
      action: "prospect_restored",
      details: {
        via: "import",
        source,
        bdd_id: bddId,
      },
    });

    if (
      autoEnrichEligible &&
      prospect.linkedin?.trim() &&
      extractLinkedInSlug(prospect.linkedin)
    ) {
      const { error: jobErr } = await ctx.supabase.from("enrichment_jobs").insert({
        organization_id: ctx.workspaceId,
        prospect_id: restoreEntry.prospectId,
        requested_by_user_id: ctx.userId,
        bdd_id: bddId,
        status: "pending",
      });
      if (!jobErr) enrichmentQueued += 1;
    }

    if (linkedInAccountId && prospect.linkedin?.trim()) {
      const slug = extractLinkedInSlug(prospect.linkedin);
      if (slug) {
        try {
          await ensureLinkedInRelationFromUnipileProfile(
            ctx.supabase,
            ctx.userId,
            linkedInAccountId,
            slug
          );
        } catch (e) {
          console.warn("[API] Prospects import LinkedIn relation fallback:", e);
        }
      }
    }
  }

  for (const row of inserts) {
    const prospect = withMeta(row);
    const { data: createdRow, error: prospectError } = await ctx.supabase
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

    if (prospectError || !createdRow) {
      if (prospectError?.code === "23505") {
        duplicates += 1;
        skipped += 1;
        continue;
      }
      console.warn("[API] Prospects import row error:", prospectError);
      skipped += 1;
      continue;
    }
    created += 1;

    if (
      autoEnrichEligible &&
      prospect.linkedin?.trim() &&
      extractLinkedInSlug(prospect.linkedin)
    ) {
      const { error: jobErr } = await ctx.supabase.from("enrichment_jobs").insert({
        organization_id: ctx.workspaceId,
        prospect_id: createdRow.id,
        requested_by_user_id: ctx.userId,
        bdd_id: bddId,
        status: "pending",
      });
      if (!jobErr) enrichmentQueued += 1;
    }

    if (linkedInAccountId && prospect.linkedin?.trim()) {
      const slug = extractLinkedInSlug(prospect.linkedin);
      if (slug) {
        try {
          await ensureLinkedInRelationFromUnipileProfile(
            ctx.supabase,
            ctx.userId,
            linkedInAccountId,
            slug
          );
        } catch (e) {
          console.warn("[API] Prospects import LinkedIn relation fallback:", e);
        }
      }
    }
  }

  return {
    bddId,
    created,
    restored,
    duplicates,
    skipped,
    enrichment_queued: enrichmentQueued,
    // Legacy aliases for older clients (extension < v?.? and import dialog).
    inserted: created,
    count: created,
  };
});
