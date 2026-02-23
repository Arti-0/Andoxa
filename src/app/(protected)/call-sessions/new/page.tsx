"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function NewCallSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function createAndRedirect() {
      const listes = searchParams.get("listes");
      const prospects = searchParams.get("prospects");

      const body: { prospect_ids?: string[]; bdd_ids?: string[] } = {};

      if (prospects?.trim()) {
        body.prospect_ids = prospects.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (listes?.trim()) {
        body.bdd_ids = listes.split(",").map((s) => s.trim()).filter(Boolean);
      }

      if (!body.prospect_ids?.length && !body.bdd_ids?.length) {
        setError("Aucune sélection. Choisissez des prospects ou des listes depuis le CRM.");
        return;
      }

      try {
        const res = await fetch("/api/call-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        if (cancelled) return;

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          const msg =
            json?.error?.details?.prospect_ids ??
            json?.error?.message ??
            "Impossible de créer la session";
          setError(msg);
          return;
        }

        const data = await res.json();
        const session = data?.data ?? data;
        if (session?.id) {
          router.replace(`/call-sessions/${session.id}`);
        } else {
          setError("Réponse invalide du serveur");
        }
      } catch {
        if (!cancelled) setError("Erreur réseau");
      }
    }

    createAndRedirect();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">{error}</p>
        <a
          href="/crm"
          className="text-sm text-primary hover:underline"
        >
          Retour au CRM
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Création de la session en cours...
      </p>
    </div>
  );
}

/**
 * Page /call-sessions/new
 * Creates a session from ?listes=id1,id2 or ?prospects=id1,id2 and redirects to /call-sessions/[id]
 */
export default function NewCallSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-4 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      }
    >
      <NewCallSessionContent />
    </Suspense>
  );
}
