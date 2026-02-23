import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current user has a pending invitation by LinkedIn URL.
 * If found: add to organization, set active_organization_id, delete invitation.
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
      .single();

    if (!profile?.linkedin_url) {
      return NextResponse.json({ joined: false });
    }

    const { data: invitation } = await supabase
      .from("invitations")
      .select("id, organization_id, role")
      .eq("linkedin_url", profile.linkedin_url)
      .limit(1)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ joined: false });
    }

    const { error: insertError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role || "member",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ joined: false, alreadyMember: true });
      }
      console.error("Error adding member from invitation:", insertError);
      return NextResponse.json(
        { error: "Failed to join organization" },
        { status: 500 }
      );
    }

    if (!profile.active_organization_id) {
      await supabase
        .from("profiles")
        .update({ active_organization_id: invitation.organization_id })
        .eq("id", user.id);
    }

    await supabase
      .from("invitations")
      .delete()
      .eq("id", invitation.id);

    return NextResponse.json({
      joined: true,
      organizationId: invitation.organization_id,
    });
  } catch (error) {
    console.error("Check LinkedIn invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
