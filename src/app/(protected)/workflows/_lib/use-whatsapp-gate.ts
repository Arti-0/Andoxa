"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { useUnipileConnections } from "@/app/(protected)/messagerie/queries";

/**
 * Block workflow-builder access when WhatsApp isn't connected. While the
 * connection state is still loading we return "pending" so the caller can
 * render a placeholder; if WhatsApp is absent we fire the warning toast once
 * and redirect back to the list. The ref guard prevents the toast/redirect
 * from re-firing on every render while the redirect is in flight.
 */
export function useWhatsappWorkflowGate(): "ok" | "pending" | "blocked" {
  const router = useRouter();
  const { data, isLoading } = useUnipileConnections();
  const firedRef = useRef(false);

  const whatsappConnected = data?.whatsappConnected;
  const checked = !isLoading && data !== undefined;

  useEffect(() => {
    if (!checked) return;
    if (whatsappConnected) return;
    if (firedRef.current) return;
    firedRef.current = true;
    toast.warning(
      "Connectez WhatsApp depuis Installation pour enregistrer ce parcours (un autre membre peut avoir la boîte connectée).",
      { duration: 8000 },
    );
    router.replace("/workflows");
  }, [checked, whatsappConnected, router]);

  if (!checked) return "pending";
  if (!whatsappConnected) return "blocked";
  return "ok";
}
