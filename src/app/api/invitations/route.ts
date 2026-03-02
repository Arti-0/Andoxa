import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
 * POST /api/invitations
 * Create an invitation by LinkedIn URL and/or email
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const linkedinUrl = body.linkedin_url as string | undefined;
    const email = body.email as string | undefined;
    const organizationId = body.organization_id as string | undefined;
    const role = (body.role as string) || "member";

    if (!linkedinUrl && !email) {
      return NextResponse.json(
        { error: "linkedin_url ou email requis" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 }
      );
    }

    let normalizedUrl: string | null = null;
    if (linkedinUrl) {
      normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
      if (!normalizedUrl || !normalizedUrl.includes("linkedin.com")) {
        return NextResponse.json(
          { error: "Invalid LinkedIn URL" },
          { status: 400 }
        );
      }
    }

    let normalizedEmail: string | null = null;
    if (email) {
      normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail.includes("@")) {
        return NextResponse.json(
          { error: "Invalid email" },
          { status: 400 }
        );
      }
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    const isOwner =
      membership?.role === "owner" ||
      (await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .single()
        .then(({ data }) => data?.owner_id === user.id));

    if (!isOwner && membership?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert({
        organization_id: organizationId,
        role: ["owner", "admin", "member"].includes(role) ? role : "member",
        invited_by: user.id,
        linkedin_url: normalizedUrl,
        email: normalizedEmail,
      })
      .select("id, linkedin_url, email, role")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Cette personne est déjà invitée" },
          { status: 409 }
        );
      }
      console.error("Invitation insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Create invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
