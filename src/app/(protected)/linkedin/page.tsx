"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Send,
  ExternalLink,
  Copy,
  User,
  Puzzle,
  Link2,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { RecentConversationsList } from "@/components/linkedin/recent-conversations-list";
import { useWorkspace } from "@/lib/workspace";
import { toast } from "sonner";

/**
 * Page LinkedIn – Centre de contrôle Unipile et extension Andoxa Scout
 */
interface UnipileMeResponse {
  connected: boolean;
  account_id?: string;
}

export default function LinkedInPage() {
  const { profile, user } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [unipileConnected, setUnipileConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  const userId = user?.id ?? profile?.id ?? "";
  const fullName = profile?.full_name ?? "Compte Andoxa";

  const fetchUnipileMe = useCallback(async () => {
    try {
      const res = await fetch("/api/unipile/me");
      const data = (await res.json())?.data ?? (await res.json());
      const json = data as UnipileMeResponse;
      setUnipileConnected(json?.connected ?? false);
    } catch {
      setUnipileConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchUnipileMe();
  }, [fetchUnipileMe]);

  const handleConnectUnipile = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/unipile/connect", { method: "POST" });
      const json = await res.json();
      const data = json?.data ?? json;
      const url = (data as { url?: string })?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      const msg = (json?.error?.message as string) ?? "Erreur lors de la connexion";
      toast.error(msg);
    } catch {
      toast.error("Impossible de lancer la connexion Unipile");
    } finally {
      setConnecting(false);
    }
  };

  const handleCopyUuid = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      toast.success("UUID copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">LinkedIn</h1>
        <p className="mt-1 text-muted-foreground">
          Centre de contrôle – Extension, messagerie et prospection.
        </p>
      </div>

      {/* Section Compte Andoxa */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Compte Andoxa</CardTitle>
          </div>
          <CardDescription>
            Informations pour configurer l&apos;extension et vos campagnes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">{fullName}</p>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {userId || "—"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUuid}
              disabled={!userId}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copié" : "Copier UUID"}
            </Button>
          </div>
          <Link
            href="/settings"
            className="text-sm text-primary underline underline-offset-4"
          >
            Modifier mon profil →
          </Link>
        </CardContent>
      </Card>

      {/* Section Extension */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            <CardTitle>Extension Andoxa Scout</CardTitle>
          </div>
          <CardDescription>
            Instructions pour installer l&apos;extension.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="install">
              <AccordionTrigger>Installation</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="https://chromewebstore.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Chrome
                  </Link>
                  <Link
                    href="https://microsoftedge.microsoft.com/addons"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Edge
                  </Link>
                  <Link
                    href="https://addons.mozilla.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Firefox
                  </Link>
                  <Link
                    href="https://addons.opera.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Opera
                  </Link>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong>Chrome / Edge :</strong> chargez le dossier <code className="rounded bg-muted px-1">andoxa-extension/</code> en extension non empaquetée (Extensions → Mode développeur → Charger l&apos;extension non empaquetée).
                  </p>
                  <p>
                    <strong>Firefox :</strong> chargez le dossier <code className="rounded bg-muted px-1">andoxa-extension-firefox/</code> en extension temporaire (Extensions → Développeur → Charger un module complémentaire temporaire).
                  </p>
                  <p>
                    <strong>Opera :</strong> chargez le dossier <code className="rounded bg-muted px-1">andoxa-extension-firefox/</code> en extension non empaquetée (Extensions → Développeur → Charger une extension non empaquetée).
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="usage">
              <AccordionTrigger>Utilisation</AccordionTrigger>
              <AccordionContent className="pt-2">
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
                  <li>Ouvrez un profil LinkedIn (linkedin.com/in/...).</li>
                  <li>Cliquez sur l&apos;icône Andoxa pour ouvrir le panneau.</li>
                  <li>Vérifiez le profil détecté, choisissez une liste.</li>
                  <li>Ajoutez les prospects puis ENVOYER SUR ANDOXA.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Section Compte Unipile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            <CardTitle>Compte Unipile (messagerie)</CardTitle>
          </div>
          <CardDescription>
            Connectez votre compte LinkedIn via Unipile pour activer la messagerie centralisée et les campagnes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unipileConnected === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification...
            </div>
          ) : unipileConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
              <CheckCircle className="h-4 w-4" />
              Compte LinkedIn connecté pour la messagerie
            </div>
          ) : (
            <Button
              onClick={handleConnectUnipile}
              disabled={connecting}
              className="gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Connecter mon LinkedIn à Unipile
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section Messagerie */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                <CardTitle>Messagerie centralisée</CardTitle>
              </div>
              <CardDescription>
                Conversations récentes. Cliquez pour ouvrir dans la messagerie.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/messagerie">
                Voir tout
                <ExternalLink className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentConversationsList />
        </CardContent>
      </Card>
    </div>
  );
}
