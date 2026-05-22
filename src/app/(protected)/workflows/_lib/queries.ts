import type { BackendWorkflowRow } from "../_components/workflow-mapping";

export const workflowQueryKeys = {
  list: (page = 1, pageSize = 50) => ["workflows", page, pageSize] as const,
  detail: (id: string) => ["workflow", id] as const,
  runs: (id: string) => ["workflow-runs", id] as const,
  templates: () => ["workflow-templates"] as const,
};

export interface WorkflowRunItem {
  id: string;
  status: string;
  current_step_index: number | null;
  last_error: string | null;
  created_at: string;
  prospect_id: string;
  prospect: { full_name: string | null; company: string | null } | null;
  enrollment_list_labels?: string[];
  steps_total?: number;
  steps_completed?: number;
}

export async function fetchWorkflowDetail(
  workflowId: string,
): Promise<BackendWorkflowRow> {
  const res = await fetch(`/api/workflows/${workflowId}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? "Chargement impossible");
  }
  return json.data.workflow as BackendWorkflowRow;
}

export async function fetchWorkflowList(page = 1, pageSize = 50) {
  const res = await fetch(
    `/api/workflows?page=${page}&pageSize=${pageSize}`,
    { credentials: "include" },
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? "Chargement impossible");
  }
  return (json.data?.items ?? []) as BackendWorkflowRow[];
}

export async function fetchWorkflowRuns(
  workflowId: string,
): Promise<WorkflowRunItem[]> {
  const res = await fetch(
    `/api/workflows/${workflowId}/runs?pageSize=100`,
    { credentials: "include" },
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? "Chargement impossible");
  }
  return (json.data?.items ?? []) as WorkflowRunItem[];
}

export async function fetchWorkflowTemplates() {
  const res = await fetch("/api/workflows/templates", { credentials: "include" });
  if (!res.ok) return [];
  const json = await res.json();
  if (!json?.success) return [];
  return (json.data?.items ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}
