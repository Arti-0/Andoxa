import { useQuery } from "@tanstack/react-query";

export interface LinkedInAccountData {
  connected: boolean;
  account_id?: string;
  linkedin_status: string;
  linkedin_error: string | null;
  linkedin_is_premium: boolean;
  linkedin_premium_features: string[];
  whatsapp_connected: boolean;
  whatsapp_status: string;
  whatsapp_error: string | null;
}

export function useLinkedInAccount() {
  return useQuery({
    queryKey: ["unipile-me"],
    queryFn: async (): Promise<LinkedInAccountData> => {
      const res = await fetch("/api/unipile/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Unipile status");
      const json = await res.json();
      return (json?.data ?? json) as LinkedInAccountData;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
