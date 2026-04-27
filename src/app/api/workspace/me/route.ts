import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { user: null, profile: null, workspace: null, members: [], subscription: null },
      { status: 401 }
    );
  }

  type ProfileRow = {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    linkedin_url: string | null;
    linkedin_auto_enrich: boolean | null;
    active_organization_id: string | null;
    metadata: Record<string, unknown> | null;
    calendar_preferences: Record<string, unknown> | null;
  };

  const { data: profile } = await (supabase
    .from("profiles")
    .select(
      "id, email, full_name, avatar_url, linkedin_url, linkedin_auto_enrich, active_organization_id, metadata, calendar_preferences"
    )
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{ data: ProfileRow | null; error: unknown }>);

  const userWithIdentities = { ...user, identities: user.identities ?? [] };

  // Per-user browser cache: workspace memberships rarely change inside 30s.
  // `private` ensures no shared/CDN caching of authenticated content.
  const cacheHeaders = {
    "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
  } as const;

  if (!profile?.active_organization_id) {
    return NextResponse.json(
      {
        user: userWithIdentities,
        profile: profile ?? null,
        workspace: null,
        members: [],
        subscription: null,
      },
      { headers: cacheHeaders }
    );
  }

  const [workspaceRes, membersRes, subscriptionRes] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, slug, logo_url, plan, status, subscription_status, trial_ends_at, credits, owner_id, deleted_at, created_at, updated_at, metadata"
      )
      .eq("id", profile.active_organization_id)
      .single(),
    supabase
      .from("organization_members")
      .select(
        "id, organization_id, user_id, role, joined_at, created_at, profiles:user_id(id, full_name, email, avatar_url)"
      )
      .eq("organization_id", profile.active_organization_id),
    supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle(),
  ]);

  return NextResponse.json(
    {
      user: userWithIdentities,
      profile,
      workspace: workspaceRes.data ?? null,
      members: membersRes.data ?? [],
      subscription: subscriptionRes.data ?? null,
    },
    { headers: cacheHeaders }
  );
}
