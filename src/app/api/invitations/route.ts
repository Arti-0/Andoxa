import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { normalizeInvitationLinkedInUrl } from "@/lib/invitations/normalize";

/**
 * GET /api/invitations
 * List pending invitations for the current organization
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data: invitations, error } = await ctx.supabase
    .from("invitations")
    .select("id, email, linkedin_url, role, created_at")
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw Errors.internal("Failed to fetch invitations");

  return { items: invitations ?? [] };
});

/**
 * POST /api/invitations
 * Create an invitation by LinkedIn profile URL only
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const body = await parseBody<{
    linkedin_url?: string;
    organization_id?: string;
    role?: string;
  }>(req);

  const linkedinUrl = body.linkedin_url;
  const organizationId = body.organization_id ?? ctx.workspaceId;
  const role = body.role || "member";

  if (!linkedinUrl?.trim()) {
    throw Errors.badRequest("URL LinkedIn requise");
  }

  const normalizedUrl = normalizeInvitationLinkedInUrl(linkedinUrl);
  if (!normalizedUrl || !normalizedUrl.includes("linkedin.com")) {
    throw Errors.badRequest("URL LinkedIn invalide");
  }

  const { data: membership } = await ctx.supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", ctx.userId)
    .single();

  const isOwner =
    membership?.role === "owner" ||
    (await ctx.supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .single()
      .then(({ data }) => data?.owner_id === ctx.userId));

  if (!isOwner && membership?.role !== "admin") {
    throw Errors.forbidden();
  }

  const { data: invitation, error: insertError } = await ctx.supabase
    .from("invitations")
    .insert({
      organization_id: organizationId,
      role: ["owner", "admin", "member"].includes(role) ? role : "member",
      invited_by: ctx.userId,
      linkedin_url: normalizedUrl,
      email: null,
    })
    .select("id, linkedin_url, email, role")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      throw Errors.badRequest("Cette personne est déjà invitée");
    }
    throw Errors.internal("Failed to create invitation");
  }

  return invitation;
});
