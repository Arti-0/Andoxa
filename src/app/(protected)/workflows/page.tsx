"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ListView, type UserTemplate } from "./_components/list-view";
import { Whatsapp2Styles } from "./_components/styles";
import {
  backendRowToCard,
  type BackendWorkflowRow,
  type DesignWorkflowCard,
} from "./_components/workflow-mapping";
import { WorkflowListEnrollModal } from "@/components/workflows/workflow-list-enroll-modal";

export default function Whatsapp2Page() {
  const [workflows, setWorkflows] = useState<DesignWorkflowCard[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollWorkflowId, setEnrollWorkflowId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wfRes, tplRes] = await Promise.all([
        fetch("/api/workflows?page=1&pageSize=50", { credentials: "include" }),
        fetch("/api/workflows/templates", { credentials: "include" }),
      ]);
      const wfJson = await wfRes.json();
      if (!wfRes.ok || !wfJson.success) {
        throw new Error(wfJson?.error?.message ?? "Chargement impossible");
      }
      const items = (wfJson.data?.items ?? []) as BackendWorkflowRow[];
      setWorkflows(items.map(backendRowToCard));

      if (tplRes.ok) {
        const tplJson = await tplRes.json();
        if (tplJson?.success) {
          const rows =
            (tplJson.data?.items ?? []) as Array<{
              id: string;
              name: string;
              description: string | null;
            }>;
          setUserTemplates(
            rows.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
            }))
          );
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chargement impossible");
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <div
      className="ws2-root"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
        fontFamily:
          "'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <Whatsapp2Styles />
      <ListView
        workflows={workflows}
        loading={loading}
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
          void loadAll();
        }}
      />
    </div>
  );
}
