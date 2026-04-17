import { WorkflowDetailClient } from "@/components/workflows/workflow-detail-client";
import { ConnectionGate } from "@/components/unipile/connection-gate";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ConnectionGate acceptEitherLinkedInOrWhatsApp pageName="Parcours">
      <WorkflowDetailClient workflowId={id} />
    </ConnectionGate>
  );
}
