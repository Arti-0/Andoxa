import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureLinkedInRelationFromUnipileProfile } from "@/lib/linkedin/ensure-relation-from-unipile-profile";
import { env } from "@/lib/config/environment";
import { buildBookingPublicUrlForProfile } from "@/lib/booking/public-path";
import { normalizePhoneForWhatsApp } from "@/lib/utils/phone";
import {
  getLinkedInAccountIdForUserId,
  resolveWhatsAppAccountIdForOrganization,
} from "@/lib/unipile/account";
import {
  applyMessageVariables,
  extractLinkedInSlug,
  sendWhatsAppMessage,
} from "@/lib/unipile/campaign";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { markUnipileAccountErroredFromError } from "@/lib/unipile/account-status";
import {
  prospectHasInboundReplyAfter,
  prospectHasLinkedInInboundReply,
} from "@/lib/unipile/linkedin-inbound-reply";
import type { UnipileChat } from "@/lib/unipile/types";
import type { Database, Json } from "@/lib/types/supabase";
import {
  computeInviteBudget,
  inviteQuotaErrorFor,
  LinkedInInviteWeeklyQuotaError,
  reserveInviteSlot,
} from "@/lib/linkedin/weekly-invite-quota";
import {
  insertProspectActivity,
  logWorkflowRunCompleted,
  logWorkflowStepCompleted,
  logWorkflowStepFailed,
} from "@/lib/prospect-activity";
import { enqueueNextStep, enqueueStepById } from "./enqueue";
import {
  parseWorkflowDefinition,
  type WorkflowDefinition,
  type WorkflowStepType,
} from "./schema";
import type { MessageVariablesContext } from "@/lib/messaging/template-variables";

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
    .select("booking_public_path, booking_slug")
    .eq("id", userId)
    .single();
  const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
  return buildBookingPublicUrlForProfile(appUrl, profile);
}

async function resolveMessageVariableContext(
  supabase: SupabaseClient<Database>,
  run: RunRow,
  startedByUserId: string
): Promise<MessageVariablesContext> {
  const enrollmentRaw = (
    run as RunRow & { enrollment_metadata?: unknown }
  ).enrollment_metadata;
  const meta =
    enrollmentRaw &&
    typeof enrollmentRaw === "object" &&
    !Array.isArray(enrollmentRaw)
      ? (enrollmentRaw as Record<string, unknown>)
      : {};

  let meetLink =
    typeof meta.meet_url === "string" && meta.meet_url.trim()
      ? meta.meet_url.trim()
      : null;
  let slotStart =
    typeof meta.slot_start === "string" && meta.slot_start.trim()
      ? meta.slot_start.trim()
      : null;

  const eventId =
    typeof meta.event_id === "string" && meta.event_id.trim()
      ? meta.event_id.trim()
      : null;

  if (eventId && (!meetLink || !slotStart)) {
    const { data: event } = await supabase
      .from("events")
      .select("google_meet_url, start_time")
      .eq("id", eventId)
      .maybeSingle();
    if (!meetLink && event?.google_meet_url) {
      meetLink = event.google_meet_url;
    }
    if (!slotStart && event?.start_time) {
      slotStart = event.start_time;
    }
  }

  let date: string | null = null;
  let time: string | null = null;
  if (slotStart) {
    const slotDate = new Date(slotStart);
    if (!Number.isNaN(slotDate.getTime())) {
      date = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Paris",
      }).format(slotDate);
      time = new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      }).format(slotDate);
    }
  }

  return {
    bookingLink: await getBookingLink(supabase, startedByUserId),
    meetLink,
    date,
    time,
  };
}

type HandlerContext = {
  supabase: SupabaseClient<Database>;
  run: RunRow;
  prospect: ProspectRow;
  config: Record<string, unknown>;
  startedByUserId: string;
  executionId: string;
  /** `run_after` courant de l'exécution (pour timeout / invite déjà en attente) */
  executionRunAfter: string;
};

type StepHandlerResult = {
  awaitingConnection: boolean;
  /** Si défini, remplace le délai avant l’étape suivante (ex. wait immédiat). */
  delayOverrideMs?: number;
  /** Résultat d’une étape condition: true = OUI (a répondu), false = NON */
  conditionResult?: boolean;
};

async function assertProspectNotInActiveCampaign(ctx: HandlerContext): Promise<void> {
  const orgId = ctx.run.organization_id;
  if (!orgId) return;
  const { data, error } = await ctx.supabase
    .from("prospect_in_active_campaign")
    .select("campaign_job_id")
    .eq("organization_id", orgId)
    .eq("prospect_id", ctx.prospect.id)
    .limit(1);
  if (error) {
    console.error("[workflow] overlap view lookup failed", error);
    throw new Error(
      "Impossible de vérifier les campagnes actives. Réessayez dans un instant."
    );
  }
  if (data?.length) {
    throw new Error(
      "Prospect déjà dans une campagne active — envoi interrompu pour éviter les doublons."
    );
  }
}

async function handleWait(ctx: HandlerContext): Promise<StepHandlerResult> {
  const hours = Number(ctx.config.durationHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Durée d’attente invalide");
  }

  const onlyIfNoReply = Boolean(ctx.config.onlyIfNoReply);

  if (onlyIfNoReply) {
    const hasReplied = await prospectHasInboundReplyAfter(
      ctx.supabase,
      ctx.prospect.id,
      ctx.run.organization_id,
      ctx.executionRunAfter
    );
    if (hasReplied) {
      return { awaitingConnection: false, delayOverrideMs: 0 };
    }
  }

  return { awaitingConnection: false };
}

async function handleLinkedInInvite(
  ctx: HandlerContext
): Promise<StepHandlerResult> {
  if (
    await prospectHasLinkedInInboundReply(
      ctx.supabase,
      ctx.prospect.id,
      ctx.run.organization_id
    )
  ) {
    return { awaitingConnection: false };
  }

  await assertProspectNotInActiveCampaign(ctx);

  const pendingId =
    typeof ctx.config.pending_provider_id === "string"
      ? ctx.config.pending_provider_id.trim()
      : "";
  if (pendingId.length > 0) {
    const { data: relWhilePending } = await ctx.supabase
      .from("linkedin_relations")
      .select("id")
      .eq("user_id", ctx.startedByUserId)
      .eq("attendee_id", pendingId)
      .maybeSingle();
    if (relWhilePending) {
      return { awaitingConnection: false };
    }
    const deadline = Date.parse(ctx.executionRunAfter);
    if (!Number.isFinite(deadline) || Date.now() < deadline) {
      return { awaitingConnection: true };
    }
    throw new Error(
      "Invitation LinkedIn non acceptée dans le délai (30 jours)."
    );
  }

  const accountId = await getLinkedInAccountIdForUserId(
    ctx.supabase,
    ctx.startedByUserId
  );
  if (!accountId) {
    throw new Error("Aucun compte LinkedIn connecté pour l’utilisateur ayant lancé le workflow");
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

  const { providerId, isFirstDegree } =
    await ensureLinkedInRelationFromUnipileProfile(
      ctx.supabase,
      ctx.startedByUserId,
      accountId,
      slug
    );
  if (!providerId) {
    throw new Error("Impossible de résoudre le profil LinkedIn");
  }

  if (isFirstDegree) {
    console.info(
      "[workflow] linkedin_invite: already connected (linkedin_relations / profil LinkedIn), skipping invite"
    );
    return { awaitingConnection: false };
  }

  // Atomic invite reservation against the warm-up daily cap + weekly ceiling
  // (race-free against concurrent workflow runs / campaigns for the same user).
  const inviteBudget = await computeInviteBudget(
    ctx.supabase,
    ctx.startedByUserId
  );
  const reserved = await reserveInviteSlot(
    ctx.supabase,
    ctx.startedByUserId,
    inviteBudget
  );
  if (!reserved.ok) {
    throw inviteQuotaErrorFor(reserved);
  }

  try {
    await unipileFetch("/users/invite", {
      method: "POST",
      body: JSON.stringify({
        account_id: accountId,
        provider_id: providerId,
        ...(note ? { message: note } : {}),
      }),
    });
  } catch (err) {
    // Credential-class errors → flip account row to error (banner shows up
    // even when the ACCOUNT_CREDENTIALS webhook never arrived).
    if (err instanceof UnipileApiError) {
      void markUnipileAccountErroredFromError(accountId, err);
    }
    throw err;
  }

  // Write a `linkedin_invite_sent` activity so workflow-driven invites show
  // up in the campaigns KPI bar, the dashboard funnel, and (critically) so
  // record-invite-accepted.ts can pair the future `new_relation` webhook to
  // this exact send via the provider_id + account_id details — same wiring
  // used by campaign sends in process-job-batch.ts.
  void insertProspectActivity(ctx.supabase, {
    organization_id: ctx.run.organization_id,
    prospect_id: ctx.prospect.id,
    actor_id: ctx.startedByUserId,
    campaign_job_id: null,
    action: "linkedin_invite_sent",
    details: {
      message: note ?? "",
      provider_id: providerId,
      account_id: accountId,
      workflow_id: ctx.run.workflow_id,
      workflow_run_id: ctx.run.id,
    },
  });

  const AWAIT_CONNECTION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
  const runAfter = new Date(
    Date.now() + AWAIT_CONNECTION_TIMEOUT_MS
  ).toISOString();

  await ctx.supabase
    .from("workflow_step_executions")
    .update({
      config_snapshot: {
        ...ctx.config,
        pending_provider_id: providerId,
        pending_account_id: accountId,
      } as Json,
      run_after: runAfter,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.executionId);

  return { awaitingConnection: true };
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
  await assertProspectNotInActiveCampaign(ctx);
  const accountId = await getLinkedInAccountIdForUserId(
    ctx.supabase,
    ctx.startedByUserId
  );
  if (!accountId) {
    throw new Error("Aucun compte LinkedIn connecté pour l’utilisateur ayant lancé le workflow");
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

  let providerId: string | undefined;
  let chatRes: (UnipileChat & { id: string }) | undefined;
  try {
    const profileRes = await unipileFetch<{ provider_id?: string }>(
      `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
    );
    providerId = profileRes?.provider_id;
    if (!providerId) {
      throw new Error("Impossible de résoudre le profil LinkedIn");
    }

    chatRes = await unipileFetch<UnipileChat & { id: string }>("/chats", {
      method: "POST",
      body: JSON.stringify({
        account_id: accountId,
        attendees_ids: [providerId],
        text,
      }),
    });
  } catch (err) {
    if (err instanceof UnipileApiError) {
      void markUnipileAccountErroredFromError(accountId, err);
    }
    throw err;
  }
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

  // Activity log so workflow-driven LinkedIn DMs surface in the campaigns
  // KPI bar's "Messages envoyés" counter and the per-job stats aggregator
  // (which keys on `linkedin_message_outbound`).
  void insertProspectActivity(ctx.supabase, {
    organization_id: ctx.run.organization_id,
    prospect_id: ctx.prospect.id,
    actor_id: ctx.startedByUserId,
    campaign_job_id: null,
    action: "linkedin_message_outbound",
    details: {
      message: text.length > 500 ? `${text.slice(0, 499)}…` : text,
      chat_id: chatId ?? null,
      workflow_id: ctx.run.workflow_id,
      workflow_run_id: ctx.run.id,
    },
  });
}

async function handleWhatsAppMessage(ctx: HandlerContext): Promise<void> {
  await assertProspectNotInActiveCampaign(ctx);
  const accountId = await resolveWhatsAppAccountIdForOrganization(
    ctx.supabase,
    ctx.run.organization_id,
    ctx.startedByUserId
  );
  if (!accountId) {
    throw new Error(
      "Aucun compte WhatsApp connecté pour ce workspace (connectez WhatsApp depuis Installation, ou un autre membre avec une boîte connectée doit lancer l’étape)."
    );
  }
  const rawPhone = (ctx.prospect.phone ?? "").trim();
  if (!rawPhone) {
    throw new Error("Numéro de téléphone manquant pour ce prospect");
  }
  const phone = normalizePhoneForWhatsApp(rawPhone);
  const template =
    typeof ctx.config.messageTemplate === "string" ? ctx.config.messageTemplate : "";
  if (!template.trim()) {
    throw new Error("Message WhatsApp vide");
  }
  const variableContext = await resolveMessageVariableContext(
    ctx.supabase,
    ctx.run,
    ctx.startedByUserId
  );
  const text = applyMessageVariables(template, ctx.prospect, variableContext);

  let waChatId: string | null = null;
  try {
    // Unipile's POST /chats needs multipart/form-data + a WhatsApp JID
    // attendee — see sendWhatsAppMessage(). Plain JSON + bare phone silently
    // fails for WhatsApp, which is why this step was broken.
    const chat = await sendWhatsAppMessage({ accountId, phone, text });
    if (chat?.id && ctx.run.organization_id) {
      waChatId = chat.id;
      await ctx.supabase.from("unipile_chat_prospects").upsert(
        {
          prospect_id: ctx.prospect.id,
          unipile_chat_id: chat.id,
          organization_id: ctx.run.organization_id,
        },
        { onConflict: "prospect_id,unipile_chat_id" }
      );
    }
  } catch (err) {
    if (err instanceof UnipileApiError) {
      void markUnipileAccountErroredFromError(accountId, err);
    }
    console.error("Unipile WA error (workflow):", err);
    throw err;
  }

  // Mirror the LinkedIn path: log an outbound activity so this WhatsApp send
  // counts in the campaigns "Messages envoyés" KPI and the per-job stats.
  void insertProspectActivity(ctx.supabase, {
    organization_id: ctx.run.organization_id,
    prospect_id: ctx.prospect.id,
    actor_id: ctx.startedByUserId,
    campaign_job_id: null,
    action: "whatsapp_message_outbound",
    details: {
      message: text.length > 500 ? `${text.slice(0, 499)}…` : text,
      chat_id: waChatId,
      workflow_id: ctx.run.workflow_id,
      workflow_run_id: ctx.run.id,
    },
  });
}

/**
 * Condition step: "Le prospect a-t-il répondu ?"
 * Checks unipile_chat_prospects.last_inbound_at to see if the prospect sent an
 * inbound message after the current run was started.
 */
async function handleCondition(ctx: HandlerContext): Promise<StepHandlerResult> {
  const replied = await prospectHasInboundReplyAfter(
    ctx.supabase,
    ctx.prospect.id,
    ctx.prospect.organization_id,
    ctx.run.created_at ?? new Date(0).toISOString()
  );
  return { awaitingConnection: false, conditionResult: replied };
}

async function handleCrmUpdate(ctx: HandlerContext): Promise<void> {
  const field =
    typeof ctx.config.field === "string" ? ctx.config.field : "status";
  const value = typeof ctx.config.value === "string" ? ctx.config.value : "";
  if (!value.trim()) {
    throw new Error("Valeur CRM manquante");
  }
  const allowed = new Set(["status", "priority"]);
  if (!allowed.has(field)) {
    throw new Error(`Champ CRM non supporté: ${field}`);
  }
  const update: Record<string, unknown> = {};
  update[field] = value;
  const { error } = await ctx.supabase
    .from("prospects")
    .update(update as never)
    .eq("id", ctx.prospect.id);
  if (error) {
    throw new Error(`Mise à jour CRM impossible: ${error.message}`);
  }

  if (ctx.config.notifyOwner === true && ctx.run.organization_id) {
    await ctx.supabase
      .from("notifications")
      .insert({
        title: "Mise à jour CRM",
        message: `Le prospect ${ctx.prospect.full_name ?? ctx.prospect.id.slice(0, 8)} : ${field} → ${value}`,
        type: "internal",
        category: "prospect",
        actor_id: ctx.startedByUserId,
        organization_id: ctx.run.organization_id,
        metadata: {
          prospect_id: ctx.prospect.id,
          workflow_id: ctx.run.workflow_id,
        },
      } as never);
  }
}

async function handleNotificationStep(ctx: HandlerContext): Promise<void> {
  if (!ctx.run.organization_id) {
    throw new Error("Organisation manquante pour la notification");
  }
  const message =
    typeof ctx.config.message === "string" ? ctx.config.message.trim() : "";
  if (!message) {
    throw new Error("Message de notification vide");
  }
  const priority =
    typeof ctx.config.priority === "string" ? ctx.config.priority : "normal";
  const resolved = applyMessageVariables(message, ctx.prospect, {});
  const { error } = await ctx.supabase.from("notifications").insert({
    title: "Notification de workflow",
    message: resolved,
    type: "internal",
    category: "prospect",
    actor_id: ctx.startedByUserId,
    organization_id: ctx.run.organization_id,
    metadata: {
      prospect_id: ctx.prospect.id,
      workflow_id: ctx.run.workflow_id,
      priority,
    },
  } as never);
  if (error) {
    throw new Error(`Notification non envoyée: ${error.message}`);
  }
}

async function handleTaskStep(ctx: HandlerContext): Promise<void> {
  // Tasks are surfaced via the existing notifications system with action_type='task'
  // until a dedicated tasks table lands.
  if (!ctx.run.organization_id) {
    throw new Error("Organisation manquante pour la tâche");
  }
  const title =
    typeof ctx.config.title === "string" ? ctx.config.title.trim() : "";
  if (!title) {
    throw new Error("Titre de tâche manquant");
  }
  const dueInHours = Number(ctx.config.dueInHours ?? 48);
  const dueAt = new Date(
    Date.now() + Math.max(0, dueInHours) * 60 * 60 * 1000
  ).toISOString();
  const resolved = applyMessageVariables(title, ctx.prospect, {});
  const { error } = await ctx.supabase.from("notifications").insert({
    title: "Nouvelle tâche",
    message: resolved,
    type: "internal",
    category: "prospect",
    action_type: "task",
    actor_id: ctx.startedByUserId,
    organization_id: ctx.run.organization_id,
    target_url: `/prospect/${ctx.prospect.id}`,
    metadata: {
      prospect_id: ctx.prospect.id,
      workflow_id: ctx.run.workflow_id,
      due_at: dueAt,
    },
  } as never);
  if (error) {
    throw new Error(`Tâche non créée: ${error.message}`);
  }
}

async function handleEndStep(): Promise<void> {
  // No-op — terminal step. The graph traversal sees no next_id and completes the run.
}

const HANDLERS: Record<
  WorkflowStepType,
  (ctx: HandlerContext) => Promise<StepHandlerResult>
> = {
  wait: (ctx) => handleWait(ctx),
  linkedin_invite: handleLinkedInInvite,
  linkedin_message: async (ctx) => {
    await handleLinkedInMessage(ctx);
    return { awaitingConnection: false };
  },
  whatsapp_message: async (ctx) => {
    await handleWhatsAppMessage(ctx);
    return { awaitingConnection: false };
  },
  condition: handleCondition,
  crm: async (ctx) => {
    await handleCrmUpdate(ctx);
    return { awaitingConnection: false };
  },
  notification: async (ctx) => {
    await handleNotificationStep(ctx);
    return { awaitingConnection: false };
  },
  task: async (ctx) => {
    await handleTaskStep(ctx);
    return { awaitingConnection: false };
  },
  end: async () => {
    await handleEndStep();
    return { awaitingConnection: false };
  },
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

  let awaitingConnection = false;
  let delayOverrideMs: number | undefined;
  let conditionResult: boolean | undefined;
  try {
    const result = await handler({
      supabase,
      run: runRow,
      prospect: prospect as ProspectRow,
      config,
      startedByUserId: runRow.started_by,
      executionId,
      executionRunAfter: execution.run_after,
    });
    awaitingConnection = result.awaitingConnection;
    delayOverrideMs = result.delayOverrideMs;
    conditionResult = result.conditionResult;
  } catch (err) {
    if (err instanceof LinkedInInviteWeeklyQuotaError) {
      await supabase
        .from("workflow_step_executions")
        .update({
          status: "pending",
          last_error: err.message,
          // Daily cap → retry next UTC midnight; weekly cap → next week.
          run_after: err.retryAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", executionId);
      return { outcome: "skipped", reason: "weekly_invite_quota" };
    }

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

  if (awaitingConnection) {
    await supabase
      .from("workflow_step_executions")
      .update({
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", executionId);
    return { outcome: "processed" };
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
  if (delayOverrideMs !== undefined) {
    delayBeforeNextMs = delayOverrideMs;
  }

  // ── Graph-based traversal (new workflows with entry_step_id) ────────────────
  let next: { ok: true; done: boolean } | { ok: false; error: string };

  if (definition.entry_step_id) {
    // Determine next step ID from graph
    let nextStepId: string | undefined;

    if (step.type === "condition") {
      const condStep = step as (typeof step & { on_true_id?: string; on_false_id?: string });
      nextStepId = conditionResult ? condStep.on_true_id : condStep.on_false_id;
    } else {
      nextStepId = (step as (typeof step & { next_id?: string })).next_id;
    }

    if (!nextStepId) {
      next = { ok: true, done: true };
    } else {
      next = await enqueueStepById(supabase, runRow.id, definition, nextStepId, delayBeforeNextMs);
    }
  } else {
    // ── Legacy linear traversal ───────────────────────────────────────────────
    next = await enqueueNextStep(
      supabase,
      runRow.id,
      definition,
      execution.step_index,
      delayBeforeNextMs
    );
  }

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
 * Les `linkedin_invite` en attente de connexion ont un `run_after` repoussé
 * (ex. +30 j) : ils n’apparaissent pas ici tant que le webhook n’a pas avancé le run.
 */
export async function pickDueWorkflowExecution(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("workflow_step_executions")
    .select("id, run_id")
    .eq("status", "pending")
    .lte("run_after", nowIso)
    .order("run_after", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(25);

  if (error || !rows?.length) return null;

  // Resolve which candidates belong to a *running* run whose workflow is still
  // active — batched into two `.in()` queries instead of one run + one workflow
  // lookup per row (the old N+1). Executions on paused/failed/completed runs
  // stay pending and are simply skipped here; they become eligible again if the
  // run returns to `running` — no data mutation needed to ignore them.
  const runIds = [...new Set(rows.map((r) => r.run_id))];
  const { data: runs } = await supabase
    .from("workflow_runs")
    .select("id, workflow_id")
    .in("id", runIds)
    .eq("status", "running");

  if (!runs?.length) return null;

  const workflowIds = [...new Set(runs.map((r) => r.workflow_id))];
  const { data: activeWorkflows } = await supabase
    .from("workflows")
    .select("id")
    .in("id", workflowIds)
    .eq("is_active", true);

  const activeWorkflowIds = new Set((activeWorkflows ?? []).map((w) => w.id));
  const runnableRunIds = new Set(
    runs
      .filter((r) => activeWorkflowIds.has(r.workflow_id))
      .map((r) => r.id)
  );

  // `rows` is still in run_after / created_at order — return the earliest-due
  // execution whose run is runnable.
  for (const row of rows) {
    if (runnableRunIds.has(row.run_id)) return row.id;
  }

  return null;
}
