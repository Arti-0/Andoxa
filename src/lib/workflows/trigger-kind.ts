/**
 * Workflow trigger registry. Values match `public.workflows.trigger_kind`
 * (CHECK constraint extended in migration 20260520120300).
 *
 * Conventions:
 *   - `category` groups triggers in the builder picker UI.
 *   - `configTarget` declares the *kind* of target the trigger needs (if
 *     any). UI inspects this to render the right sub-picker; the API
 *     route validates the resulting trigger_config against the schema
 *     in `trigger-config.ts` (kept separate so this file can be imported
 *     by client bundles without pulling Zod).
 */

export type WorkflowTriggerKind =
  | "manual"
  | "on_booking"
  | "on_no_show"
  | "on_status_change"
  | "on_linkedin_reply"
  | "on_whatsapp_reply"
  | "on_campaign_reply"
  | "on_invite_accepted"
  | "on_list_add"
  | "on_tag";

export type WorkflowTriggerCategory = "pipeline" | "reply" | "list_tag" | "manual";

/** What kind of target the trigger needs in `workflow.trigger_config`. */
export type WorkflowTriggerConfigTarget =
  | "none"
  | "status" // → { targetStatusId: uuid }
  | "tag" // → { targetTagId: uuid }
  | "campaign_job" // → { campaignJobId?: uuid }   (optional scope)
  | "list"; // → { targetListId?: uuid }    (optional scope)

const ALL_KINDS: WorkflowTriggerKind[] = [
  "manual",
  "on_booking",
  "on_no_show",
  "on_status_change",
  "on_linkedin_reply",
  "on_whatsapp_reply",
  "on_campaign_reply",
  "on_invite_accepted",
  "on_list_add",
  "on_tag",
];

export function isWorkflowTriggerKind(
  v: string | null | undefined
): v is WorkflowTriggerKind {
  return typeof v === "string" && (ALL_KINDS as string[]).includes(v);
}

export interface WorkflowTriggerOption {
  id: WorkflowTriggerKind;
  category: WorkflowTriggerCategory;
  label: string;
  /** Short line under the trigger node on the canvas. */
  nodeSub: string;
  description: string;
  configTarget: WorkflowTriggerConfigTarget;
}

export const WORKFLOW_TRIGGER_KIND_OPTIONS: WorkflowTriggerOption[] = [
  // ---------- Pipeline ----------
  {
    id: "on_booking",
    category: "pipeline",
    label: "Réunion réservée",
    nodeSub: "Créneau réservé via la page booking",
    description:
      "Quand un prospect réserve un créneau via la page de booking. Un run par (prospect, événement) — un nouveau RDV redéclenche.",
    configTarget: "none",
  },
  {
    id: "on_no_show",
    category: "pipeline",
    label: "No-show à une réunion",
    nodeSub: "Réunion marquée non honorée",
    description:
      "Quand une réunion réservée passe en statut « no-show ». Un run par événement.",
    configTarget: "none",
  },
  {
    id: "on_status_change",
    category: "pipeline",
    label: "Statut CRM modifié",
    nodeSub: "Changement de statut pipeline",
    description:
      "Quand le statut d’un prospect change. Choisissez un statut cible pour ne déclencher que sur celui-ci, ou laissez vide pour tous les changements.",
    configTarget: "status",
  },

  // ---------- Réactions prospect ----------
  {
    id: "on_linkedin_reply",
    category: "reply",
    label: "Réponse LinkedIn reçue",
    nodeSub: "Message LinkedIn entrant",
    description:
      "Quand un prospect répond sur LinkedIn (détecté via le webhook entrant). Une fois par message reçu.",
    configTarget: "none",
  },
  {
    id: "on_whatsapp_reply",
    category: "reply",
    label: "Réponse WhatsApp reçue",
    nodeSub: "Message WhatsApp entrant",
    description:
      "Quand un prospect répond sur WhatsApp. Une fois par message reçu.",
    configTarget: "none",
  },
  {
    id: "on_campaign_reply",
    category: "reply",
    label: "Réponse reçue à une campagne",
    nodeSub: "Réponse rattachée à une campagne",
    description:
      "Quand une réponse entrante est rattachée à une campagne active du prospect. Pinnable à une campagne spécifique.",
    configTarget: "campaign_job",
  },
  {
    id: "on_invite_accepted",
    category: "reply",
    label: "Invitation LinkedIn acceptée",
    nodeSub: "Connexion établie après invitation",
    description:
      "Quand un prospect accepte votre demande de connexion LinkedIn. Une fois par invitation acceptée.",
    configTarget: "none",
  },

  // ---------- Liste & Tag ----------
  {
    id: "on_list_add",
    category: "list_tag",
    label: "Prospect ajouté à une liste",
    nodeSub: "Ajout dans une liste / BDD",
    description:
      "Quand un prospect entre dans une liste. Pinnable à une liste spécifique, sinon toutes les listes.",
    configTarget: "list",
  },
  {
    id: "on_tag",
    category: "list_tag",
    label: "Tag ajouté",
    nodeSub: "Tag appliqué au prospect",
    description:
      "Quand un tag est ajouté à un prospect. Choisissez un tag cible pour ne déclencher que sur celui-ci.",
    configTarget: "tag",
  },

  // ---------- Manuel ----------
  {
    id: "manual",
    category: "manual",
    label: "Déclencheur manuel",
    nodeSub: "Lancement depuis vos listes",
    description:
      "Inscription via le bouton ou les listes — le comportement par défaut.",
    configTarget: "none",
  },
];

/** Labels for the grouped picker UI. */
export const WORKFLOW_TRIGGER_CATEGORY_LABELS: Record<WorkflowTriggerCategory, string> = {
  pipeline: "Pipeline",
  reply: "Réactions prospect",
  list_tag: "Liste & Tag",
  manual: "Manuel",
};

/** Convenience lookup. */
export function getTriggerOption(
  kind: WorkflowTriggerKind | string | null | undefined
): WorkflowTriggerOption | null {
  if (!isWorkflowTriggerKind(kind)) return null;
  return WORKFLOW_TRIGGER_KIND_OPTIONS.find((o) => o.id === kind) ?? null;
}
