import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

/**
 * Délais humains pour les actions Unipile.
 * Toutes les valeurs sont en millisecondes.
 */
export const THROTTLE_MS = {
  linkedin: {
    minDelay: 15_000,
    maxDelay: 45_000,
  },
  whatsapp: {
    minDelay: 10_000,
    maxDelay: 25_000,
  },
} as const;

/**
 * Estime la durée totale d'une campagne en millisecondes.
 *
 * - (N-1) délais entre actions individuelles dans les batches
 * - (ceil(N/batchSize) - 1) pauses entre batches
 * - Si N≤1 : 0ms (une seule action ou aucune, pas d'attente entre actions)
 */
export function estimateCampaignDurationMs(
  count: number,
  batchSize: number,
  batchPauseMs: number,
  channel: "linkedin" | "whatsapp"
): number {
  if (count <= 1) return 0;
  const throttle = THROTTLE_MS[channel];
  const avgActionDelayMs = (throttle.minDelay + throttle.maxDelay) / 2;
  const batchCount = Math.ceil(count / batchSize);
  return (count - 1) * avgActionDelayMs + (batchCount - 1) * batchPauseMs;
}

/**
 * Formate une durée en label lisible.
 * - 0ms → "< 1 min"
 * - sinon → "~N min" arrondi au supérieur
 */
export function formatDurationLabel(ms: number): string {
  if (ms <= 0) return "< 1 min";
  const minutes = Math.ceil(ms / 60_000);
  return `~${minutes} min`;
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

/** Clé de période journalière : YYYY-MM-DD (UTC) */
export function dailyPeriodKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Clé de période hebdomadaire ISO : YYYY-WW */
export function weeklyPeriodKey(date = new Date()): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export type UsageAction =
  | "linkedin_invite"
  | "linkedin_contact"
  | "whatsapp_new_chat";

export async function incrementUsageCounter(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: UsageAction,
  periodKey: string,
  increment = 1
): Promise<void> {
  const { error } = await supabase.rpc("increment_usage_counter", {
    p_user_id: userId,
    p_action: action,
    p_period_key: periodKey,
    p_increment: increment,
  });
  if (error) {
    console.error("[usage_counters] increment_usage_counter", error);
  }
}
