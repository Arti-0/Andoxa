import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractLinkedInProfileUrlFromMetadata } from "@/lib/auth/linkedin-metadata";
import { reconcilePendingInvitationForUser } from "@/lib/invitations/reconcile-invitation";

/**
 * POST /api/invitations/check
 * Check if the current user has a pending invitation (LinkedIn profile URL only).
 * If found: add to organization, set active_organization_id, delete invitation.
 * Replaces the old check-linkedin endpoint.
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, linkedin_url, active_organization_id")
      .eq("id", user.id)
      .maybeSingle();

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const linkedinUrlHint = extractLinkedInProfileUrlFromMetadata(meta);

    const result = await reconcilePendingInvitationForUser(supabase, user.id, {
      profileLinkedInUrl: profile?.linkedin_url ?? null,
      linkedinUrlHint,
    });

    if ("error" in result && result.error) {
      console.error("Error adding member from invitation");
      return NextResponse.json(
        { error: "Failed to join organization" },
        { status: 500 }
      );
    }

    if (result.joined) {
      return NextResponse.json({
        joined: true,
        organizationId: result.organizationId,
      });
    }

    if (result.alreadyMember) {
      return NextResponse.json({ joined: false, alreadyMember: true });
    }

    return NextResponse.json({ joined: false });
  } catch (error) {
    console.error("Check invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
