"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from "@/lib/utils/logger";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  organization_id?: string; // Deprecated, kept for backward compatibility
  active_organization_id?: string | null;
  stripe_customer_id?: string;
}

/**
 * Simplified useUser hook
 *
 * This hook ONLY fetches user and profile data.
 * It does NOT handle redirects - that's the responsibility of the layout/middleware.
 *
 * This prevents multiple redirects and infinite loops.
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const supabase = createClient();

    // Get initial user and profile
    const initialize = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error("Error getting session", error);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);

          // Get profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError && profileError.code !== "PGRST116") {
            // Error other than "not found" - log but don't fail
            logger.error("Error getting profile", profileError);
          }

          setProfile(profileData || null);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        logger.error("Error in initialize", error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // Listen for auth changes - update state only, no redirects
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);

        // Get profile with a small delay to allow it to be created
        setTimeout(async () => {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError && profileError.code !== "PGRST116") {
            logger.error(
              "Error getting profile during auth change",
              profileError
            );
          }

          setProfile(profileData || null);
        }, 300);
      } else if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty deps - only run once

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
  };
}
