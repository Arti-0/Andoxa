"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  ProspectContent,
  ProspectBreadcrumb,
} from "@/components/prospect/prospect-content";
import type { ProspectOverviewPayload } from "@/app/api/prospects/[id]/overview/route";

export default function ProspectProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  // Aggregated fetch — replaces 4 separate /api/prospects/[id]/* calls
  // (main row, linked-chat, events, engagement) with one round trip + one
  // server-side auth pass.
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ["prospect-overview", id],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${id}/overview`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as ProspectOverviewPayload;
    },
    enabled: !!id,
  });

  if (!id) {
    router.replace("/crm");
    return null;
  }

  if (isLoading || (!overview && !error)) {
    return (
      <div className="flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-muted-foreground">Prospect introuvable</p>
        <Link href="/crm" className="text-primary hover:underline">
          Retour au CRM
        </Link>
      </div>
    );
  }

  const linkedChatId = overview.linkedChat.unipile_chat_id ?? undefined;

  return (
    <div className="min-w-0 max-w-full px-3 pb-16 pt-3 sm:px-7">
      <ProspectBreadcrumb prospect={overview.prospect} />
      <ProspectContent
        prospect={overview.prospect}
        linkedChatId={linkedChatId}
        timelineEvents={overview.events.events}
      />
    </div>
  );
}
