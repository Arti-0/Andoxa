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
