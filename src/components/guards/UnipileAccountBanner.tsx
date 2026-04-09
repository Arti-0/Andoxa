"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/lib/workspace";

type UnipileStatus = {
  linkedin_status: string;
  linkedin_error: string | null;
  whatsapp_status: string;
  whatsapp_error: string | null;
};

const ERROR_STATUSES = new Set(["error", "stopped", "disconnected"]);

const DISMISS_KEY = "unipile_banner_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // silencieux
  }
}

export function UnipileAccountBanner() {
  const { isInitialized } = useWorkspace();
  const [status, setStatus] = useState<UnipileStatus | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!isInitialized) return;
    if (isDismissed()) return;

    fetch("/api/unipile/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const data = (json.data ?? json) as UnipileStatus;
        setStatus(data);
        setDismissed(false);
      })
      .catch(() => {});
  }, [isInitialized]);

  const linkedinError = status && ERROR_STATUSES.has(status.linkedin_status);
  const whatsappError = status && ERROR_STATUSES.has(status.whatsapp_status);

  if (dismissed || (!linkedinError && !whatsappError)) return null;

  const accounts: string[] = [];
  if (linkedinError) accounts.push("LinkedIn");
  if (whatsappError) accounts.push("WhatsApp");
  const accountsLabel = accounts.join(" et ");

  const handleDismiss = () => {
    dismiss();
    setDismissed(true);
  };

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/50">
      <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="flex-1">
          Votre compte <strong>{accountsLabel}</strong> est déconnecté ou en
          erreur.{" "}
          <Link
            href="/settings"
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            Reconnecter depuis les paramètres
          </Link>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fermer"
          className="ml-2 shrink-0 rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
