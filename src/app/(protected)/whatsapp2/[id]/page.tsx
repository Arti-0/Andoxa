import { CanvasClient } from "./_client";

export default async function Whatsapp2WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CanvasClient workflowId={id} />;
}
