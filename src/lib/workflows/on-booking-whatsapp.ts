import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import type { WorkflowDefinition } from "./schema";
import { listActiveWorkflowsForTrigger } from "./start-run";

export function workflowDefinitionHasWhatsAppStep(
  definition: WorkflowDefinition
): boolean {
  return definition.steps.some((s) => s.type === "whatsapp_message");
}

/** True when the org has at least one active on_booking workflow with a WhatsApp step. */
export async function orgHasActiveOnBookingWhatsAppWorkflow(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<boolean> {
  const workflows = await listActiveWorkflowsForTrigger(supabase, {
    organizationId,
    triggerKind: "on_booking",
  });
  return workflows.some((wf) => workflowDefinitionHasWhatsAppStep(wf.definition));
}
