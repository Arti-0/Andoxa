"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Coins, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EnrichmentCreditsDisplayProps {
  className?: string;
}

export function EnrichmentCreditsDisplay({ className = "" }: EnrichmentCreditsDisplayProps) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("active_organization_id")
          .eq("id", user.id)
          .single();

        if (!profile?.active_organization_id) return;

        const { data } = await supabase.rpc("get_or_create_credits", {
          p_organization_id: profile.active_organization_id,
        });

        if (data !== null && data !== undefined) {
          // Handle different response types
          if (typeof data === 'number') {
            // Direct number response
            setCredits(data);
          } else if (Array.isArray(data)) {
            setCredits(data[0]?.credits_available || 0);
          } else if (typeof data === 'object') {
            setCredits(data.credits_available || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
  }, []);

  if (loading) {
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Coins className="h-3 w-3 animate-pulse" />
        <span className="text-xs">Chargement...</span>
      </Badge>
    );
  }

  if (credits === null) {
    return (
      <Badge variant="destructive" className={`gap-1 ${className}`}>
        <AlertTriangle className="h-3 w-3" />
        <span className="text-xs">Erreur</span>
      </Badge>
    );
  }

  const variant = credits > 50 ? "default" : credits > 10 ? "secondary" : "destructive";

  return (
    <Badge variant={variant} className={`gap-1 text-xs px-2 py-1 ${className}`}>
      <Coins className="h-3 w-3" />
      <span>
        {credits} crédit{credits > 1 ? 's' : ''}
      </span>
    </Badge>
  );
}
