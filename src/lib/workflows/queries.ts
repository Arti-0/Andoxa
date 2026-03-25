import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { parseWorkflowDefinition, type WorkflowDefinition } from "./schema";

export async function getWorkflowPublishedDefinition(
  supabase: SupabaseClient<Database>,
  workflowId: string
): Promise<WorkflowDefinition | null> {
  const { data, error } = await supabase
    .from("workflows")
    .select("published_definition")
    .eq("id", workflowId)
    .maybeSingle();

  if (error || data?.published_definition == null) return null;
  try {
    return parseWorkflowDefinition(data.published_definition);
  } catch {
    return null;
  }
}
