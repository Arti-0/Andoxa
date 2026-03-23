"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Une erreur inattendue est survenue
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Notre équipe a été notifiée et travaille à résoudre le problème.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
