"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessagingInbox } from "@/components/linkedin/messaging-inbox";
import { MessageSquare, Loader2 } from "lucide-react";

function MessagerieContent() {
  const searchParams = useSearchParams();
  const focusChatId = searchParams?.get("chat") ?? null;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messagerie</h1>
        <p className="mt-1 text-muted-foreground">
          Conversations LinkedIn centralisées via Unipile.
        </p>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Conversations</CardTitle>
          </div>
          <CardDescription>
            Sélectionnez une conversation ou accédez directement via un lien
            partagé.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <MessagingInbox focusChatId={focusChatId} />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Page Messagerie – Conversations centralisées avec focus via ?chat=
 */
export default function MessageriePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-6 lg:p-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Messagerie</h1>
            <p className="mt-1 text-muted-foreground">
              Chargement...
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <MessagerieContent />
    </Suspense>
  );
}
