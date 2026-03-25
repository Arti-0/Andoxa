import type { SupabaseClient } from "@supabase/supabase-js";
import { Errors } from "@/lib/api";
import type { ApiContext } from "@/lib/api";
import type { Database } from "@/lib/types/supabase";

/**
 * Resolves the Unipile account_id for the current user.
 * Throws ApiError with a clear message if the user has not connected via Unipile.
 */
export async function getAccountIdForUser(
  ctx: ApiContext,
  accountType: "LINKEDIN" | "WHATSAPP" = "LINKEDIN"
): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id")
    .eq("user_id", ctx.userId)
    .eq("account_type", accountType)
    .maybeSingle();

  if (error) {
    throw Errors.internal("Impossible de récupérer le compte de messagerie");
  }

  if (!data?.unipile_account_id) {
    const label = accountType === "WHATSAPP" ? "WhatsApp" : "LinkedIn";
    throw Errors.badRequest(
      `Connectez votre compte ${label} depuis la page Installation pour activer cette fonctionnalité.`
    );
  }

  return data.unipile_account_id;
}

/**
 * LinkedIn Unipile account_id for a given user (service or user-scoped client).
 */
export async function getLinkedInAccountIdForUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id")
    .eq("user_id", userId)
    .eq("account_type", "LINKEDIN")
    .maybeSingle();

  if (error || !data?.unipile_account_id) return null;
  return data.unipile_account_id;
}

/**
 * WhatsApp Unipile account_id for a given user (service or user-scoped client).
 */
export async function getWhatsAppAccountIdForUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id")
    .eq("user_id", userId)
    .eq("account_type", "WHATSAPP")
    .maybeSingle();

  if (error || !data?.unipile_account_id) return null;
  return data.unipile_account_id;
}

/**
 * Returns all Unipile account IDs for the current user (LinkedIn + WhatsApp).
 */
export async function getAllAccountIdsForUser(
  ctx: ApiContext
): Promise<{ accountId: string; accountType: string }[]> {
  const { data } = await ctx.supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id, account_type")
    .eq("user_id", ctx.userId);

  return (data ?? []).map((row) => ({
    accountId: row.unipile_account_id,
    accountType: row.account_type ?? "LINKEDIN",
  }));
}
