import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/environment";
import {
  getLinkedInAccountIdForUserId,
  getWhatsAppAccountIdForUserId,
} from "@/lib/unipile/account";
import { applyMessageVariables, extractLinkedInSlug } from "@/lib/unipile/campaign";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { prospectHasLinkedInInboundReply } from "@/lib/unipile/linkedin-inbound-reply";
import type { UnipileChat } from "@/lib/unipile/types";
import type { Database } from "@/lib/types/supabase";
import {
  logWorkflowRunCompleted,
  logWorkflowStepCompleted,
  logWorkflowStepFailed,
} from "@/lib/prospect-activity";
import { enqueueNextStep } from "./enqueue";
import {
  parseWorkflowDefinition,
  type WorkflowDefinition,
  type WorkflowStepType,
} from "./schema";

const RETRY_DELAY_MS = 60_000;
const STALE_PROCESSING_MS = 15 * 60 * 1000;

type ExecutionRow = Database["public"]["Tables"]["workflow_step_executions"]["Row"];
type RunRow = Database["public"]["Tables"]["workflow_runs"]["Row"];

type ProspectRow = {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  organization_id: string | null;
  metadata: unknown;
};

export async function resetStaleProcessingExecutions(
  supabase: SupabaseClient<Database>
): Promise<number> {
  const threshold = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { data, error } = await supabase
    .from("workflow_step_executions")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("updated_at", threshold)
    .select("id");

  if (error) {
    console.error("[workflow-steps] reset stale", error);
    return 0;
  }
  return data?.length ?? 0;
}

function definitionFromRunSnapshot(run: RunRow): WorkflowDefinition | null {
  const snap = run.definition_snapshot;
  if (snap == null) return null;
  try {
    return parseWorkflowDefinition(snap);
  } catch {
    return null;
  }
}

async function getBookingLink(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_slug")
    .eq("id", userId)
    .single();
  if (!profile?.booking_slug) return null;
  const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
  return `${appUrl}/booking/${profile.booking_slug}`;
}

type HandlerContext = {
  supabase: SupabaseClient<Database>;
  run: RunRow;
  prospect: ProspectRow;
  config: Record<string, unknown>;
  startedByUserId: string;
};

async function handleWait(ctx: HandlerContext): Promise<void> {
  const hours = Number(ctx.config.durationHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Durée d’attente invalide");
  }
}

async function handleLinkedInInvite(ctx: HandlerContext): Promise<void> {
  if (
    await prospectHasLinkedInInboundReply(
      ctx.supabase,
      ctx.prospect.id,
      ctx.run.organization_id
    )
  ) {
    return;
  }
  const accountId = await getLinkedInAccountIdForUserId(
    ctx.supabase,
    ctx.startedByUserId
  );
  if (!accountId) {
    throw new Error("Aucun compte LinkedIn Unipile pour l’utilisateur ayant lancé le workflow");
  }
  const slug = extractLinkedInSlug(ctx.prospect.linkedin);
  if (!slug) {
    throw new Error("URL LinkedIn invalide ou manquante");
  }
  const bookingLink = await getBookingLink(ctx.supabase, ctx.startedByUserId);
  const raw =
    typeof ctx.config.messageTemplate === "string" ? ctx.config.messageTemplate : "";
  const trimmed = raw.trim();
  const note =
    trimmed.length > 0
      ? applyMessageVariables(trimmed, ctx.prospect, { bookingLink })
      : "";

  const profileRes = await unipileFetch<{ provider_id?: string }>(
    `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
  );
  const providerId = profileRes?.provider_id;
  if (!providerId) {
    throw new Error("Impossible de résoudre le profil LinkedIn");
  }

  await unipileFetch("/users/invite", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      provider_id: providerId,
      message: note,
    }),
  });
}

async function handleLinkedInMessage(ctx: HandlerContext): Promise<void> {
  if (
    await prospectHasLinkedInInboundReply(
      ctx.supabase,
      ctx.prospect.id,
      ctx.run.organization_id
    )
  ) {
    return;
  }
  const accountId = await getLinkedInAccountIdForUserId(
    ctx.supabase,
    ctx.startedByUserId
  );
  if (!accountId) {
    throw new Error("Aucun compte LinkedIn Unipile pour l’utilisateur ayant lancé le workflow");
  }
  const slug = extractLinkedInSlug(ctx.prospect.linkedin);
  if (!slug) {
    throw new Error("URL LinkedIn invalide ou manquante");
  }
  const bookingLink = await getBookingLink(ctx.supabase, ctx.startedByUserId);
  const template =
    (typeof ctx.config.messageTemplate === "string"
      ? ctx.config.messageTemplate
      : ""
    ).trim() ||
    "Bonjour {{firstName}}, j’ai vu votre profil chez {{company}} et souhaiterais échanger avec vous.";
  const text = applyMessageVariables(template, ctx.prospect, { bookingLink });

  const profileRes = await unipileFetch<{ provider_id?: string }>(
    `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
  );
  const providerId = profileRes?.provider_id;
  if (!providerId) {
    throw new Error("Impossible de résoudre le profil LinkedIn");
  }

  const chatRes = await unipileFetch<UnipileChat & { id: string }>("/chats", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      attendees_ids: [providerId],
      text,
    }),
  });
  const chatId = chatRes?.id;
  if (chatId && ctx.run.organization_id) {
    await ctx.supabase.from("unipile_chat_prospects").upsert(
      {
        prospect_id: ctx.prospect.id,
        unipile_chat_id: chatId,
        organization_id: ctx.run.organization_id,
      },
      { onConflict: "prospect_id,unipile_chat_id" }
    );
  }
}

async function handleWhatsAppMessage(ctx: HandlerContext): Promise<void> {
  const accountId = await getWhatsAppAccountIdForUserId(
    ctx.supabase,
    ctx.startedByUserId
  );
  if (!accountId) {
    throw new Error("Aucun compte WhatsApp Unipile pour l’utilisateur ayant lancé le workflow");
  }
  const phone = (ctx.prospect.phone ?? "").trim();
  if (!phone) {
    throw new Error("Numéro de téléphone manquant pour ce prospect");
  }
  const template =
    typeof ctx.config.messageTemplate === "string" ? ctx.config.messageTemplate : "";
  if (!template.trim()) {
    throw new Error("Message WhatsApp vide");
  }
  const text = applyMessageVariables(template, ctx.prospect, {});

  await unipileFetch("/chats", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      attendees_ids: [phone],
      text,
    }),
  });
}

const HANDLERS: Record<
  WorkflowStepType,
  (ctx: HandlerContext) => Promise<void>
> = {
  wait: handleWait,
  linkedin_invite: handleLinkedInInvite,
  linkedin_message: handleLinkedInMessage,
  whatsapp_message: handleWhatsAppMessage,
};

export type ProcessExecutionResult =
  | { outcome: "processed" }
  | { outcome: "skipped"; reason: string }
  | { outcome: "error"; message: string };

export async function processWorkflowStepExecution(
  supabase: SupabaseClient<Database>,
  executionId: string
): Promise<ProcessExecutionResult> {
  const nowIso = new Date().toISOString();

  const { data: exec, error: execErr } = await supabase
    .from("workflow_step_executions")
    .select("*")
    .eq("id", executionId)
    .maybeSingle();

  if (execErr || !exec) {
    return { outcome: "skipped", reason: "not_found" };
  }

  const execution = exec as ExecutionRow;

  if (execution.status === "completed" || execution.status === "cancelled") {
    return { outcome: "skipped", reason: "already_done" };
  }

  const { data: claimed, error: claimErr } = await supabase
    .from("workflow_step_executions")
    .update({ status: "processing", updated_at: nowIso })
    .eq("id", executionId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return { outcome: "skipped", reason: "claim_failed" };
  }

  const { data: run, error: runErr } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("id", execution.run_id)
    .single();

  if (runErr || !run) {
    await supabase
      .from("workflow_step_executions")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", executionId);
    return { outcome: "skipped", reason: "run_not_found" };
  }

  const runRow = run as RunRow;

  const { data: wfPause } = await supabase
    .from("workflows")
    .select("is_active")
    .eq("id", runRow.workflow_id)
    .maybeSingle();

  if (!wfPause?.is_active) {
    await supabase
      .from("workflow_step_executions")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", executionId);
    return { outcome: "skipped", reason: "workflow_paused" };
  }

  if (runRow.status !== "running") {
    await supabase
      .from("workflow_step_executions")
      .update({
        status: "cancelled",
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", executionId);
    return { outcome: "skipped", reason: "run_not_running" };
  }

  const definition = definitionFromRunSnapshot(runRow);
  if (!definition) {
    const msg = "Définition de workflow introuvable";
    await failExecution(supabase, execution, runRow, msg);
    return { outcome: "error", message: msg };
  }

  const step = definition.steps[execution.step_index];
  if (!step || step.id !== execution.step_id || step.type !== execution.step_type) {
    const msg = "Étape incohérente avec le parcours inscrit";
    await failExecution(supabase, execution, runRow, msg);
    return { outcome: "error", message: msg };
  }

  const { data: prospect, error: prospectErr } = await supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email, linkedin, organization_id, metadata")
    .eq("id", runRow.prospect_id)
    .single();

  if (prospectErr || !prospect) {
    const msg = "Prospect introuvable";
    await failExecution(supabase, execution, runRow, msg);
    return { outcome: "error", message: msg };
  }

  const config =
    execution.config_snapshot &&
    typeof execution.config_snapshot === "object" &&
    !Array.isArray(execution.config_snapshot)
      ? (execution.config_snapshot as Record<string, unknown>)
      : {};

  const handler = HANDLERS[step.type as WorkflowStepType];
  if (!handler) {
    const msg = `Type d’étape inconnu: ${execution.step_type}`;
    await failExecution(supabase, execution, runRow, msg);
    return { outcome: "error", message: msg };
  }

  try {
    await handler({
      supabase,
      run: runRow,
      prospect: prospect as ProspectRow,
      config,
      startedByUserId: runRow.started_by,
    });
  } catch (err) {
    const msg = err instanceof UnipileApiError ? err.message : String(err);
    const attempts = (execution.attempts ?? 0) + 1;
    const maxAttempts = execution.max_attempts ?? 5;

    if (attempts >= maxAttempts) {
      await supabase
        .from("workflow_step_executions")
        .update({
          status: "failed",
          attempts,
          last_error: msg,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", executionId);

      await supabase
        .from("workflow_runs")
        .update({
          status: "failed",
          last_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", runRow.id);

      await logWorkflowStepFailed(supabase, {
        organization_id: runRow.organization_id,
        prospect_id: runRow.prospect_id,
        workflow_id: runRow.workflow_id,
        actor_id: runRow.started_by,
        run_id: runRow.id,
        step_index: execution.step_index,
        step_type: execution.step_type,
        error: msg,
      });

      return { outcome: "error", message: msg };
    }

    await supabase
      .from("workflow_step_executions")
      .update({
        status: "pending",
        attempts,
        last_error: msg,
        run_after: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    return { outcome: "skipped", reason: "retry_scheduled" };
  }

  const doneIso = new Date().toISOString();

  await supabase
    .from("workflow_step_executions")
    .update({
      status: "completed",
      processed_at: doneIso,
      last_error: null,
      updated_at: doneIso,
    })
    .eq("id", executionId);

  await logWorkflowStepCompleted(supabase, {
    organization_id: runRow.organization_id,
    prospect_id: runRow.prospect_id,
    workflow_id: runRow.workflow_id,
    actor_id: runRow.started_by,
    run_id: runRow.id,
    step_index: execution.step_index,
    step_type: execution.step_type,
    step_id: execution.step_id,
  });

  let delayBeforeNextMs = 0;
  if (step.type === "wait") {
    const hours = Number(config.durationHours);
    delayBeforeNextMs = Math.round(hours * 3600 * 1000);
  }

  const next = await enqueueNextStep(
    supabase,
    runRow.id,
    definition,
    execution.step_index,
    delayBeforeNextMs
  );

  if (!next.ok) {
    await supabase
      .from("workflow_runs")
      .update({
        status: "failed",
        last_error: next.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);
    return { outcome: "error", message: next.error };
  }

  if (next.done) {
    await supabase
      .from("workflow_runs")
      .update({
        status: "completed",
        current_step_index: execution.step_index,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    await logWorkflowRunCompleted(supabase, {
      organization_id: runRow.organization_id,
      prospect_id: runRow.prospect_id,
      workflow_id: runRow.workflow_id,
      actor_id: runRow.started_by,
      run_id: runRow.id,
    });
  } else {
    await supabase
      .from("workflow_runs")
      .update({
        current_step_index: execution.step_index + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);
  }

  return { outcome: "processed" };
}

async function failExecution(
  supabase: SupabaseClient<Database>,
  execution: ExecutionRow,
  run: RunRow,
  msg: string
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("workflow_step_executions")
    .update({
      status: "failed",
      last_error: msg,
      processed_at: now,
      updated_at: now,
    })
    .eq("id", execution.id);

  await supabase
    .from("workflow_runs")
    .update({
      status: "failed",
      last_error: msg,
      updated_at: now,
    })
    .eq("id", run.id);

  await logWorkflowStepFailed(supabase, {
    organization_id: run.organization_id,
    prospect_id: run.prospect_id,
    workflow_id: run.workflow_id,
    actor_id: run.started_by,
    run_id: run.id,
    step_index: execution.step_index,
    step_type: execution.step_type,
    error: msg,
  });
}

/**
 * Pick one due execution (pending, run_after <= now, run is running).
 */
export async function pickDueWorkflowExecution(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("workflow_step_executions")
    .select("id, run_id, run_after, status")
    .eq("status", "pending")
    .lte("run_after", nowIso)
    .order("run_after", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(25);

  if (error || !rows?.length) return null;

  for (const row of rows) {
    const { data: run } = await supabase
      .from("workflow_runs")
      .select("status, workflow_id")
      .eq("id", row.run_id)
      .maybeSingle();

    if (run?.status !== "running") continue;

    const { data: wf } = await supabase
      .from("workflows")
      .select("is_active")
      .eq("id", run.workflow_id)
      .maybeSingle();

    if (wf?.is_active) {
      return row.id;
    }
  }

  return null;
}
