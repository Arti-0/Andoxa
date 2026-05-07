"use client";

/**
 * CRM — top-level content. Renders the in-page tab bar
 * (Prospects / Pipeline / Listes / Corbeille at the right) and
 * routes between the four tabs. Visual reference: design/CRM/CRM.html.
 *
 * Sidebar + global TopBar are owned by the protected layout — this
 * component only renders the in-page navigation and panels.
 */

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users, Columns3, List as ListIcon, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { ListesTab, ListesEmpty } from "./crm-tab-listes";
import { ProspectsTab, ProspectsEmpty } from "./crm-tab-prospects";
import { PipelineTab } from "./crm-tab-pipeline";
import { CorbeilleTab } from "./crm-tab-corbeille";

type Tab = "prospects" | "pipeline" | "listes" | "corbeille";

export function CrmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, user } = useWorkspace();
  const currentUserId = user?.id ?? null;

  const initialBddId = searchParams.get("bdd_id");
  const initialStatus = searchParams.get("status");
  const initialTab: Tab = initialBddId
    ? "prospects"
    : initialStatus
      ? "pipeline"
      : "listes";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [bddFilter, setBddFilterState] = useState<string | null>(initialBddId);

  /** Keep the URL `?bdd_id=` query param in sync with state so refresh /
   *  share works and "Effacer le filtre" cleans the URL. */
  const setBddFilter = useCallback(
    (next: string | null) => {
      setBddFilterState(next);
      router.replace(next ? `/crm?bdd_id=${next}` : "/crm", { scroll: false });
    },
    [router],
  );

  /* members used for author display in lists */
  const { data: membersData } = useQuery({
    queryKey: ["organization-members", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/organization/members", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as {
        items: { id: string; name: string; avatar_url: string | null }[];
      };
    },
    enabled: !!workspaceId,
  });
  const members = membersData?.items ?? [];
  const memberNames = new Map(members.map((m) => [m.id, m.name]));
  const memberAvatars = new Map(
    members.map((m) => [m.id, m.avatar_url ?? null]),
  );

  /* count signal — simple way to decide whether to render empty states */
  const { data: bddCountData } = useQuery({
    queryKey: ["bdd-count", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/bdd?page=1&pageSize=1", {
        credentials: "include",
      });
      if (!res.ok) return { total: 0 };
      const json = await res.json();
      return (json.data ?? json) as { total: number };
    },
    enabled: !!workspaceId,
  });
  const { data: prospectsCountData } = useQuery({
    queryKey: ["prospects-count", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/prospects?page=1&pageSize=1", {
        credentials: "include",
      });
      if (!res.ok) return { total: 0 };
      const json = await res.json();
      return (json.data ?? json) as { total: number };
    },
    enabled: !!workspaceId,
  });
  const listesEmpty = bddCountData?.total === 0;
  const prospectsEmpty = prospectsCountData?.total === 0;

  const handleSelectList = (id: string) => {
    setBddFilter(id);
    setTab("prospects");
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "prospects", label: "Prospects", icon: Users },
    { id: "pipeline", label: "Pipeline", icon: Columns3 },
    { id: "listes", label: "Listes", icon: ListIcon },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* In-page tab bar */}
      <div className="sticky top-0 z-header flex items-center gap-1 border-b border-border bg-background px-3 sm:px-7">
        {tabs.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "prospects") setBddFilter(null);
              }}
              className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-3.5 text-[13.5px] font-medium ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t.label}
            </button>
          );
        })}
        <button
          onClick={() => setTab("corbeille")}
          className={`-mb-px ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3.5 text-[12.5px] font-medium ${
            tab === "corbeille"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trash2 className="h-3 w-3 shrink-0" />
          Corbeille
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 pb-16 pt-5 sm:px-7">
        {tab === "listes" &&
          (listesEmpty ? (
            <ListesEmpty />
          ) : (
            <ListesTab
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              memberNames={memberNames}
              memberAvatars={memberAvatars}
              onSelectList={handleSelectList}
            />
          ))}

        {tab === "prospects" &&
          (prospectsEmpty && !bddFilter ? (
            <ProspectsEmpty />
          ) : (
            <ProspectsTab
              workspaceId={workspaceId}
              bddFilter={bddFilter}
              setBddFilter={setBddFilter}
            />
          ))}
        {tab === "pipeline" && (
          <PipelineTab
            workspaceId={workspaceId}
            initialStatusFilter={initialStatus}
          />
        )}
        {tab === "corbeille" && (
          <CorbeilleTab
            workspaceId={workspaceId}
            onBack={() => setTab("prospects")}
          />
        )}
      </div>
    </div>
  );
}
