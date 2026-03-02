import { createApiHandler, Errors, parseBody, getPagination } from "@/lib/api";
import { z } from "zod";

const ALLOWED_VARIABLES = [
  "firstName",
  "lastName",
  "company",
  "jobTitle",
  "phone",
  "email",
] as const;

const CreateTemplateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100).trim(),
  channel: z.enum(["linkedin", "whatsapp", "email"]),
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

  const { page, pageSize, offset } = getPagination(req);
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");

  let query = ctx.supabase
    .from("message_templates")
    .select("*", { count: "exact" })
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

  const body = await parseBody<z.infer<typeof CreateTemplateSchema>>(req);
  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    throw Errors.validation(fieldErrors);
  }

  const { name, channel, content, is_default } = parsed.data;
  const variables_used = extractVariables(content);

  const { data, error } = await ctx.supabase
    .from("message_templates")
    .insert({
      organization_id: ctx.workspaceId,
      created_by: ctx.userId,
      name,
      channel,
      content,
      variables_used,
      is_default: is_default ?? false,
    })
    .select()
    .single();

  if (error) throw Errors.internal("Failed to create template");

  return data;
});
