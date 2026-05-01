import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";
import { getLinkedInAccountIdForUserId } from "@/lib/unipile/account";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import {
  safeParseWorkflowDefinition,
  type WorkflowStepType,
} from "@/lib/workflows/schema";

const STEP_TYPE_LABELS: Record<WorkflowStepType, string> = {
  wait: "Attente",
  linkedin_invite: "Invitation LinkedIn",
  linkedin_message: "Message LinkedIn",
  whatsapp_message: "Message WhatsApp",
  condition: "Condition",
  crm: "CRM",
  notification: "Notification",
  task: "Tâche",
  end: "Fin",
};

function stepLabelFromDefinition(
  snapshot: unknown,
  stepIndex: number
): string | null {
  if (snapshot == null) return null;
  const parsed = safeParseWorkflowDefinition(snapshot);
  if (!parsed.success) return null;
  const step = parsed.data.steps[stepIndex];
  if (!step) return null;
  return STEP_TYPE_LABELS[step.type] ?? step.type;
}

/**
 * GET /api/prospects/[id]/messagerie-context
 * Workflow + LinkedIn relation context for the messaging CRM sidebar.
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const prospectId = segments[segments.length - 2];
  if (!prospectId || prospectId === "messagerie-context") {
    throw Errors.notFound("Prospect");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data: prospect, error: pErr } = await ctx.supabase
    .from("prospects")
    .select("id, linkedin, organization_id")
    .eq("id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (pErr || !prospect) {
    throw Errors.notFound("Prospect");
  }

  let linkedinFirstDegree: boolean | null = null;
  const linkedinTrim = prospect.linkedin?.trim() ?? "";
  if (linkedinTrim) {
    const slug = extractLinkedInSlug(linkedinTrim);
    const accountId = await getLinkedInAccountIdForUserId(
      ctx.supabase,
      ctx.userId
    );
    if (slug && accountId) {
      try {
        const prof = await unipileFetch<{ provider_id?: string }>(
          `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
        );
        const attendeeId = prof?.provider_id?.trim();
        if (attendeeId) {
          const { data: rel } = await ctx.supabase
            .from("linkedin_relations")
            .select("id")
            .eq("user_id", ctx.userId)
            .eq("attendee_id", attendeeId)
            .maybeSingle();
          linkedinFirstDegree = !!rel;
        }
      } catch (err) {
        linkedinFirstDegree =
          err instanceof UnipileApiError ? false : null;
      }
    }
  }

  const { data: run } = await ctx.supabase
    .from("workflow_runs")
    .select(
      "id, workflow_id, status, current_step_index, definition_snapshot, prospect_id"
    )
    .eq("prospect_id", prospectId)
    .eq("organization_id", ctx.workspaceId)
    .in("status", ["pending", "running", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let activeWorkflow: {
    runId: string;
    workflowId: string;
    workflowName: string;
    runStatus: string;
    currentStepLabel: string | null;
    canProcessNextStep: boolean;
  } | null = null;

  if (run) {
    const { data: wf } = await ctx.supabase
      .from("workflows")
      .select("name")
      .eq("id", run.workflow_id)
      .eq("organization_id", ctx.workspaceId)
      .maybeSingle();

    const { data: pendingExec } = await ctx.supabase
      .from("workflow_step_executions")
      .select("step_index")
      .eq("run_id", run.id)
      .eq("status", "pending")
      .order("step_index", { ascending: true })
      .limit(1)
      .maybeSingle();

    const idx =
      typeof pendingExec?.step_index === "number"
        ? pendingExec.step_index
        : run.current_step_index;

    const currentStepLabel = stepLabelFromDefinition(
      run.definition_snapshot,
      idx
    );

    activeWorkflow = {
      runId: run.id,
      workflowId: run.workflow_id,
      workflowName: wf?.name?.trim() || "Parcours",
      runStatus: run.status,
      currentStepLabel,
      canProcessNextStep:
        run.status === "running" && !!pendingExec,
    };
  }

  return {
    linkedinFirstDegree,
    activeWorkflow,
  };
});
