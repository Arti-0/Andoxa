"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function InviteCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function handleInvite() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setErrorMsg(
          "Lien invalide ou expiré. Demandez un nouvel email d'invitation."
        );
        setStatus("error");
        return;
      }

      if (!inviteToken) {
        router.replace("/dashboard");
        return;
      }

      const res = await fetch("/api/invitations/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_token: inviteToken }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };

      if (!res.ok || !json.success) {
        setErrorMsg(
          json.error?.message ??
            "Une erreur est survenue lors de la validation de votre invitation."
        );
        setStatus("error");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isNewAccount = user?.created_at === user?.last_sign_in_at;

      router.replace(
        isNewAccount
          ? "/auth/update-password?next=/dashboard"
          : "/dashboard"
      );
    }

    void handleInvite();
  }, [inviteToken, router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm space-y-4 text-center">
          <p className="text-destructive text-sm">{errorMsg}</p>
          <a
            href="/auth/login"
            className="text-muted-foreground block text-sm underline"
          >
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Connexion en cours…</p>
    </div>
  );
}

export default function InviteCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground text-sm">Connexion en cours…</p>
        </div>
      }
    >
      <InviteCallbackInner />
    </Suspense>
  );
}
