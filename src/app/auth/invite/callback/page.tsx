"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Lien magique Supabase invalide / expiré — message unique (pas de texte fournisseur brut). */
const INVITE_LINK_ERROR_MESSAGE =
  "Lien invalide ou expiré. Demandez un nouvel email d'invitation.";

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

function InviteCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const [errorMsg, setErrorMsg] = useState("");
  const [debugSteps, setDebugSteps] = useState<string[]>([]);
  const handled = useRef(false);

  const addStep = (msg: string) => {
    console.log("[invite-callback]", msg);
    setDebugSteps((prev) => [
      ...prev,
      `${new Date().toISOString().slice(11, 19)} ${msg}`,
    ]);
  };

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // AbortController uniquement pour le fetch redeem — pas pour setSession (Strict Mode
    // déclenche le cleanup tout de suite et abort() ne doit pas couper setSession).
    const controller = new AbortController();
    let unmounted = false;
    const supabase = createClient();

    async function handleInvite() {
      try {
        addStep("start — inviteToken: " + (inviteToken ?? "none"));

        const hash = window.location.hash.slice(1);
        const hashParams = new URLSearchParams(hash);
        addStep("hash keys: " + [...hashParams.keys()].join(", ") || "(empty)");

        const hashError = hashParams.get("error");
        if (hashError) {
          addStep(
            "hash error: " +
              hashError +
              " / " +
              (hashParams.get("error_description") ?? "")
          );
          setErrorMsg(
            hashParams.get("error_description") ?? hashError ?? INVITE_LINK_ERROR_MESSAGE
          );
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        addStep(
          "tokens present: " + Boolean(accessToken) + " / " + Boolean(refreshToken)
        );

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          addStep("setSession error: " + (sessionError?.message ?? "none"));
          if (sessionError) {
            setErrorMsg("Session invalide : " + sessionError.message);
            return;
          }
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
          addStep("replaceState (hash cleared)");
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          addStep("getSession: " + (session ? "found" : "null"));
          if (!session) {
            setErrorMsg(INVITE_LINK_ERROR_MESSAGE);
            return;
          }
        }

        if (unmounted) {
          addStep("unmounted after setSession — stopping");
          return;
        }

        if (inviteToken) {
          addStep("fetching redeem...");
          const res = await fetch("/api/invitations/redeem", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invite_token: inviteToken }),
            signal: controller.signal,
          });
          if (controller.signal.aborted) {
            addStep("aborted after fetch");
            return;
          }

          const data: Record<string, unknown> = await res
            .json()
            .catch(() => ({} as Record<string, unknown>));
          addStep(
            "redeem status: " +
              res.status +
              " data: " +
              JSON.stringify(data)
          );

          if (controller.signal.aborted) {
            addStep("aborted after json");
            return;
          }

          const redeemSucceeded =
            res.ok &&
            typeof data === "object" &&
            data !== null &&
            data.success === true;
          if (!redeemSucceeded) {
            const err = data.error;
            setErrorMsg(
              typeof err === "string"
                ? err
                : err &&
                    typeof err === "object" &&
                    "message" in err &&
                    typeof (err as { message: unknown }).message === "string"
                  ? (err as { message: string }).message
                  : "Erreur lors de la validation."
            );
            return;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        addStep(
          "getUser: " +
            (user?.id ?? "null") +
            " error: " +
            (userError?.message ?? "none")
        );
        if (!user) {
          setErrorMsg("Utilisateur introuvable après connexion.");
          return;
        }

        const isNew = isNewAccountFromIdentities(user);
        addStep("isNew: " + isNew + " → redirecting");
        router.replace(
          isNew ? "/auth/update-password?next=/dashboard" : "/dashboard"
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          addStep("AbortError — ignoring");
          return;
        }
        addStep("unexpected error: " + String(err));
        console.error("InviteCallback unexpected error:", err);
        setErrorMsg("Une erreur inattendue est survenue.");
      }
    }

    void handleInvite();

    return () => {
      unmounted = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once at mount; inviteToken/router stable for this flow
  }, []);

  const debugPanel = (
    <div className="text-center space-y-1">
      {debugSteps.map((s, i) => (
        <p
          key={i}
          className="text-muted-foreground text-left font-mono text-xs"
        >
          {s}
        </p>
      ))}
    </div>
  );

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-destructive text-base">{errorMsg}</p>
          {debugPanel}
          <a
            href="/auth/login"
            className="text-muted-foreground block text-base underline"
          >
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-2">
        <p className="text-muted-foreground text-sm">Connexion en cours…</p>
        {debugPanel}
      </div>
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
