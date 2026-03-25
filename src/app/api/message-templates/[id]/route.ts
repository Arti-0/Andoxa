import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import { z } from "zod";

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  channel: z.enum(["linkedin", "whatsapp", "email"]).optional(),
  content: z
    .string()
    .min(1)
    .max(2000)
    .trim()
    .refine((val) => !/<script/i.test(val), "HTML non autorisé")
    .refine((val) => !val.includes("javascript:"), "Contenu non autorisé")
    .optional(),
  is_default: z.boolean().optional(),
});

function extractVariables(content: string): string[] {
  const ALLOWED = ["firstName", "lastName", "company", "jobTitle", "phone", "email", "bookingLink"];
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [
    ...new Set(
      matches
        .map((m) => m.replace(/\{\{|\}\}/g, ""))
        .filter((v) => ALLOWED.includes(v))
    ),
  ];
}

function getIdFromUrl(req: Request): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  return segments[segments.indexOf("message-templates") + 1];
}

/**
 * GET /api/message-templates/[id]
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  assertMessagerieAndTemplatesPlan(ctx);

  const id = getIdFromUrl(req);
  const { data, error } = await ctx.supabase
    .from("message_templates")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (error || !data) throw Errors.notFound("Template");

  return data;
});

/**
 * PATCH /api/message-templates/[id]
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  assertMessagerieAndTemplatesPlan(ctx);

  const id = getIdFromUrl(req);
  const body = await parseBody<z.infer<typeof UpdateTemplateSchema>>(req);
  const parsed = UpdateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    throw Errors.validation(fieldErrors);
  }

  const { data, error } = await ctx.supabase
    .from("message_templates")
    .update({
      name: parsed.data.name,
      channel: parsed.data.channel,
      content: parsed.data.content,
      variables_used: parsed.data.content ? extractVariables(parsed.data.content) : undefined,
      is_default: parsed.data.is_default,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound("Template");

  return data;
});

/**
 * DELETE /api/message-templates/[id]
 */
export const DELETE = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  assertMessagerieAndTemplatesPlan(ctx);

  const id = getIdFromUrl(req);
  const { error } = await ctx.supabase
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (error) throw Errors.internal("Failed to delete template");

  return { success: true };
});
