"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "./use-user";
import type { PlanId } from "@/lib/config/stripe-config";
import { logger } from "@/lib/utils/logger";

export interface SubscriptionInfo {
  currentPlan: PlanId;
  status: "trial" | "active" | "past_due" | "canceled" | "unpaid";
  trialDaysLeft?: number;
  usage: {
    prospects: { used: number; limit: number };
    campaigns: { used: number; limit: number };
    enrichment_credits: { used: number; limit: number };
  };
}

const DEFAULT_TRIAL_INFO: SubscriptionInfo = {
  currentPlan: "trial",
  status: "trial",
  trialDaysLeft: 14,
  usage: {
    prospects: { used: 0, limit: 200 },
    campaigns: { used: 0, limit: 5 },
    enrichment_credits: { used: 0, limit: 100 },
  },
};

async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  const response = await fetch("/api/subscription/info", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Failed to fetch subscription info", undefined, {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });
    return DEFAULT_TRIAL_INFO;
  }

  return response.json();
}

export function useSubscription() {
  const { user, profile } = useUser();
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Only load once when user and profile are available
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    // Prevent multiple loads
    if (hasLoaded.current) {
      return;
    }

    hasLoaded.current = true;

    const loadSubscription = async () => {
      try {
        const data = await fetchSubscriptionInfo();
        setSubscriptionInfo(data);
      } catch (error) {
        console.error("Error fetching subscription info:", error);
        setSubscriptionInfo(DEFAULT_TRIAL_INFO);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user?.id, profile?.id]); // Only depend on IDs, not full objects

  const refreshSubscription = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await fetchSubscriptionInfo();
        setSubscriptionInfo(data);
    } catch (error) {
      console.error("Error refreshing subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    subscriptionInfo,
    loading,
    refreshSubscription,
    isTrial: subscriptionInfo?.currentPlan === "trial",
    isTrialExpired:
      subscriptionInfo?.trialDaysLeft !== undefined &&
      subscriptionInfo.trialDaysLeft <= 0,
  };
}
