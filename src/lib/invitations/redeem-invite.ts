import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/supabase";
import { parseRedeemInviteResult, type RedeemInviteResult } from "./redeem-result";

export async function redeemOrganizationInvitation(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<{ result: RedeemInviteResult; rpcError: string | null }> {
  const { data, error } = await supabase.rpc("redeem_organization_invitation", {
    p_token: token,
  });
  if (error) {
    return {
      result: { success: false, reason: "rpc_error" },
      rpcError: error.message,
    };
  }
  return {
    result: parseRedeemInviteResult(data as Json),
    rpcError: null,
  };
}
