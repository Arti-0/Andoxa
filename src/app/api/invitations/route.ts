import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";

function normalizeLinkedInUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (
      u.hostname === "linkedin.com" ||
      u.hostname === "www.linkedin.com" ||
      u.hostname.endsWith(".linkedin.com")
    ) {
      const path = u.pathname.replace(/\/+$/, "");
      return `https://www.linkedin.com${path.startsWith("/") ? path : `/${path}`}`;
    }
  } catch {}
  return trimmed;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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
 * Create an invitation by LinkedIn URL and/or email
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const body = await parseBody<{
    linkedin_url?: string;
    email?: string;
    organization_id?: string;
    role?: string;
  }>(req);

  const linkedinUrl = body.linkedin_url;
  const email = body.email;
  const organizationId = body.organization_id ?? ctx.workspaceId;
  const role = body.role || "member";

  if (!linkedinUrl && !email) {
    throw Errors.badRequest("linkedin_url ou email requis");
  }

  let normalizedUrl: string | null = null;
  if (linkedinUrl) {
    normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
    if (!normalizedUrl || !normalizedUrl.includes("linkedin.com")) {
      throw Errors.badRequest("Invalid LinkedIn URL");
    }
  }

  let normalizedEmail: string | null = null;
  if (email) {
    normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes("@")) {
      throw Errors.badRequest("Invalid email");
    }
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
      email: normalizedEmail,
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
