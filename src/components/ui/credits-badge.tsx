"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Coins } from "lucide-react";

export function CreditsBadge() {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    async function fetch() {
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
        if (typeof data === "number") {
          // Direct number response
          setCredits(data);
        } else if (Array.isArray(data)) {
          setCredits(data[0]?.credits_available || 0);
        } else if (typeof data === "object") {
          setCredits(data.credits_available || 0);
        }
      }
    }
    fetch();
  }, []);

  if (credits === null) return null;

  const variant = credits > 50 ? "default" : credits > 10 ? "secondary" : "destructive";

  return (
    <Badge variant={variant} className="gap-1 text-xs px-2 py-1">
      <Coins className="h-3 w-3" />
      <span className="hidden group-data-[collapsible=icon]:hidden sm:inline">
        {credits} credits
      </span>
      <span className="group-data-[collapsible=icon]:inline sm:hidden">
        {credits}
      </span>
    </Badge>
  );
}
