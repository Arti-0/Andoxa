"use client";

import { useEffect, useRef, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEL_RE = /^[+\d][\d\s().\-]{6,}$/;

type Status = "idle" | "submitting" | "success" | "error";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
          size?: "normal" | "flexible" | "compact" | "invisible";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
  }
}

function apiErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Oups, quelque chose a planté. Réessayez.";
}

export function EventLandingForm({
  turnstileSiteKey,
  allowRetest = false,
}: {
  turnstileSiteKey: string | null;
  /** Show "Tester à nouveau" after success (dev / CONFERENCE_DISABLE_RATE_LIMIT). */
  allowRetest?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentWhatsApp, setSentWhatsApp] = useState<boolean | null>(null);
  const turnstileMountRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileMountRef.current) return;

    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      if (window.turnstile && turnstileMountRef.current) {
        if (turnstileWidgetIdRef.current) return;
        turnstileWidgetIdRef.current = window.turnstile.render(
          turnstileMountRef.current,
          {
            sitekey: turnstileSiteKey,
            theme: "light",
            appearance: "interaction-only", // invisible unless challenged
            size: "flexible",
          }
        );
      } else {
        window.setTimeout(tryRender, 250);
      }
    };
    tryRender();

    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const whatsapp = String(fd.get("whatsapp") ?? "").trim();
    const honeypot = String(fd.get("website") ?? "");

    if (!name) {
      setError("Oups, il manque votre nom.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Votre email ne semble pas valide.");
      return;
    }
    if (!company) {
      setError("Et le nom de votre boîte ?");
      return;
    }
    if (whatsapp && !TEL_RE.test(whatsapp)) {
      setError("Le numéro WhatsApp n'a pas l'air valide.");
      return;
    }

    let turnstileToken: string | undefined;
    if (turnstileSiteKey) {
      turnstileToken =
        window.turnstile?.getResponse(turnstileWidgetIdRef.current ?? undefined) ||
        undefined;
      if (!turnstileToken) {
        setError("Vérification anti-robot en cours, réessayez dans un instant.");
        return;
      }
    }

    setStatus("submitting");

    const campaign =
      new URLSearchParams(window.location.search).get("campaign") ||
      "launch_inaugural";

    const payload = {
      name,
      email,
      company,
      whatsapp,
      website: honeypot,
      campaign,
      consent: true,
      turnstileToken,
      submitted_at: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/event/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        sentWhatsApp?: boolean;
        error?: string;
      };

      if (!res.ok || !json.success) {
        setError(apiErrorMessage(json.error));
        setStatus("error");
        if (turnstileSiteKey && window.turnstile) {
          window.turnstile.reset(turnstileWidgetIdRef.current ?? undefined);
        }
        return;
      }

      setSentWhatsApp(!!json.sentWhatsApp);
      setStatus("success");
    } catch {
      setError("Connexion impossible. Réessayez.");
      setStatus("error");
      if (turnstileSiteKey && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current ?? undefined);
      }
    }
  }

  if (status === "success") {
    return (
      <div className="el-success show" role="status" aria-live="polite">
        <div className="el-check" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>C&apos;est dans la poche.</h2>
        <p className="el-tight">
          Votre <b>tarif inaugural à vie</b> est réservé.
        </p>
        <p>
          {sentWhatsApp
            ? "Vous recevez un WhatsApp dans quelques secondes."
            : "On revient vers vous dès demain."}
        </p>
        <p className="el-callout">
          En attendant, venez nous voir au cocktail.
          <br />
          <b>Sebastian &amp; Andreas.</b>
        </p>
        {allowRetest ? (
          <button
            type="button"
            className="el-retest"
            onClick={() => {
              setStatus("idle");
              setError(null);
              setSentWhatsApp(null);
              turnstileWidgetIdRef.current = null;
              if (turnstileSiteKey && window.turnstile) {
                window.turnstile.reset(turnstileWidgetIdRef.current ?? undefined);
              }
            }}
          >
            Tester à nouveau
          </button>
        ) : null}
      </div>
    );
  }

  const isLoading = status === "submitting";

  return (
    <form className="el-form" onSubmit={handleSubmit} noValidate>
      <div className="el-field">
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Votre nom"
          autoComplete="name"
          autoCapitalize="words"
          spellCheck={false}
          required
          aria-label="Votre prénom et nom"
        />
      </div>

      <div className="el-field">
        <input
          type="email"
          id="email"
          name="email"
          placeholder="votre@email.com"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="email"
          required
          aria-label="Email professionnel"
        />
      </div>

      <div className="el-field">
        <input
          type="text"
          id="company"
          name="company"
          placeholder="Le nom de votre boîte"
          autoComplete="organization"
          autoCapitalize="words"
          spellCheck={false}
          required
          aria-label="Nom de l'entreprise"
        />
      </div>

      <div className="el-field">
        <input
          type="tel"
          id="whatsapp"
          name="whatsapp"
          placeholder="+33 6 12 34 56 78"
          autoComplete="tel"
          inputMode="tel"
          aria-label="Numéro WhatsApp (optionnel)"
        />
        <p className="el-help">
          <b>WhatsApp</b>, optionnel, recommandé. Pour qu&apos;on vous contacte
          par WhatsApp, comme Andoxa fait avec vos prospects.
        </p>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="el-honeypot"
      />

      {turnstileSiteKey ? (
        <div className="el-turnstile" ref={turnstileMountRef} />
      ) : null}

      <button
        type="submit"
        className={`el-submit${isLoading ? " is-loading" : ""}`}
        disabled={isLoading}
      >
        <span className="el-spinner" aria-hidden="true" />
        <span className="el-label">
          {isLoading ? "On enregistre…" : "Je réserve mon tarif à vie"}
        </span>
        <svg
          className="el-arrow"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>

      <p className="el-consent">
        En soumettant, vous acceptez d&apos;être recontacté·e par Andoxa au
        sujet de cette offre. Voir notre{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          politique de confidentialité
        </a>
        . Désinscription à tout moment.
      </p>

      {error ? (
        <div className="el-error show" role="alert">
          {error}
        </div>
      ) : null}
    </form>
  );
}
