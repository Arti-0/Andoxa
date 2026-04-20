"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingContinueButton } from "@/app/onboarding/_components/OnboardingContinueButton";
import {
  cardShell,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "@/app/onboarding/_steps/onboarding-layout-classes";

type Status = "loading" | "success" | "error" | "not_connected";
type HandshakeState = "idle" | "waiting" | "acknowledged" | "missing";

const LOGIN_REDIRECT = "/auth/login?next=/extension/connect";

type ExtensionTokenPayload = {
  type: "ANDOXA_EXTENSION_TOKEN";
  token: string;
  user?: { full_name?: string | null; email?: string | null } | null;
  expires_in: number;
  expires_at: number | null;
};

function postTokenToExtension(payload: ExtensionTokenPayload) {
  window.postMessage(payload, window.location.origin);
}

/** Demande au content script de fermer l'onglet via le background.
 *  window.close() ne fonctionne pas pour les onglets ouverts par l'extension. */
function requestTabClose() {
  window.postMessage({ type: "ANDOXA_CLOSE_TAB" }, window.location.origin);
}

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const [userLabel, setUserLabel] = useState<string>("");
  const [handshake, setHandshake] = useState<HandshakeState>("idle");
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** true une fois que le content script a répondu au PING. */
  const extensionPonged = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function onMessage(event: MessageEvent) {
      if (event.source !== window || !event.data) return;
      const type = (event.data as { type?: string }).type;

      // Le content script confirme qu'il est bien actif.
      if (type === "ANDOXA_PONG") {
        extensionPonged.current = true;
        return;
      }

      if (type !== "ANDOXA_EXTENSION_TOKEN_ACK") return;
      if (cancelled) return;

      const ok = Boolean((event.data as { ok?: boolean }).ok);
      setHandshake(ok ? "acknowledged" : "missing");

      if (ok) {
        // Le background va fermer l'onglet après avoir stocké le token.
        // On déclenche également une fermeture via postMessage au cas où
        // le background l'aurait déjà fait avant que l'ACK arrive côté page.
        closeTimer.current = setTimeout(() => {
          if (cancelled) return;
          requestTabClose();
        }, 800);
      }
    }

    window.addEventListener("message", onMessage);

    async function connect() {
      try {
        const res = await fetch("/api/extension/token", {
          credentials: "include",
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 401) {
          setStatus("not_connected");
          setMessage("Redirection vers la page de connexion…");
          redirectTimer.current = setTimeout(() => {
            window.location.replace(LOGIN_REDIRECT);
          }, 250);
          return;
        }

        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`);
        }

        const json = (await res.json()) as {
          data?: {
            token: string;
            user?: { full_name?: string | null; email?: string | null };
            expires_in?: number | null;
            expires_at?: number | null;
          };
          token?: string;
          user?: { full_name?: string | null; email?: string | null };
          expires_in?: number | null;
          expires_at?: number | null;
        };
        const data = json.data ?? json;

        if (!data?.token) {
          throw new Error("Jeton manquant dans la réponse.");
        }

        const payload: ExtensionTokenPayload = {
          type: "ANDOXA_EXTENSION_TOKEN",
          token: data.token,
          user: data.user ?? null,
          expires_in: data.expires_in ?? 3600,
          expires_at: data.expires_at ?? null,
        };

        const label =
          data.user?.full_name?.trim() ||
          data.user?.email?.trim() ||
          "utilisateur";

        setUserLabel(label);
        setStatus("success");
        setMessage("Transmission du jeton à l'extension…");
        setHandshake("waiting");

        // PING pour savoir si le content script est actif sur cette page.
        window.postMessage({ type: "ANDOXA_PING" }, window.location.origin);

        // Envoi immédiat + renvois espacés pour couvrir les cas où le
        // content script n'était pas encore attaché.
        postTokenToExtension(payload);
        [150, 500, 1200, 2500].forEach((ms) => {
          const t = setTimeout(() => {
            if (cancelled) return;
            postTokenToExtension(payload);
          }, ms);
          retryTimers.current.push(t);
        });

        // Si aucun ACK et aucun PONG dans les 4 s → extension absente.
        missingTimer.current = setTimeout(() => {
          if (cancelled) return;
          setHandshake((current) => {
            if (current === "acknowledged") return current;
            // Le content script a répondu au PING → il est là mais n'a
            // pas encore envoyé l'ACK. On reste "waiting" et on laisse
            // le spinner tourner.
            if (extensionPonged.current) return current;
            return "missing";
          });
        }, 4000);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Erreur inconnue");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
        redirectTimer.current = null;
      }
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      if (missingTimer.current) {
        clearTimeout(missingTimer.current);
        missingTimer.current = null;
      }
      retryTimers.current.forEach(clearTimeout);
      retryTimers.current = [];
    };
  }, []);

  const title =
    status === "loading"
      ? "Connexion de l'extension"
      : status === "success"
        ? handshake === "acknowledged"
          ? "Extension connectée"
          : "Connexion en cours"
        : status === "error"
          ? "Connexion impossible"
          : "Un instant…";

  const subtitle =
    status === "loading"
      ? "Authentification en cours…"
      : status === "success"
        ? handshake === "acknowledged"
          ? `Connecté en tant que ${userLabel}. Cet onglet va se fermer automatiquement.`
          : handshake === "missing"
            ? "L'extension Andoxa ne répond pas sur cette page."
            : `Connecté en tant que ${userLabel}. ${message}`
        : status === "error"
          ? message || "Une erreur est survenue."
          : message || "Redirection vers la page de connexion.";

  return (
    <div className="flex min-h-dvh w-full flex-col bg-zinc-50 dark:bg-[#0A0A0A]">
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-4 sm:px-6">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8">
            <div className="mb-10 flex flex-col items-center">
              <Image
                src="/assets/logofiles/logo_1.svg"
                alt="Andoxa"
                width={160}
                height={48}
                className="h-10 w-auto dark:hidden"
                priority
              />
              <Image
                src="/assets/logofiles/logo_3.svg"
                alt="Andoxa"
                width={160}
                height={48}
                className="hidden h-10 w-auto dark:block"
                priority
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${status}:${handshake}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full flex-col items-center gap-10"
              >
                <h1 className={welcomeStepTitleClass}>{title}</h1>

                <div className={cn(cardShell, setupFormMax, "text-center")}>
                  <div className="flex flex-col items-center gap-4">
                    <StatusIcon status={status} handshake={handshake} />
                    <p className={cn(subClass, "mt-0! mb-0!")}>{subtitle}</p>
                  </div>

                  {status === "success" && handshake === "missing" ? (
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      <p className="font-semibold">
                        L&apos;extension Andoxa semble absente ou inactive.
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
                        <li>
                          Vérifiez qu&apos;elle est installée et activée dans
                          votre navigateur.
                        </li>
                        <li>
                          Si vous venez de l&apos;installer, rechargez-la puis
                          rouvrez cet onglet.
                        </li>
                        <li>
                          Vérifiez que l&apos;URL du serveur configurée dans
                          l&apos;extension correspond bien à cette page.
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  {status === "success" ? (
                    <div className="mt-6 flex justify-center">
                      <OnboardingContinueButton
                        onClick={() => {
                          requestTabClose();
                        }}
                      >
                        Fermer cet onglet
                      </OnboardingContinueButton>
                    </div>
                  ) : null}

                  {status === "error" ? (
                    <div className="mt-6 flex justify-center">
                      <OnboardingContinueButton
                        onClick={() => window.location.reload()}
                      >
                        Réessayer
                      </OnboardingContinueButton>
                    </div>
                  ) : null}

                  {status === "not_connected" ? (
                    <div className="mt-6 flex justify-center">
                      <OnboardingContinueButton
                        onClick={() => {
                          window.location.replace(LOGIN_REDIRECT);
                        }}
                      >
                        Se connecter
                      </OnboardingContinueButton>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusIcon({
  status,
  handshake,
}: {
  status: Status;
  handshake: HandshakeState;
}) {
  if (status === "loading" || status === "not_connected") {
    return (
      <span className="inline-flex size-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </span>
    );
  }

  if (status === "success") {
    if (handshake === "missing") {
      return (
        <span className="inline-flex size-12 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
      );
    }
    if (handshake === "acknowledged") {
      return (
        <span className="inline-flex size-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
      );
    }
    return (
      <span className="inline-flex size-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </span>
    );
  }

  return (
    <span className="inline-flex size-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <AlertTriangle className="size-6" aria-hidden />
    </span>
  );
}
