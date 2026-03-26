import type { SupabaseClient } from "@supabase/supabase-js";

export type ReconcileInvitationResult =
  | { joined: true; organizationId: string }
  | { joined: false; alreadyMember?: boolean; error?: boolean };

type RpcPayload = {
  success?: boolean;
  organization_id?: string;
  reason?: string;
  already_member?: boolean;
};

/**
 * Apply pending invitation via SECURITY DEFINER RPC (bypasses RLS).
 * Direct client inserts into organization_members / invitations DELETE usually fail for invitees under RLS.
 */
export async function reconcilePendingInvitationForUser(
  supabase: SupabaseClient,
  userId: string,
  _params: {
    userEmail: string | null | undefined;
    profileLinkedInUrl: string | null | undefined;
  }
): Promise<ReconcileInvitationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { joined: false, error: true };
  }

  const { data, error } = await supabase.rpc(
    "accept_pending_organization_invitation",
    {}
  );

  if (error) {
    return { joined: false, error: true };
  }

  const row = data as RpcPayload | null;
  if (!row?.success) {
    return { joined: false };
  }

  const orgId = row.organization_id;
  if (!orgId) {
    return { joined: false, error: true };
  }

  if (row.already_member) {
    return { joined: false, alreadyMember: true };
  }

  return { joined: true, organizationId: orgId };
}
