"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListView } from "./_components/list-view";
import { Whatsapp2Styles } from "./_components/styles";
import {
  backendRowToCard,
  type BackendWorkflowRow,
  type DesignWorkflowCard,
} from "./_components/workflow-mapping";

export default function Whatsapp2Page() {
  const [workflows, setWorkflows] = useState<DesignWorkflowCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/workflows?page=1&pageSize=50", {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message ?? "Chargement impossible");
        }
        const items = (json.data?.items ?? []) as BackendWorkflowRow[];
        if (!cancelled) {
          setWorkflows(items.map(backendRowToCard));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Chargement impossible"
          );
          setWorkflows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <ListView workflows={workflows} loading={loading} />
    </div>
  );
}
