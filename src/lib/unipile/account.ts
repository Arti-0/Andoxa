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

function rowIsWhatsAccount(
  accountType: string | null | undefined
): boolean {
  return (accountType ?? "").toUpperCase() === "WHATSAPP";
}

/**
 * WhatsApp Unipile account_id for a given user (service or user-scoped client).
 * Match is case-insensitive on `account_type` (handles legacy casing).
 */
export async function getWhatsAppAccountIdForUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id, account_type")
    .eq("user_id", userId);

  if (error || !data?.length) return null;
  const row = data.find(
    (r) => rowIsWhatsAccount(r.account_type) && r.unipile_account_id
  );
  return row?.unipile_account_id ?? null;
}

/**
 * WhatsApp sends for workspaces: prefer `preferredUserId` (workflow starter /
 * campaign creator). If they have no WA box connected, fall back to the org
 * owner, then any other member — real teams often connect WhatsApp once on an
 * admin account while juniors launch workflows.
 */
export async function resolveWhatsAppAccountIdForOrganization(
  supabase: SupabaseClient<Database>,
  organizationId: string | null | undefined,
  preferredUserId: string | null | undefined
): Promise<string | null> {
  if (preferredUserId) {
    const direct = await getWhatsAppAccountIdForUserId(
      supabase,
      preferredUserId
    );
    if (direct) return direct;
  }

  if (!organizationId?.trim()) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .maybeSingle();

  const ownerId = org?.owner_id;
  if (ownerId && ownerId !== preferredUserId) {
    const ownerAcct = await getWhatsAppAccountIdForUserId(supabase, ownerId);
    if (ownerAcct) return ownerAcct;
  }

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId);

  const userIds = Array.from(
    new Set((members ?? []).map((m) => m.user_id).filter(Boolean) as string[])
  );

  for (const uid of userIds) {
    if (uid === preferredUserId || uid === ownerId) continue;
    const acct = await getWhatsAppAccountIdForUserId(supabase, uid);
    if (acct) return acct;
  }

  return null;
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
