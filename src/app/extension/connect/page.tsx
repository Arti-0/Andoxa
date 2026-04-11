"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "success" | "error" | "not_connected";

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function connect() {
      try {
        const res = await fetch("/api/extension/token", {
          credentials: "include",
        });

        if (res.status === 401) {
          setStatus("not_connected");
          setMessage("Connectez-vous à Andoxa puis revenez sur cette page.");
          return;
        }

        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`);
        }

        const json = await res.json();
        const data = json?.data ?? json;

        window.postMessage(
          {
            type: "ANDOXA_EXTENSION_TOKEN",
            token: data.token,
            user: data.user,
            expires_in: data.expires_in ?? 3600,
            expires_at: data.expires_at,
          },
          window.location.origin
        );

        setStatus("success");
        setMessage(
          `Connecté en tant que ${data.user?.full_name ?? data.user?.email ?? "utilisateur"} — cet onglet va se fermer.`
        );
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Erreur inconnue");
      }
    }

    void connect();
  }, []);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "16px",
        padding: "24px",
        background: "#fafafa",
      }}
    >
      <img
        src="/assets/favicon/icon0.svg"
        alt="Andoxa"
        style={{ height: 40 }}
      />

      {status === "loading" ? (
        <p style={{ color: "#71717a", fontSize: 14 }}>Connexion en cours...</p>
      ) : null}

      {status === "success" ? (
        <>
          <p style={{ color: "#16a34a", fontWeight: 600, fontSize: 16 }}>
            ✓ Extension connectée
          </p>
          <p style={{ color: "#71717a", fontSize: 13 }}>{message}</p>
        </>
      ) : null}

      {status === "not_connected" ? (
        <>
          <p style={{ color: "#dc2626", fontWeight: 600, fontSize: 15 }}>
            Non connecté à Andoxa
          </p>
          <p style={{ color: "#71717a", fontSize: 13 }}>{message}</p>
          <a
            href="/auth/login"
            style={{
              background: "#4f46e5",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Se connecter à Andoxa
          </a>
        </>
      ) : null}

      {status === "error" ? (
        <>
          <p style={{ color: "#dc2626", fontWeight: 600 }}>Erreur</p>
          <p style={{ color: "#71717a", fontSize: 13 }}>{message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#f4f4f5",
              border: "1px solid #e4e4e7",
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Réessayer
          </button>
        </>
      ) : null}
    </div>
  );
}
