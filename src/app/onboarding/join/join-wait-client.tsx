"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useOrganizationMemberInsertedRedirect } from "@/hooks/use-organization-member-realtime";

export default function JoinWaitClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useOrganizationMemberInsertedRedirect(userId);

  useEffect(() => {
    let mounted = true;
    if (typeof sessionStorage !== "undefined") {
      const o = sessionStorage.getItem("onboarding_pending_org_id");
      if (o && mounted) setPendingOrgId(o);
    }
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) {
        setUserId(user?.id ?? null);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-12">
      <div className="w-full max-w-[620px] rounded-[10px] border border-border/80 bg-card p-6 text-center shadow-sm sm:p-8 dark:border-white/8 dark:bg-[#151516] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground dark:text-[#f7f7f8]">
          Salle d’attente
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground dark:text-[#8a8a8e]">
          Partagez votre identifiant utilisateur avec l’administrateur de l’organisation
          {pendingOrgId ? " (ci-dessous, l’ID d’organisation cible est rappelé)" : ""}. Dès qu’il vous
          aura ajouté à l’équipe, vous serez redirigé automatiquement vers le tableau de bord.
        </p>
        <div className="mt-6 space-y-4">
          {pendingOrgId ? (
            <div className="w-full rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-left text-[13px] text-primary dark:border-[#5e6ad2]/40 dark:bg-[#5e6ad2]/8 dark:text-[#a9b3ff]">
              <span className="font-medium text-foreground dark:text-[#f7f7f8]">Organisation ciblée · </span>
              <span className="break-all font-mono text-[12px] text-foreground dark:text-[#f7f7f8]">{pendingOrgId}</span>
            </div>
          ) : null}
          {loading ? (
            <LoadingSpinner text="Chargement…" />
          ) : (
            <div className="w-full break-all rounded-lg border border-border bg-background p-4 font-mono text-sm text-foreground dark:border-white/8 dark:bg-[#0c0c0e] dark:text-[#f7f7f8]">
              {userId ?? "Non connecté"}
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground/80 dark:text-[#6e6e73]">
            Cette page écoute les ajouts en temps réel — laissez-la ouverte.
          </p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground dark:text-[#8a8a8e] dark:hover:text-[#b4b4b8]"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
