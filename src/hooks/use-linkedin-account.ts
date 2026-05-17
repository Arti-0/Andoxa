import { useQuery } from "@tanstack/react-query";

import type { LinkedInAccountTier } from "@/lib/linkedin/tier";
import { inferLinkedInAccountTier } from "@/lib/linkedin/tier";

export interface LinkedInAccountData {
  connected: boolean;
  account_id?: string;
  linkedin_status: string;
  linkedin_error: string | null;
  linkedin_is_premium: boolean;
  linkedin_premium_features: string[];
  linkedin_tier: LinkedInAccountTier;
  whatsapp_connected: boolean;
  whatsapp_status: string;
  whatsapp_error: string | null;
}

export function useLinkedInAccount() {
  return useQuery({
    queryKey: ["unipile-me"],
    queryFn: async (): Promise<LinkedInAccountData> => {
      const res = await fetch("/api/unipile/me", { credentials: "include" });
      if (!res.ok) throw new Error("Impossible de charger le statut de connexion LinkedIn / WhatsApp");
      const json = await res.json();
      const raw = (json?.data ?? json) as Partial<LinkedInAccountData>;
      const tier =
        raw.linkedin_tier ??
        inferLinkedInAccountTier(
          raw.linkedin_is_premium,
          raw.linkedin_premium_features
        );
      return {
        connected: !!raw.connected,
        account_id: raw.account_id,
        linkedin_status: raw.linkedin_status ?? "unknown",
        linkedin_error: raw.linkedin_error ?? null,
        linkedin_is_premium: raw.linkedin_is_premium ?? false,
        linkedin_premium_features: raw.linkedin_premium_features ?? [],
        linkedin_tier: tier,
        whatsapp_connected: !!raw.whatsapp_connected,
        whatsapp_status: raw.whatsapp_status ?? "unknown",
        whatsapp_error: raw.whatsapp_error ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
