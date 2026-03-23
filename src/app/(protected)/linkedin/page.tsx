"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Copy,
  Link2,
  Loader2,
  CheckCircle,
  Linkedin,
  MessageCircle,
  Puzzle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/lib/workspace";
import { toast } from "sonner";

interface ConnectionStatus {
  connected: boolean;
  account_id?: string;
}

export default function InstallationPage() {
  const { profile, user } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [extensionExpanded, setExtensionExpanded] = useState(false);

  const searchParams = useSearchParams();
  const toastShownRef = useRef(false);

  const userId = user?.id ?? profile?.id ?? "";

  useEffect(() => {
    if (toastShownRef.current) return;
    const waParam = searchParams?.get("whatsapp_connected");
    if (waParam === "1") {
      toast.success("WhatsApp connecté avec succès !");
      toastShownRef.current = true;
    } else if (waParam === "0") {
      toast.error("La connexion WhatsApp a échoué. Réessayez.");
      toastShownRef.current = true;
    }
  }, [searchParams]);

  const fetchConnectionStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/unipile/me");
      const json = await res.json();
      const data = json?.data ?? json;
      setLinkedinConnected(data?.connected ?? false);
      setWhatsappConnected(data?.whatsapp_connected ?? false);
    } catch {
      setLinkedinConnected(false);
      setWhatsappConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  const handleConnectLinkedin = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/unipile/connect", { method: "POST" });
      const json = await res.json();
      const data = json?.data ?? json;
      const url = (data as { url?: string })?.url;
      if (url) { window.location.href = url; return; }
      toast.error((json?.error?.message as string) ?? "Erreur lors de la connexion");
    } catch {
      toast.error("Impossible de lancer la connexion LinkedIn");
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    setConnectingWhatsApp(true);
    try {
      const res = await fetch("/api/unipile/connect-whatsapp", { method: "POST" });
      const json = await res.json();
      const data = json?.data ?? json;
      const url = (data as { url?: string })?.url;
      if (url) { window.location.href = url; return; }
      toast.error((json?.error?.message as string) ?? "Erreur lors de la connexion WhatsApp");
    } catch {
      toast.error("Impossible de lancer la connexion WhatsApp");
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleCopyUuid = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      toast.success("UUID copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const completedSteps = [linkedinConnected, whatsappConnected].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Installation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurez vos intégrations en 3 étapes pour profiter pleinement d&apos;Andoxa.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((completedSteps / 3) * 100)}%` }}
            />
          </div>
          <span>{completedSteps}/3 terminées</span>
        </div>
      </div>

      {/* Step 1 — LinkedIn */}
      <div className="rounded-lg border p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            linkedinConnected ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-muted text-muted-foreground"
          }`}>
            {linkedinConnected ? <CheckCircle className="h-4 w-4" /> : "1"}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              <h2 className="text-base font-semibold">Connecter LinkedIn</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Activez la messagerie centralisée et les campagnes de prospection LinkedIn.
            </p>
          </div>
        </div>

        {linkedinConnected === null ? (
          <div className="flex items-center gap-2 pl-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Vérification...
          </div>
        ) : linkedinConnected ? (
          <div className="flex items-center gap-2 pl-12 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" /> LinkedIn connecté
          </div>
        ) : (
          <div className="pl-12">
            <Button onClick={handleConnectLinkedin} disabled={connecting} size="sm" className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {connecting ? "Connexion..." : "Connecter LinkedIn"}
            </Button>
          </div>
        )}
      </div>

      {/* Step 2 — WhatsApp */}
      <div className="rounded-lg border p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            whatsappConnected ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-muted text-muted-foreground"
          }`}>
            {whatsappConnected ? <CheckCircle className="h-4 w-4" /> : "2"}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <h2 className="text-base font-semibold">Connecter WhatsApp</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Envoyez des rappels de RDV et centralisez vos conversations WhatsApp.
            </p>
          </div>
        </div>

        {whatsappConnected ? (
          <div className="flex items-center gap-2 pl-12 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" /> WhatsApp connecté
          </div>
        ) : (
          <div className="pl-12">
            <Button onClick={handleConnectWhatsApp} disabled={connectingWhatsApp} variant="outline" size="sm" className="gap-2">
              {connectingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {connectingWhatsApp ? "Connexion..." : "Connecter WhatsApp"}
            </Button>
          </div>
        )}
      </div>

      {/* Step 3 — Extension */}
      <div className="rounded-lg border p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            3
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              <h2 className="text-base font-semibold">Installer l&apos;extension Andoxa Scout</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Capturez des prospects depuis LinkedIn directement dans votre CRM.
            </p>
          </div>
        </div>

        <div className="pl-12 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">{profile?.full_name ?? "Compte Andoxa"}</p>
              <p className="font-mono text-xs text-muted-foreground break-all">{userId || "—"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyUuid} disabled={!userId}>
              <Copy className="h-3.5 w-3.5" />
              <span className="ml-1.5">{copied ? "Copié" : "Copier UUID"}</span>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setExtensionExpanded(!extensionExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {extensionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Instructions d&apos;installation
          </button>

          {extensionExpanded && (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap gap-2">
                <div className="flex flex-col gap-2">
                  <Link
                    href="https://chromewebstore.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Chrome / Edge
                  </Link>
                  <Link
                    href="https://www.linkedin.com/feed/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-secondary/40 bg-secondary/10 px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ouvrir LinkedIn (feed)
                  </Link>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href="https://addons.mozilla.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Firefox
                  </Link>
                  <Link
                    href="https://www.linkedin.com/feed/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-secondary/40 bg-secondary/10 px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ouvrir LinkedIn (feed)
                  </Link>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
                <li>Installez l&apos;extension depuis le store de votre navigateur (ou chargez-la en mode développeur).</li>
                <li>Ouvrez un profil LinkedIn, puis cliquez sur l&apos;icône Andoxa pour ouvrir le panneau.</li>
                <li>Collez votre UUID ci-dessus, choisissez une liste, et envoyez vos prospects sur Andoxa.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
