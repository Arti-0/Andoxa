"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function isNewAccountFromIdentities(user: User | null): boolean {
  if (!user?.identities?.length) return false;
  return user.identities
    .filter((i) => i.provider === "email")
    .some(
      (i) =>
        i.created_at != null &&
        i.updated_at != null &&
        i.created_at === i.updated_at
    );
}

function redeemErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "Erreur lors de la validation de l'invitation.";
  }
  const o = data as Record<string, unknown>;
  const err = o.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Erreur lors de la validation de l'invitation.";
}

function InviteCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const [errorMsg, setErrorMsg] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const controller = new AbortController();
    const supabase = createClient();

    async function handleInvite() {
      try {
        const hash = window.location.hash.slice(1);
        const hashParams = new URLSearchParams(hash);

        const hashError = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");
        if (hashError) {
          setErrorMsg(errorDescription ?? hashError);
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            setErrorMsg("Session invalide : " + sessionError.message);
            return;
          }
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            setErrorMsg(
              "Lien invalide ou expiré. Demandez un nouvel email d'invitation."
            );
            return;
          }
        }

        if (inviteToken) {
          const res = await fetch("/api/invitations/redeem", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invite_token: inviteToken }),
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          const data: unknown = await res.json().catch(() => ({}));

          if (controller.signal.aborted) return;

          const ok =
            res.ok &&
            typeof data === "object" &&
            data !== null &&
            (data as { success?: boolean }).success === true;
          if (!ok) {
            setErrorMsg(redeemErrorMessage(data));
            return;
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setErrorMsg("Utilisateur introuvable après connexion.");
          return;
        }

        const isNew = isNewAccountFromIdentities(user);
        router.replace(
          isNew ? "/auth/update-password?next=/dashboard" : "/dashboard"
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("InviteCallback unexpected error:", err);
        setErrorMsg("Une erreur inattendue est survenue.");
      }
    }

    void handleInvite();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once at mount; inviteToken/router stable for this flow
  }, []);

  if (errorMsg) {
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
