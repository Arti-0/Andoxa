"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProspectProfileContent } from "@/components/prospect/prospect-profile-content";
import type { Prospect } from "@/lib/types/prospects";

export default function ProspectProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const { data: prospect, isLoading, error } = useQuery({
    queryKey: ["prospect", id],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as Prospect;
    },
    enabled: !!id,
  });

  const { data: linkedChat } = useQuery({
    queryKey: ["prospect-linked-chat", id],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${id}/linked-chat`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      const data = json?.data ?? json;
      return (data as { unipile_chat_id?: string })?.unipile_chat_id ?? null;
    },
    enabled: !!id,
  });

  if (!id) {
    router.replace("/crm");
    return null;
  }

  if (isLoading || (!prospect && !error)) {
    return (
      <div className="flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-muted-foreground">Prospect introuvable</p>
        <Link href="/crm" className="text-primary hover:underline">
          Retour au CRM
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/crm"
          className="rounded-lg border p-2 hover:bg-accent"
          aria-label="Retour au CRM"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">Profil prospect</h1>
      </div>

      <ProspectProfileContent
        prospect={prospect}
        linkedChatId={linkedChat ?? undefined}
      />
    </div>
  );
}
