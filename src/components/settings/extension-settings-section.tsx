"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./settings-card";
import { createClient } from "@/lib/supabase/client";

interface ExtensionSettingsSectionProps {
  userId: string | null;
}

export function ExtensionSettingsSection({
  userId: propUserId,
}: ExtensionSettingsSectionProps) {
  const [resolvedUserId, setResolvedUserId] = useState(propUserId);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setResolvedUserId(propUserId);
  }, [propUserId]);

  useEffect(() => {
    if (propUserId) return;
    let mounted = true;
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted && user?.id) setResolvedUserId(user.id);
      } catch {
        // ignore
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [propUserId]);

  const handleCopy = async () => {
    if (!resolvedUserId) return;
    try {
      await navigator.clipboard.writeText(resolvedUserId);
      setCopied(true);
      toast.success("UUID copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const chromeUrl =
    process.env.NEXT_PUBLIC_EXTENSION_CHROME_URL ??
    "https://chromewebstore.google.com";
  const firefoxUrl =
    process.env.NEXT_PUBLIC_EXTENSION_FIREFOX_URL ??
    "https://addons.mozilla.org";

  return (
    <SettingsCard
      title="Extension Andoxa Scout"
      description="Capturez des prospects depuis LinkedIn directement dans votre CRM"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-zinc-50 p-3 dark:bg-black/30">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Votre UUID
            </p>
            <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {resolvedUserId ?? "—"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!resolvedUserId}
            className="shrink-0 gap-1.5"
          >
            <Copy className="size-3.5" />
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
          Instructions d&apos;installation
        </button>

        {expanded && (
          <div className="space-y-4 rounded-lg border bg-zinc-50/50 p-4 dark:bg-black/20">
            <div className="flex flex-wrap gap-2">
              <Link
                href={chromeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <ExternalLink className="size-3.5" /> Chrome / Edge
              </Link>
              <Link
                href={firefoxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <ExternalLink className="size-3.5" /> Firefox
              </Link>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-500 dark:text-zinc-400">
              <li>
                Installez l&apos;extension depuis le store de votre navigateur
                (ou chargez-la en mode développeur).
              </li>
              <li>
                Ouvrez un profil LinkedIn, puis cliquez sur l&apos;icône Andoxa
                pour ouvrir le panneau.
              </li>
              <li>
                Collez votre UUID ci-dessus, choisissez une liste, et envoyez vos
                prospects sur Andoxa.
              </li>
            </ol>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
