import { useQuery } from "@tanstack/react-query";

/**
 * Current user's LinkedIn profile (from GET /api/profile/linkedin).
 *
 * That endpoint calls Unipile live (~seconds), so the result is cached in the
 * react-query store and shared across consumers (Compte profile header +
 * Intégrations LinkedIn card). This is what makes navigating back to Settings
 * instant instead of re-hitting Unipile on every mount.
 */
export interface LinkedinProfileData {
  linkedin_url: string | null;
  full_name: string | null;
  avatar_url: string | null;
  enriched: {
    first_name?: string | null;
    last_name?: string | null;
    headline?: string | null;
    location?: string | null;
    profile_picture_url?: string | null;
    public_identifier?: string | null;
    summary?: string | null;
  } | null;
}

export const LINKEDIN_PROFILE_QUERY_KEY = ["profile-linkedin"] as const;

export function useLinkedInProfile(enabled = true) {
  return useQuery({
    queryKey: LINKEDIN_PROFILE_QUERY_KEY,
    queryFn: async (): Promise<LinkedinProfileData> => {
      const res = await fetch("/api/profile/linkedin", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible de charger le profil LinkedIn");
      const json = await res.json();
      return (json?.data ?? json) as LinkedinProfileData;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
