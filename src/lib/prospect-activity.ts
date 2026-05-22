import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import type { Json } from "@/lib/types/supabase";

/**
 * Canonical verb registry for `prospect_activity.action` text rows.
 *
 * Every writer should pick a verb from this union; the matching display
 * metadata (UI bucket, FR label, sentence builder) lives in
 * `ACTIVITY_DESCRIPTORS` below so the dashboard activity feed, the
 * profile timeline (`/api/prospects/:id/events`), the engagement counters
 * (`/api/prospects/:id/engagement`) and the row-level "last activity"
 * label all classify the same row identically.
 *
 * Adding a verb is a 3-step change:
 *   1) extend `ProspectActivityAction`
 *   2) add an entry to `ACTIVITY_DESCRIPTORS`
 *   3) optionally export a typed `log...()` helper here
 */

export type ProspectActivityAction =
  // --- Pipeline / status -------------------------------------------------
  | "status_change"
  // --- Workflow engine ---------------------------------------------------
  | "workflow_enrolled"
  | "workflow_step_completed"
  | "workflow_step_failed"
  | "workflow_run_completed"
  // --- LinkedIn ----------------------------------------------------------
  | "linkedin_invite_sent"
  | "linkedin_invite_accepted"
  | "linkedin_message_outbound"
  | "linkedin_message_inbound"
  // --- WhatsApp ----------------------------------------------------------
  | "whatsapp_message_outbound"
  | "whatsapp_message_inbound"
  // --- Meetings / bookings ----------------------------------------------
  | "rdv_scheduled"
  | "rdv_done"
  | "rdv_no_show"
  | "booking_taken"
  // --- Lifecycle / data --------------------------------------------------
  | "note_added"
  | "enrich"
  | "import"
  | "prospect_restored";

/** UI bucket the timeline / dashboard / profile classifier uses. */
export type ActivityKind =
  | "linkedin"
  | "whatsapp"
  | "pipeline"
  | "workflow"
  | "rdv"
  | "note"
  | "enrich"
  | "origin";

interface ActivityDescriptor {
  kind: ActivityKind;
  /** "sent" / "received" only for message rows. */
  dir?: "sent" | "received";
  /** Short FR title rendered in the timeline. */
  title: string;
  /**
   * Builds the body sentence from `details`. Free to read any field — the
   * shape of `details` for each verb is documented inline below.
   */
  body: (details: Record<string, unknown>) => string;
  /** Should this row count as a "message" in engagement totals? */
  countsAsMessage?: boolean;
  countsAsRdv?: boolean;
  countsAsNoShow?: boolean;
}

/**
 * Registry of every verb. Keep alphabetised by key for diff sanity.
 *
 * `details` shape per verb:
 *   status_change              { from, to }
 *   workflow_enrolled          { workflow_name, run_id }
 *   workflow_step_completed    { workflow_name, run_id, step_index, step_type, step_id }
 *   workflow_step_failed       { workflow_name, run_id, step_index, step_type, error }
 *   workflow_run_completed     { workflow_name, run_id }
 *   linkedin_invite_sent       { message? }
 *   linkedin_invite_accepted   {}
 *   linkedin_message_*         { message }
 *   whatsapp_message_*         { message }
 *   rdv_scheduled              { event_id, when }
 *   rdv_done                   { event_id }
 *   rdv_no_show                { event_id }
 *   booking_taken              { booking_slug, scheduled_for }
 *   note_added                 { note }
 *   enrich                     { source }
 *   import                     { source, list_name? }
 *   prospect_restored          { bdd_name? }
 */
export const ACTIVITY_DESCRIPTORS: Record<
  ProspectActivityAction,
  ActivityDescriptor
> = {
  status_change: {
    kind: "pipeline",
    title: "Statut pipeline modifié",
    body: (d) => {
      const from = String(d.from ?? "?");
      const to = String(d.to ?? "?");
      return `${from} → ${to}`;
    },
  },
  workflow_enrolled: {
    kind: "workflow",
    title: "Inscription au parcours",
    body: (d) =>
      typeof d.workflow_name === "string"
        ? `Inscrit au parcours « ${d.workflow_name} »`
        : "Inscrit à un parcours",
  },
  workflow_step_completed: {
    kind: "workflow",
    title: "Étape de parcours terminée",
    body: (d) => {
      const map: Record<string, string> = {
        wait: "Attente terminée",
        linkedin_invite: "Invitation LinkedIn envoyée",
        linkedin_message: "Message LinkedIn envoyé",
        whatsapp_message: "Message WhatsApp envoyé",
      };
      const t = typeof d.step_type === "string" ? d.step_type : "";
      return map[t] ?? `Étape terminée (${t || "?"})`;
    },
  },
  workflow_step_failed: {
    kind: "workflow",
    title: "Étape de parcours échouée",
    body: (d) =>
      typeof d.error === "string"
        ? `Échec : ${d.error.slice(0, 200)}`
        : "Échec d'étape",
  },
  workflow_run_completed: {
    kind: "workflow",
    title: "Parcours terminé",
    body: (d) =>
      typeof d.workflow_name === "string"
        ? `Parcours « ${d.workflow_name} » terminé`
        : "Parcours terminé",
  },
  linkedin_invite_sent: {
    kind: "linkedin",
    dir: "sent",
    title: "Invitation LinkedIn envoyée",
    body: (d) => (typeof d.message === "string" ? d.message : ""),
    countsAsMessage: true,
  },
  linkedin_invite_accepted: {
    kind: "linkedin",
    dir: "received",
    title: "Invitation LinkedIn acceptée",
    body: () => "Le prospect a accepté votre demande de connexion",
  },
  linkedin_message_outbound: {
    kind: "linkedin",
    dir: "sent",
    title: "Message LinkedIn envoyé",
    body: (d) => (typeof d.message === "string" ? d.message : ""),
    countsAsMessage: true,
  },
  linkedin_message_inbound: {
    kind: "linkedin",
    dir: "received",
    title: "Réponse LinkedIn reçue",
    body: (d) => (typeof d.message === "string" ? d.message : ""),
    countsAsMessage: true,
  },
  whatsapp_message_outbound: {
    kind: "whatsapp",
    dir: "sent",
    title: "Message WhatsApp envoyé",
    body: (d) => (typeof d.message === "string" ? d.message : ""),
    countsAsMessage: true,
  },
  whatsapp_message_inbound: {
    kind: "whatsapp",
    dir: "received",
    title: "Réponse WhatsApp reçue",
    body: (d) => (typeof d.message === "string" ? d.message : ""),
    countsAsMessage: true,
  },
  rdv_scheduled: {
    kind: "rdv",
    title: "RDV programmé",
    body: (d) =>
      typeof d.when === "string"
        ? `Rendez-vous programmé pour le ${d.when}`
        : "Rendez-vous programmé",
    countsAsRdv: true,
  },
  rdv_done: {
    kind: "rdv",
    title: "RDV réalisé",
    body: () => "Rendez-vous tenu",
    countsAsRdv: true,
  },
  rdv_no_show: {
    kind: "rdv",
    title: "No-show",
    body: () => "Le prospect ne s'est pas présenté",
    countsAsNoShow: true,
  },
  booking_taken: {
    kind: "rdv",
    title: "Booking pris",
    body: (d) =>
      typeof d.scheduled_for === "string"
        ? `Créneau réservé pour le ${d.scheduled_for}`
        : "Créneau réservé sur la page de booking",
    countsAsRdv: true,
  },
  note_added: {
    kind: "note",
    title: "Note ajoutée",
    body: (d) => (typeof d.note === "string" ? d.note : ""),
  },
  enrich: {
    kind: "enrich",
    title: "Profil enrichi",
    body: (d) =>
      typeof d.source === "string" ? `Source : ${d.source}` : "Profil enrichi",
  },
  import: {
    kind: "origin",
    title: "Importé",
    body: (d) => {
      const src = typeof d.source === "string" ? d.source : "—";
      const list =
        typeof d.list_name === "string" ? ` · liste « ${d.list_name} »` : "";
      return `Source : ${src}${list}`;
    },
  },
  prospect_restored: {
    kind: "origin",
    title: "Prospect restauré",
    body: (d) =>
      typeof d.bdd_name === "string"
        ? `Restauré et ajouté à « ${d.bdd_name} »`
        : "Restauré depuis la corbeille",
  },
};

/** Resolve any action string (canonical or unknown) to a descriptor. */
export function describeActivity(action: string): ActivityDescriptor {
  const known = ACTIVITY_DESCRIPTORS[action as ProspectActivityAction];
  if (known) return known;
  return {
    kind: "note",
    title: action,
    body: () => "",
  };
}

/* ============================================================
   Writers
   ============================================================ */

/**
 * Best-effort log; never throws (cron / workflows must not depend on this table).
 */
export async function insertProspectActivity(
  supabase: SupabaseClient<Database>,
  row: {
    organization_id: string;
    prospect_id: string;
    workflow_id?: string | null;
    campaign_job_id?: string | null;
    actor_id: string | null;
    action: ProspectActivityAction;
    details: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("prospect_activity").insert({
      organization_id: row.organization_id,
      prospect_id: row.prospect_id,
      workflow_id: row.workflow_id ?? null,
      campaign_job_id: row.campaign_job_id ?? null,
      actor_id: row.actor_id,
      action: row.action,
      details: row.details as Json,
    });
    if (error) {
      console.error("[prospect_activity] insert failed", error.message);
    }
  } catch (e) {
    console.error("[prospect_activity] insert exception", e);
  }
}

export async function fetchWorkflowName(
  supabase: SupabaseClient<Database>,
  workflowId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("workflows")
    .select("name")
    .eq("id", workflowId)
    .maybeSingle();
  return data?.name ?? null;
}

/* ---------- Status / pipeline ------------------------------------------ */

export async function logStatusChange(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    actor_id: string | null;
    from: string | null;
    to: string;
  },
): Promise<void> {
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    actor_id: args.actor_id,
    action: "status_change",
    details: { from: args.from ?? null, to: args.to },
  });
}

/* ---------- Workflows --------------------------------------------------- */

export async function logWorkflowEnrolled(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string | null;
    run_id: string;
  },
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_enrolled",
    details: { workflow_name: workflowName, run_id: args.run_id },
  });
}

export async function logWorkflowStepCompleted(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string;
    run_id: string;
    step_index: number;
    step_type: string;
    step_id: string;
  },
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_step_completed",
    details: {
      workflow_name: workflowName,
      run_id: args.run_id,
      step_index: args.step_index,
      step_type: args.step_type,
      step_id: args.step_id,
    },
  });
}

export async function logWorkflowRunCompleted(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string;
    run_id: string;
  },
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_run_completed",
    details: { workflow_name: workflowName, run_id: args.run_id },
  });
}

export async function logWorkflowStepFailed(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    workflow_id: string;
    actor_id: string;
    run_id: string;
    step_index: number;
    step_type: string;
    error: string;
  },
): Promise<void> {
  const workflowName =
    (await fetchWorkflowName(supabase, args.workflow_id)) ?? "Parcours";
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    workflow_id: args.workflow_id,
    actor_id: args.actor_id,
    action: "workflow_step_failed",
    details: {
      workflow_name: workflowName,
      run_id: args.run_id,
      step_index: args.step_index,
      step_type: args.step_type,
      error: args.error.slice(0, 500),
    },
  });
}

/* ---------- Notes / data ------------------------------------------------ */

export async function logNoteAdded(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    actor_id: string | null;
    note: string;
  },
): Promise<void> {
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    actor_id: args.actor_id,
    action: "note_added",
    details: { note: args.note.slice(0, 1000) },
  });
}

export async function logEnrich(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    actor_id: string | null;
    source: string;
  },
): Promise<void> {
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    actor_id: args.actor_id,
    action: "enrich",
    details: { source: args.source },
  });
}

export async function logImport(
  supabase: SupabaseClient<Database>,
  args: {
    organization_id: string;
    prospect_id: string;
    actor_id: string | null;
    source: string;
    list_name?: string | null;
  },
): Promise<void> {
  await insertProspectActivity(supabase, {
    organization_id: args.organization_id,
    prospect_id: args.prospect_id,
    actor_id: args.actor_id,
    action: "import",
    details: {
      source: args.source,
      ...(args.list_name ? { list_name: args.list_name } : {}),
    },
  });
}
