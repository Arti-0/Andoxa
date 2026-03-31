import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { redeemOrganizationInvitation } from "@/lib/invitations/redeem-invite";

export type RedeemInvitationResult = { ok: true } | { error: string };

const REASON_MESSAGES: Record<string, string> = {
  invalid_or_expired_token: "Invitation invalide ou expirée.",
  email_mismatch:
    "L'adresse e-mail ne correspond pas à l'invitation.",
  email_not_confirmed:
    "Confirmez votre adresse e-mail avant d'accepter l'invitation.",
  not_authenticated: "Vous devez être connecté pour accepter l'invitation.",
  no_email: "Compte sans adresse e-mail : impossible d'accepter l'invitation.",
  insert_failed: "Impossible d'ajouter le membre à l'organisation.",
  rpc_error: "Erreur serveur lors de l'acceptation de l'invitation.",
  invalid_response: "Réponse serveur invalide.",
};

/**
 * Accepts a pending org invitation for the **authenticated** user (session / cookies).
 * Uses DB RPC `redeem_organization_invitation` (auth.uid()).
 */
export async function redeemInvitation(
  supabase: SupabaseClient<Database>,
  token: string,
  _user?: Pick<User, "id" | "email">
): Promise<RedeemInvitationResult> {
  void _user;
  const { result, rpcError } = await redeemOrganizationInvitation(
    supabase,
    token
  );
  if (rpcError) {
    return { error: REASON_MESSAGES.rpc_error };
  }
  if (!result.success) {
    const key = result.reason ?? "";
    return {
      error:
        REASON_MESSAGES[key] ??
        "Impossible d'accepter l'invitation.",
    };
  }
  return { ok: true };
}
