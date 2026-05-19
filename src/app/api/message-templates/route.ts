import { createApiHandler, Errors, parseBody, getPagination } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { z } from "zod";

const ALLOWED_VARIABLES = [
  "firstName",
  "lastName",
  "company",
  "jobTitle",
  "phone",
  "email",
  "bookingLink",
] as const;

const TemplateCategoryEnum = z.enum([
  "first",
  "relance",
  "rdv",
  "suivi",
  "other",
]);

const CreateTemplateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100).trim(),
  channel: z.enum(["linkedin", "whatsapp", "email"]),
  /** Legacy enum slug — accepted for back-compat with older callers. */
  category: TemplateCategoryEnum.optional(),
  /** Preferred: link to a row in template_categories. */
  category_id: z.string().uuid().nullable().optional(),
  /** Auto-create-if-missing: pass a name to create the category inline. */
  category_name: z.string().trim().min(1).max(60).optional(),
  content: z
    .string()
    .min(1, "Le contenu est requis")
    .max(2000)
    .trim()
    .refine((val) => !/<script/i.test(val), "HTML non autorisé")
    .refine((val) => !val.includes("javascript:"), "Contenu non autorisé"),
  is_default: z.boolean().optional(),
});

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [
    ...new Set(
      matches
        .map((m) => m.replace(/\{\{|\}\}/g, ""))
        .filter((v) => (ALLOWED_VARIABLES as readonly string[]).includes(v))
    ),
  ];
}

/**
 * GET /api/message-templates
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  assertMessagerieAndTemplatesPlan(ctx);

  const { page, pageSize, offset } = getPagination(req);
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");

  // Join category so the UI can show the dynamic name without a 2nd query.
  let query = ctx.supabase
    .from("message_templates")
    .select("*, category:category_id(id, name, sort_order)", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false });

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, error, count } = await query.range(
    offset,
    offset + pageSize - 1
  );

  if (error) throw Errors.internal("Failed to fetch templates");

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
});

/**
 * POST /api/message-templates
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  assertMessagerieAndTemplatesPlan(ctx);

  const body = await parseBody<z.infer<typeof CreateTemplateSchema>>(req);
  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    throw Errors.validation(fieldErrors);
  }

  const {
    name,
    channel,
    category,
    category_id,
    category_name,
    content,
    is_default,
  } = parsed.data;
  const variables_used = extractVariables(content);

  // Resolve category_id from one of: explicit id, inline name (auto-create),
  // or legacy enum slug → matching seeded category row. Null means "no category".
  let resolvedCategoryId: string | null = category_id ?? null;

  if (!resolvedCategoryId && category_name) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = ctx.supabase as any;
    const trimmed = category_name.trim();
    // Try an existing row first (case-insensitive); create if missing.
    const { data: existing } = await supabase
      .from("template_categories")
      .select("id")
      .eq("organization_id", ctx.workspaceId)
      .ilike("name", trimmed)
      .maybeSingle();
    if (existing?.id) {
      resolvedCategoryId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("template_categories")
        .insert({
          organization_id: ctx.workspaceId,
          name: trimmed,
          created_by: ctx.userId,
        })
        .select("id")
        .single();
      if (createErr) throw Errors.internal("Failed to create category");
      resolvedCategoryId = created?.id ?? null;
    }
  }

  if (!resolvedCategoryId && category) {
    // Legacy enum slug → look up the seeded category row by its French name.
    const ENUM_TO_NAME: Record<string, string> = {
      first: "Première prise de contact",
      relance: "Relance",
      rdv: "Rendez-vous",
      suivi: "Suivi",
      other: "Autre",
    };
    const seedName = ENUM_TO_NAME[category];
    if (seedName) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row } = await (ctx.supabase as any)
        .from("template_categories")
        .select("id")
        .eq("organization_id", ctx.workspaceId)
        .eq("name", seedName)
        .maybeSingle();
      resolvedCategoryId = row?.id ?? null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("message_templates")
    .insert({
      organization_id: ctx.workspaceId,
      created_by: ctx.userId,
      name,
      channel,
      // Keep the legacy text column synced for one release. New consumers
      // should read via category_id → template_categories.name.
      category: category ?? "first",
      category_id: resolvedCategoryId,
      content,
      variables_used,
      is_default: is_default ?? false,
    })
    .select("*, category:category_id(id, name, sort_order)")
    .single();

  if (error) throw Errors.internal("Failed to create template");

  return data;
});
