import { WorkflowDetailClient } from "@/components/workflows/workflow-detail-client";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkflowDetailClient workflowId={id} />;
}
