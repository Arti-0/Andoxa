"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { MessagingInbox, type InboxChannelFilter } from "@/components/linkedin/messaging-inbox";
import {
  MessageTemplatesPanel,
  type TemplateChannelFilter,
} from "@/components/messagerie/message-templates-panel";
import { Loader2 } from "lucide-react";

const CHANNEL_TABS: { id: InboxChannelFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "LINKEDIN", label: "LinkedIn" },
  { id: "WHATSAPP", label: "WhatsApp" },
];

function inboxToTemplateChannel(f: InboxChannelFilter): TemplateChannelFilter {
  if (f === "LINKEDIN") return "linkedin";
  if (f === "WHATSAPP") return "whatsapp";
  return "all";
}

function tabClass(active: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors border ${
    active
      ? "bg-primary/10 text-primary border-primary/20 shadow-none"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
  }`;
}

function MessagerieContent() {
  const searchParams = useSearchParams();
  const focusChatId = searchParams?.get("chat") ?? null;

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState<InboxChannelFilter>("all");
  const [horsCrm, setHorsCrm] = useState(false);

  useEffect(() => {
    if (searchParams?.get("view") === "templates") {
      setTemplatesOpen(true);
    }
  }, [searchParams]);

  const toggleTemplates = () => {
    setTemplatesOpen((v) => {
      const next = !v;
      if (next) setHorsCrm(false);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-1">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Canal">
          {CHANNEL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannelFilter(tab.id)}
              className={tabClass(channelFilter === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Vue messagerie">
          <button
            type="button"
            onClick={() => {
              if (templatesOpen) {
                setTemplatesOpen(false);
                setHorsCrm(true);
                return;
              }
              setHorsCrm((v) => !v);
            }}
            className={tabClass(horsCrm && !templatesOpen)}
          >
            Hors CRM
          </button>
          <button type="button" onClick={toggleTemplates} className={tabClass(templatesOpen)}>
            Templates
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
        {templatesOpen ? (
          <MessageTemplatesPanel embedded templateChannelFilter={inboxToTemplateChannel(channelFilter)} />
        ) : (
          <MessagingInbox
            focusChatId={focusChatId}
            channelFilter={channelFilter}
            onlyHorsCrm={horsCrm}
          />
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
          <p className="mt-1 text-muted-foreground">Chargement...</p>
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
