import { WorkflowNewPageClient } from "@/components/workflows/workflow-new-wizard";
import { ConnectionGate } from "@/components/unipile/connection-gate";

export default function WorkflowNewPage() {
  return (
    <ConnectionGate acceptEitherLinkedInOrWhatsApp pageName="Nouveau parcours">
      <WorkflowNewPageClient />
    </ConnectionGate>
  );
}
