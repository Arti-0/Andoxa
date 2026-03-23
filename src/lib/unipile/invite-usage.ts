import type { SupabaseClient } from "@supabase/supabase-js";
import { LINKEDIN_INVITE_DAILY_CAP } from "@/lib/config/linkedin-invite";
import type { Database } from "@/lib/types/supabase";

function periodStartUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getLinkedInInviteUsage(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ used: number; cap: number; period_start: string }> {
  const period_start = periodStartUtc();
  const { data } = await supabase
    .from("linkedin_invite_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("period_start", period_start)
    .maybeSingle();

  return {
    used: data?.count ?? 0,
    cap: LINKEDIN_INVITE_DAILY_CAP,
    period_start,
  };
}

export async function incrementLinkedInInviteUsage(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const period_start = periodStartUtc();
  const { data: row } = await supabase
    .from("linkedin_invite_usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("period_start", period_start)
    .maybeSingle();

  if (!row) {
    const { error } = await supabase.from("linkedin_invite_usage").insert({
      user_id: userId,
      period_start,
      count: 1,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("linkedin_invite_usage")
    .update({ count: row.count + 1 })
    .eq("id", row.id);
  if (error) throw error;
}
