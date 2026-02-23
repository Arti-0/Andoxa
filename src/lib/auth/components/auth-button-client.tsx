"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import { useEffect, useState } from "react";
import { logger } from "@/lib/utils/logger";

export function AuthButton() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Simple auth check - no profile verification, no sign out
    // Profile verification is handled by the layout
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error("Error getting session in AuthButton", sessionError);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        logger.error("Error in checkAuth", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes - update state only, no profile checks
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT" || !session) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <Button asChild variant="outline">
        <Link href="/auth/login">Connexion</Link>
      </Button>
    );
  }

  return user ? (
    <div className="flex items-center gap-2">
      <Button 
        asChild 
        variant="ghost"
        size="sm" 
        className="btn-neumorphism glassmorphism btn-gradient-border rounded-full !border-0 text-slate-800 dark:text-slate-100"
      >
        <Link href="/dashboard" className="relative z-10">Vue d&apos;ensemble</Link>
      </Button>
      <LogoutButton />
    </div>
  ) : (
    <Button asChild variant="outline">
      <Link href="/auth/login">Connexion</Link>
    </Button>
  );
}
