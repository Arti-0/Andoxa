import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/organizations/[id] - Update organization (owner only, e.g. name)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id, status")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (org.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (org.status === "deleted") {
      return NextResponse.json(
        { error: "Cannot update deleted organization" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updates: {
      name?: string;
      logo_url?: string | null;
      slug?: string;
      metadata?: Record<string, unknown>;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.logo_url === "string" || body.logo_url === null) {
      updates.logo_url = body.logo_url ?? null;
    }

    // slug: URL-safe kebab-case, 2-40 chars, unique across orgs (DB enforces).
    if (typeof body.slug === "string") {
      const sluggified = body.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (sluggified.length < 2 || sluggified.length > 40) {
        return NextResponse.json(
          { error: "Slug must be 2-40 chars (a-z, 0-9, -)" },
          { status: 400 }
        );
      }
      updates.slug = sluggified;
    }

    // Metadata: merge-style updates (brand_color, auto_enrich_on_import, etc).
    // We read-modify-write so partial keys don't blow away unrelated metadata.
    if (body.metadata && typeof body.metadata === "object") {
      const { data: existing } = await supabase
        .from("organizations")
        .select("metadata")
        .eq("id", organizationId)
        .maybeSingle();
      const current =
        (existing?.metadata as Record<string, unknown> | null) ?? {};
      updates.metadata = { ...current, ...(body.metadata as Record<string, unknown>) };
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: "No valid updates" }, { status: 400 });
    }

    // Cast: generated Database types haven't been regenerated since
    // `organizations.slug` landed (migration 20260518110000) and metadata is
    // jsonb (Json type). Runtime is fine — the columns exist.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("organizations")
      .update(updates)
      .eq("id", organizationId);

    if (error) {
      console.error("Organization PATCH error:", error);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Organization PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id] - Soft delete organization (owner only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id, status")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (org.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (org.status === "deleted") {
      return NextResponse.json(
        { error: "Organization already deleted" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("organizations")
      .update({
        status: "deleted",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);

    if (error) {
      console.error("Organization soft delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Organization DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
