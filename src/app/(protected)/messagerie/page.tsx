"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { MessagingInbox } from "@/components/linkedin/messaging-inbox";
import { MessageTemplatesPanel } from "@/components/messagerie/message-templates-panel";
import { useMessagingRealtime } from "@/hooks/use-messaging-realtime";
import { Loader2 } from "lucide-react";

function tabClass(active: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors border ${
    active
      ? "bg-primary/10 text-primary border-primary/20"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
  }`;
}

function MessagerieContent() {
  const searchParams = useSearchParams();
  const focusChatId = searchParams?.get("chat") ?? null;
  const { markAllSeen } = useMessagingRealtime();

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [horsCrm, setHorsCrm] = useState(false);

  useEffect(() => {
    void markAllSeen();
  }, [markAllSeen]);

  useEffect(() => {
    if (searchParams?.get("view") === "templates") {
      setTemplatesOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="flex h-full flex-col gap-4 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setHorsCrm((v) => !v);
              if (templatesOpen) setTemplatesOpen(false);
            }}
            className={tabClass(horsCrm && !templatesOpen)}
          >
            Hors CRM
          </button>
        </div>
        <button
          type="button"
          onClick={() => setTemplatesOpen((v) => !v)}
          className={tabClass(templatesOpen)}
        >
          Templates
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
        {templatesOpen ? (
          <MessageTemplatesPanel embedded templateChannelFilter="all" />
        ) : (
          <MessagingInbox focusChatId={focusChatId} onlyHorsCrm={horsCrm} />
        )}
      </div>
    </div>
  );
}

export default function MessageriePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-6 lg:p-8">
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
