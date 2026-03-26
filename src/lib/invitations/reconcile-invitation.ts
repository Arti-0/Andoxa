import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeInvitationLinkedInUrl } from "@/lib/invitations/normalize";
import { logger } from "@/lib/utils/logger";

export type ReconcileInvitationResult =
  | { joined: true; organizationId: string }
  | { joined: false; alreadyMember?: boolean; error?: boolean };

type RpcPayload = {
  success?: boolean;
  organization_id?: string;
  reason?: string;
  already_member?: boolean;
};

function coalesceLinkedinHint(
  profileUrl: string | null | undefined,
  sessionHint: string | null | undefined
): string | null {
  const raw = profileUrl?.trim() || sessionHint?.trim();
  if (!raw) return null;
  return normalizeInvitationLinkedInUrl(raw);
}

/**
 * Apply pending invitation via SECURITY DEFINER RPC (bypasses RLS).
 * Direct client inserts into organization_members / invitations DELETE usually fail for invitees under RLS.
 */
export async function reconcilePendingInvitationForUser(
  supabase: SupabaseClient,
  userId: string,
  params: {
    profileLinkedInUrl: string | null | undefined;
    /** From OAuth user_metadata when profile row is missing or not yet synced */
    linkedinUrlHint?: string | null | undefined;
  }
): Promise<ReconcileInvitationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { joined: false, error: true };
  }

  const hint = coalesceLinkedinHint(
    params.profileLinkedInUrl,
    params.linkedinUrlHint
  );

  const { data, error } = await supabase.rpc(
    "accept_pending_organization_invitation",
    { p_linkedin_url_hint: hint }
  );

  if (error) {
    logger.error("accept_pending_organization_invitation RPC failed", {
      message: error.message,
      code: error.code,
      userId,
    });
    return { joined: false, error: true };
  }

  const row = data as RpcPayload | null;
  if (!row?.success) {
    const quiet = row?.reason === "no_invitation" || row?.reason === "no_linkedin_url";
    if (row?.reason && !quiet) {
      logger.warn("accept_pending_organization_invitation declined", {
        reason: row.reason,
        userId,
      });
    }
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
