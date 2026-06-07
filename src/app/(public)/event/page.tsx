import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Script from "next/script";
import { EventLandingForm } from "@/components/event/event-register-form";
import "./event.css";

const LINKEDIN_SEBASTIAN =
  "https://www.linkedin.com/in/sebastian-bodin-2960a7327/";
const LINKEDIN_ANDREAS =
  "https://www.linkedin.com/in/andréas-bodin/";

export const metadata: Metadata = {
  title: "Andoxa, tarif inaugural",
  description:
    "Tarif inaugural à vie, réservé à la salle. Andoxa, the revenue engine.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0052D9",
  viewportFit: "cover",
};

export default function EventLandingPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  const allowRetest =
    process.env.NODE_ENV === "development" ||
    process.env.CONFERENCE_DISABLE_RATE_LIMIT?.trim().toLowerCase() === "true";

  return (
    <div className="event-landing-root">
      {turnstileSiteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          async
          defer
        />
      ) : null}

      <header className="el-header">
        <a className="el-logo" href="/" aria-label="Andoxa">
          <Image
            src="/assets/logofiles/andoxa-logo-light.svg"
            alt=""
            width={120}
            height={26}
            className="el-logo-img"
            priority
          />
        </a>
        <span className="el-pill" aria-label="Soirée du pitch, en cours">
          <span className="el-dot" />
          Ce soir
        </span>
      </header>

      <main className="el-main">
        <section className="el-hero">
          <h1 className="el-h1">
            Vous venez
            <br />
            du pitch.
          </h1>
          <p className="el-sub">
            <span className="el-accent">Tarif inaugural à vie</span>, réservé à
            la salle de ce soir.
            <span className="el-light">
              30 secondes. On vous écrit dès demain.
            </span>
          </p>
        </section>

        <EventLandingForm
          turnstileSiteKey={turnstileSiteKey}
          allowRetest={allowRetest}
        />

        <section className="el-reminder">
          <div className="el-eyebrow">Andoxa, en deux phrases</div>
          <h3>Le revenue engine B2B.</h3>
          <p>
            <b>LinkedIn, WhatsApp, booking, CRM</b>, dans un seul outil. On
            orchestre tout ce qui se passe entre le moment où un prospect booke
            un RDV et le moment où il signe.
          </p>
        </section>
      </main>

      <footer className="el-footer">
        <span className="el-who">
          Sebastian &amp; Andreas, co-fondateurs Andoxa
        </span>
        <div className="el-links">
          <a href={LINKEDIN_SEBASTIAN} target="_blank" rel="noopener noreferrer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.25 6.5 1.75 1.75 0 0 1 6.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
            </svg>
            Sebastian
          </a>
          <a href={LINKEDIN_ANDREAS} target="_blank" rel="noopener noreferrer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.25 6.5 1.75 1.75 0 0 1 6.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
            </svg>
            Andreas
          </a>
        </div>
        <small>&copy; Andoxa, the revenue engine. Made in France.</small>
      </footer>
    </div>
  );
}
