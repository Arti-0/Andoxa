import { Errors } from "@/lib/api";
import type { ApiContext } from "@/lib/api";

/**
 * Resolves the Unipile account_id for the current user.
 * Throws ApiError with a clear message if the user has not connected their LinkedIn via Unipile.
 */
export async function getAccountIdForUser(ctx: ApiContext): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) {
    throw Errors.internal(
      "Impossible de récupérer le compte Unipile"
    );
  }

  if (!data?.unipile_account_id) {
    throw Errors.badRequest(
      "Connectez votre compte LinkedIn via Unipile pour activer la messagerie et les campagnes."
    );
  }

  return data.unipile_account_id;
}
