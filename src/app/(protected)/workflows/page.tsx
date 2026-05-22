"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { ListView, type UserTemplate } from "./_components/list-view";
import { Whatsapp2Styles } from "./_components/styles";
import {
  backendRowToCard,
} from "./_components/workflow-mapping";
import { WorkflowListEnrollModal } from "@/components/workflows/workflow-list-enroll-modal";
import {
  fetchWorkflowList,
  fetchWorkflowTemplates,
  workflowQueryKeys,
} from "./_lib/queries";

export default function Whatsapp2Page() {
  const [enrollWorkflowId, setEnrollWorkflowId] = useState<string | null>(null);

  const {
    data: workflowRows,
    isLoading: workflowsLoading,
    isFetching: workflowsFetching,
  } = useQuery({
    queryKey: workflowQueryKeys.list(),
    queryFn: () => fetchWorkflowList(),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: templateRows = [] } = useQuery({
    queryKey: workflowQueryKeys.templates(),
    queryFn: fetchWorkflowTemplates,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const workflows = useMemo(
    () => (workflowRows ?? []).map(backendRowToCard),
    [workflowRows],
  );

  const userTemplates = useMemo<UserTemplate[]>(
    () =>
      templateRows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
      })),
    [templateRows],
  );

  const loading = workflowsLoading && workflows.length === 0;

  return (
    <div className="ws2-root flex h-full min-h-0 flex-col bg-background font-sans text-foreground">
      <Whatsapp2Styles />
      <ListView
        workflows={workflows}
        loading={loading}
        refreshing={workflowsFetching && workflows.length > 0}
        userTemplates={userTemplates}
        onLaunch={(id) => setEnrollWorkflowId(id)}
      />
      <WorkflowListEnrollModal
        open={enrollWorkflowId != null}
        onOpenChange={(o) => {
          if (!o) setEnrollWorkflowId(null);
        }}
        workflowId={enrollWorkflowId ?? ""}
        onSuccess={() => {
          setEnrollWorkflowId(null);
          toast.success("Prospects inscrits au parcours.");
        }}
      />
    </div>
  );
}
