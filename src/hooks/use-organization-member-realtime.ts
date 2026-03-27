"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * When an organization_members row is inserted for this user (e.g. owner added them),
 * go to the dashboard. Requires Realtime on organization_members (see migration 016).
 */
export function useOrganizationMemberInsertedRedirect(userId: string | null | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`org-member-wait-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "organization_members",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as { organization_id?: string; role?: string } | null;
          const orgId = row?.organization_id;
          const role = row?.role ?? "member";
          if (orgId && userId) {
            await supabase
              .from("profiles")
              .update({
                active_organization_id: orgId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);

            // Keep JWT claims in sync with the active org before redirecting.
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const currentMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
            const { error: metaErr } = await supabase.auth.updateUser({
              data: {
                ...currentMeta,
                active_organization_id: orgId,
                active_organization_role: role,
              },
            });
            if (metaErr) {
              console.error("[Onboarding Join] Failed to sync JWT metadata:", metaErr);
            }
          }
          router.refresh();
          router.push("/dashboard");
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);
}
