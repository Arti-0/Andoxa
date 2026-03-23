"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MessagingInbox } from "@/components/linkedin/messaging-inbox";
import { Loader2 } from "lucide-react";

type ChannelView = "all" | "LINKEDIN" | "WHATSAPP" | "hors_crm";

function MessagerieContent() {
  const searchParams = useSearchParams();
  const focusChatId = searchParams?.get("chat") ?? null;
  const [channelView, setChannelView] = useState<ChannelView>("all");

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-8 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messagerie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversations LinkedIn et WhatsApp connectées via Unipile, liées à vos prospects quand c&apos;est possible.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-1" role="group" aria-label="Filtre messagerie">
          {([
            { id: "all" as const, label: "Tous" },
            { id: "LINKEDIN" as const, label: "LinkedIn" },
            { id: "WHATSAPP" as const, label: "WhatsApp" },
            { id: "hors_crm" as const, label: "Hors CRM" },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannelView(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                channelView === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card shadow-xs overflow-hidden">
        <MessagingInbox focusChatId={focusChatId} channelView={channelView} />
      </div>
    </div>
  );
}

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
