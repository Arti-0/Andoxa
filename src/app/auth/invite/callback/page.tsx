"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function parseHashParams(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  const { hash } = window.location;
  if (!hash?.startsWith("#")) return out;
  try {
    const params = new URLSearchParams(hash.slice(1));
    params.forEach((value, key) => {
      out[key] = value;
    });
  } catch {
    /* ignore malformed hash */
  }
  return out;
}

/** Nouveau compte : identité jamais mise à jour (created_at === updated_at). */
function isNewAccountFromIdentities(user: User | null): boolean {
  const identities = user?.identities;
  if (!identities?.length) return false;
  return identities.some(
    (identity) =>
      identity.created_at != null &&
      identity.updated_at != null &&
      identity.created_at === identity.updated_at
  );
}

function stripHashFromHistory() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

function InviteCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function handleInvite() {
      try {
        const hashParams = parseHashParams();

        if (
          hashParams.error ||
          hashParams.error_description ||
          hashParams.error_code
        ) {
          setErrorMsg(
            hashParams.error_description ||
              hashParams.error ||
              "Lien invalide ou expiré. Demandez un nouvel email d'invitation."
          );
          setStatus("error");
          return;
        }

        const accessToken = hashParams.access_token;
        const refreshToken = hashParams.refresh_token;

        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) {
            setErrorMsg(
              setErr.message ||
                "Lien invalide ou expiré. Demandez un nouvel email d'invitation."
            );
            setStatus("error");
            return;
          }
          stripHashFromHistory();
        } else {
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

        let json: {
          success?: boolean;
          error?: { message?: string };
        };
        try {
          json = (await res.json()) as typeof json;
        } catch {
          setErrorMsg(
            "Une erreur est survenue lors de la validation de votre invitation."
          );
          setStatus("error");
          return;
        }

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
        const isNewAccount = isNewAccountFromIdentities(user);

        router.replace(
          isNewAccount
            ? "/auth/update-password?next=/dashboard"
            : "/dashboard"
        );
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Une erreur inattendue s'est produite.";
        setErrorMsg(msg);
        setStatus("error");
      }
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
