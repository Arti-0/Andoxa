import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { z } from "zod";

/**
 * Tiny slugifier for status keys. We don't want to depend on `slugify`
 * here — the key only needs to be a stable machine identifier per org.
 * NFD-normalises, drops diacritics, lower-cases, collapses non-alnum to
 * dashes. Same shape as the legacy enum values (`new`, `contacted`, …).
 */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "status";
}

const CreateStatusSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(60).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide")
    .optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

/**
 * GET /api/prospect-statuses
 * Lists the active (non-archived) pipeline statuses for the workspace.
 * Sorted by sort_order then name for stable UI rendering.
 *
 * `?include_archived=1` returns archived rows too — used by the settings
 * page so admins can restore them.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const includeArchived = req.nextUrl.searchParams.get("include_archived") === "1";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from("prospect_statuses")
    .select("id, key, name, color, sort_order, is_archived, is_system, created_at, updated_at")
    .eq("organization_id", ctx.workspaceId);

  if (!includeArchived) query = query.eq("is_archived", false);

  let { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    const code = (error as { code?: string }).code;
    const message = (error as { message?: string }).message ?? "";
    console.error("[GET /api/prospect-statuses]", { code, message });

    // Local DBs may lag migrations (missing column or table).
    if (code === "42703" || message.includes("is_archived")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const retry = await (ctx.supabase as any)
        .from("prospect_statuses")
        .select("id, key, name, color, sort_order, created_at, updated_at")
        .eq("organization_id", ctx.workspaceId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      data = retry.data;
      error = retry.error;
    } else if (code === "42P01") {
      return { items: [] };
    }
  }

  if (error) throw Errors.internal("Failed to fetch statuses");
  return { items: data ?? [] };
});

/**
 * POST /api/prospect-statuses
 * Create a new status. Generates a stable `key` slug from the name; if
 * that key collides with an existing one in the org, suffixes _2, _3…
 *
 * 23505 (unique violation) on either index (name or key) returns 409 with
 * a validation error so the picker can show a friendly message.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const body = await parseBody<z.infer<typeof CreateStatusSchema>>(req);
  const parsed = CreateStatusSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    throw Errors.validation(fieldErrors);
  }

  const baseKey = slugify(parsed.data.name);

  // De-collide the key without an extra round trip per attempt: fetch existing
  // keys for the org, then pick the first available suffix.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (ctx.supabase as any)
    .from("prospect_statuses")
    .select("key")
    .eq("organization_id", ctx.workspaceId)
    .like("key", `${baseKey}%`);

  const taken = new Set<string>((existing ?? []).map((r: { key: string }) => r.key));
  let key = baseKey;
  let n = 2;
  while (taken.has(key)) key = `${baseKey}_${n++}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("prospect_statuses")
    .insert({
      organization_id: ctx.workspaceId,
      key,
      name: parsed.data.name,
      color: parsed.data.color ?? "#94a3b8",
      sort_order: parsed.data.sort_order ?? 100,
    })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw Errors.validation({ name: "Un statut avec ce nom existe déjà" });
    }
    throw Errors.internal("Failed to create status");
  }
  return data;
});
