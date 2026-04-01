"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const INVITE_LINK_ERROR_MESSAGE =
  "Lien invalide ou expiré. Demandez un nouvel e-mail d'invitation.";

function InviteCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function handleInvite() {
      try {
        const hashParams = new URLSearchParams(
          window.location.hash.slice(1)
        );

        const hashError = hashParams.get("error");
        if (hashError) {
          setErrorMsg(
            hashParams.get("error_description") ?? INVITE_LINK_ERROR_MESSAGE
          );
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (!accessToken || !refreshToken) {
          setErrorMsg(INVITE_LINK_ERROR_MESSAGE);
          return;
        }

        if (!inviteToken?.trim()) {
          setErrorMsg("Lien d'invitation incomplet.");
          return;
        }

        const supabaseUrl = (
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
        ).replace(/\/$/, "");
        const supabaseKey =
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!supabaseUrl || !supabaseKey) {
          setErrorMsg("Configuration Supabase manquante.");
          return;
        }

        const tokenRes = await fetch(
          `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
            signal: controller.signal,
          }
        );

        if (!tokenRes.ok) {
          const err = (await tokenRes
            .json()
            .catch(() => ({}))) as Record<string, unknown>;
          setErrorMsg(
            (err.error_description as string) ?? INVITE_LINK_ERROR_MESSAGE
          );
          return;
        }

        const tokenData = (await tokenRes.json()) as {
          access_token: string;
          refresh_token: string;
        };

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );

        const sessionRes = await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            invite_token: inviteToken.trim(),
          }),
        });

        const sessionJson = (await sessionRes.json()) as {
          success?: boolean;
          redirect?: string;
          error?: string;
        };

        if (!sessionRes.ok || !sessionJson.success || !sessionJson.redirect) {
          setErrorMsg(
            sessionJson.error ?? "Impossible d'activer la session."
          );
          return;
        }

        router.replace(sessionJson.redirect);
      } catch {
        if (!controller.signal.aborted) {
          setErrorMsg(INVITE_LINK_ERROR_MESSAGE);
        }
      }
    }

    void handleInvite();

    return () => controller.abort();
  }, [inviteToken, router]);

  if (errorMsg) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <p className="max-w-md text-sm text-zinc-300">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4">
      <p className="text-sm text-zinc-400">Connexion en cours…</p>
    </div>
  );
}

export default function InviteCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-sm text-zinc-400">
          Chargement…
        </div>
      }
    >
      <InviteCallbackInner />
    </Suspense>
  );
}
