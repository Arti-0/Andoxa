"use client";

import { useQuery } from "@tanstack/react-query";

interface GoogleStatusResponse {
  success: boolean;
  data?: {
    connected: boolean;
    email: string | null;
    configured: boolean;
  };
}

/**
 * Lightweight hook around GET /api/google/status. Used by the calendar page
 * + event-create modal to prompt the user to connect Google when they're
 * about to do something that requires it (Meet generation, two-way sync).
 *
 * Cached for 5 minutes — connection state doesn't change often, and the
 * actual Google API calls fail loudly enough on their own if the token
 * expires between checks.
 */
export function useGoogleStatus() {
  return useQuery({
    queryKey: ["google", "status"] as const,
    queryFn: async () => {
      const res = await fetch("/api/google/status", { credentials: "include" });
      if (!res.ok) {
        return {
          connected: false,
          email: null as string | null,
          configured: false,
        };
      }
      const json = (await res.json()) as GoogleStatusResponse;
      return json.data ?? { connected: false, email: null, configured: false };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
