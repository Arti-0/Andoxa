import type { SupabaseClient } from "@supabase/supabase-js";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";
import {
  normalizeInvitationEmail,
  normalizeInvitationLinkedInUrl,
} from "@/lib/invitations/normalize";

export type InvitationRow = {
  id: string;
  organization_id: string;
  role: string;
};

/**
 * Find a pending invitation for this user using normalized email and LinkedIn URL.
 */
export async function findPendingInvitationForUser(
  supabase: SupabaseClient,
  params: {
    userEmail: string | null | undefined;
    profileLinkedInUrl: string | null | undefined;
  }
): Promise<InvitationRow | null> {
  const normalizedEmail = params.userEmail
    ? normalizeInvitationEmail(params.userEmail)
    : "";
  const normalizedLinkedin = params.profileLinkedInUrl?.trim()
    ? normalizeInvitationLinkedInUrl(params.profileLinkedInUrl)
    : null;

  if (normalizedEmail) {
    const { data } = await supabase
      .from("invitations")
      .select("id, organization_id, role")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (data) return data as InvitationRow;
  }

  if (normalizedLinkedin) {
    const { data } = await supabase
      .from("invitations")
      .select("id, organization_id, role")
      .eq("linkedin_url", normalizedLinkedin)
      .limit(1)
      .maybeSingle();
    if (data) return data as InvitationRow;
  }

  const slug =
    params.profileLinkedInUrl &&
    extractLinkedInSlug(params.profileLinkedInUrl);
  if (slug) {
    const { data: candidates } = await supabase
      .from("invitations")
      .select("id, organization_id, role, linkedin_url")
      .not("linkedin_url", "is", null)
      .ilike("linkedin_url", `%/in/${slug}%`)
      .limit(20);

    if (candidates?.length) {
      const slugRows = candidates.filter((row) => {
        const invUrl = row.linkedin_url as string | null;
        return invUrl && extractLinkedInSlug(invUrl) === slug;
      });
      const strict = slugRows.find((row) => {
        const invUrl = row.linkedin_url as string | null;
        return (
          invUrl &&
          normalizedLinkedin &&
          normalizeInvitationLinkedInUrl(invUrl) === normalizedLinkedin
        );
      });
      const pick = strict ?? slugRows[0];
      if (pick) {
        return {
          id: pick.id,
          organization_id: pick.organization_id,
          role: pick.role,
        };
      }
    }
  }

  return null;
}

export type ReconcileInvitationResult =
  | { joined: true; organizationId: string }
  | { joined: false; alreadyMember?: boolean; error?: boolean };

/**
 * Apply pending invitation: membership, always set active_organization_id to invited org, delete invitation.
 * Runs even when the user already has a personal pending org (fixes invitation-not-applied trap).
 */
export async function reconcilePendingInvitationForUser(
  supabase: SupabaseClient,
  userId: string,
  params: {
    userEmail: string | null | undefined;
    profileLinkedInUrl: string | null | undefined;
  }
): Promise<ReconcileInvitationResult> {
  const invitation = await findPendingInvitationForUser(supabase, params);
  if (!invitation) {
    return { joined: false };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: invitation.organization_id,
    user_id: userId,
    role: invitation.role || "member",
  });

  if (memberError) {
    if (memberError.code === "23505") {
      await supabase.from("invitations").delete().eq("id", invitation.id);
      await supabase
        .from("profiles")
        .update({ active_organization_id: invitation.organization_id })
        .eq("id", userId);
      return { joined: false, alreadyMember: true };
    }
    return { joined: false, error: true };
  }

  await supabase
    .from("profiles")
    .update({ active_organization_id: invitation.organization_id })
    .eq("id", userId);

  await supabase.from("invitations").delete().eq("id", invitation.id);

  return { joined: true, organizationId: invitation.organization_id };
}
