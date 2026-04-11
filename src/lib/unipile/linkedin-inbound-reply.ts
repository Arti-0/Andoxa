import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

/** True if any linked Unipile chat for this prospect has recorded an inbound message. */
export async function prospectHasLinkedInInboundReply(
  supabase: SupabaseClient<Database>,
  prospectId: string,
  organizationId: string | null
): Promise<boolean> {
  if (!organizationId) return false;
  const { data } = await supabase
    .from("unipile_chat_prospects")
    .select("id")
    .eq("prospect_id", prospectId)
    .eq("organization_id", organizationId)
    .not("last_inbound_at", "is", null)
    .limit(1);
  return Boolean(data?.length);
}

/**
 * True si le dernier message entrant enregistré pour ce prospect dans l’org
 * est strictement postérieur à `sinceIso`.
 */
export async function prospectHasInboundReplyAfter(
  supabase: SupabaseClient<Database>,
  prospectId: string,
  organizationId: string | null,
  sinceIso: string
): Promise<boolean> {
  if (!organizationId) return false;
  const sinceMs = Date.parse(sinceIso);
  if (!Number.isFinite(sinceMs)) return false;

  const { data } = await supabase
    .from("unipile_chat_prospects")
    .select("last_inbound_at")
    .eq("prospect_id", prospectId)
    .eq("organization_id", organizationId)
    .not("last_inbound_at", "is", null)
    .order("last_inbound_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.last_inbound_at) return false;
  return Date.parse(data.last_inbound_at) > sinceMs;
}
