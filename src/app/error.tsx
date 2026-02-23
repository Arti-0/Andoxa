"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "./siteConfig";
import { errorLogger } from "@/lib/error-handling/error-logger";
import { isDevelopment } from "@/lib/config/environment";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log l'erreur avec le contexte
    errorLogger.error("Application error boundary caught an error", error, {
      component: "ErrorBoundary",
      action: "error_display",
      metadata: {
        digest: error.digest,
        stack: error.stack,
        userAgent:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : "unknown",
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      },
    });
  }, [error]);

  // Message d'erreur adapté selon l'environnement
  const getErrorMessage = () => {
    if (isDevelopment()) {
      return (
        error.message ||
        "Une erreur inattendue s'est produite. Consultez la console pour plus de détails."
      );
    }

    // En production, on ne montre pas les détails techniques
    return "Une erreur inattendue s'est produite. Notre équipe a été notifiée et travaille à résoudre le problème.";
  };

  const getErrorTitle = () => {
    if (error.name === "ChunkLoadError") {
      return "Problème de chargement";
    }
    if (error.name === "NetworkError") {
      return "Problème de connexion";
    }
    if (error.message?.includes("auth")) {
      return "Problème d'authentification";
    }
    return "Une erreur s'est produite";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-5xl font-semibold text-muted-foreground">Erreur</p>
        <h1 className="text-xl font-semibold">{getErrorTitle()}</h1>
        <p className="text-sm text-muted-foreground">
          {getErrorMessage()}
        </p>

        {/* Affichage des détails en développement */}
        {isDevelopment() && error.stack && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Détails techniques (dev)
            </summary>
            <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center mt-6">
          <Button onClick={reset} variant="default" size="sm">
            Réessayer
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={siteConfig.baseLinks.home}>
              Retour à l&apos;accueil
            </Link>
          </Button>
        </div>

        {/* Message d'aide en production */}
        {!isDevelopment() && (
          <p className="mt-4 text-xs text-muted-foreground">
            Si le problème persiste, contactez le support à{" "}
            <a
              href="mailto:support@andoxa.fr"
              className="text-primary hover:underline"
            >
              support@andoxa.fr
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
