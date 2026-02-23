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
  } catch {
    // Return as-is if URL parsing fails
  }
  return trimmed;
}

/**
 * Owner creates an invitation by LinkedIn URL.
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
    const organizationId = body.organization_id as string | undefined;
    const role = (body.role as string) || "member";

    if (!linkedinUrl || typeof linkedinUrl !== "string") {
      return NextResponse.json(
        { error: "linkedin_url is required" },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
    if (!normalizedUrl || !normalizedUrl.includes("linkedin.com")) {
      return NextResponse.json(
        { error: "Invalid LinkedIn URL" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 }
      );
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
        linkedin_url: normalizedUrl,
        role: ["owner", "admin", "member"].includes(role) ? role : "member",
        invited_by: user.id,
      })
      .select("id, linkedin_url, role")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This LinkedIn profile is already invited" },
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
