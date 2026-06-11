/** Canal d'envoi */
export type CampaignChannel = "linkedin" | "whatsapp";

/**
 * A single file attached to a campaign message. Stored on
 * `campaign_jobs.metadata.attachment`. `path` points into the private
 * `messagerie-attachments` Supabase bucket (see lib/campaigns/attachment.ts);
 * the batch worker downloads it at send time and forwards it to the provider.
 *
 * Only `contact` and `invite_then_message` campaigns can carry an attachment —
 * LinkedIn invitations cannot carry files.
 */
export interface CampaignAttachment {
  /** Storage path, e.g. `<organization_id>/<timestamp>_<filename>`. */
  path: string;
  name: string;
  size: number;
}

/** Read a CampaignAttachment off a job's `metadata`, or null when absent/malformed. */
export function readCampaignAttachment(
  metadata: unknown
): CampaignAttachment | null {
  const att = (metadata as { attachment?: unknown } | null)?.attachment;
  if (!att || typeof att !== "object") return null;
  const { path, name, size } = att as Record<string, unknown>;
  if (typeof path !== "string" || !path) return null;
  return {
    path,
    name: typeof name === "string" ? name : "attachment",
    size: typeof size === "number" ? size : 0,
  };
}

/**
 * Action LinkedIn — non applicable à WhatsApp.
 *
 * `invite_then_message` sends an invitation in phase 1 and a personalised
 * message in phase 2 once LinkedIn signals acceptance via the `new_relation`
 * webhook. The phase-2 message is stored in `campaign_jobs.message_template`
 * and dispatched from `record-invite-accepted.ts`. Phase 1 is bare by default;
 * the "invite-with-note + message" flow opts into a phase-1 note by storing it
 * in `campaign_jobs.metadata.invite_note_template`, which the batch worker then
 * attaches to the invite (Premium-gated, like invite_with_note).
 */
export type LinkedInAction =
  | "invite"
  | "invite_with_note"
  | "invite_then_message"
  | "contact";

/** Configuration d'une campagne — passée à CampaignModal et aux routes API */
export interface CampaignConfig {
  channel: CampaignChannel;
  linkedInAction?: LinkedInAction;
}

/** Statut d'un job campagne en base */
export type CampaignJobStatus =
  | "draft"
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type CampaignJobType =
  | "invite"
  | "invite_with_note"
  | "invite_then_message"
  | "contact"
  | "whatsapp";

export function configFromJobType(type: CampaignJobType): CampaignConfig {
  if (type === "whatsapp") return { channel: "whatsapp" };
  return { channel: "linkedin", linkedInAction: type as LinkedInAction };
}

export function jobTypeFromConfig(config: CampaignConfig): CampaignJobType {
  if (config.channel === "whatsapp") return "whatsapp";
  return (config.linkedInAction ?? "contact") as CampaignJobType;
}

export function campaignLabel(config: CampaignConfig): string {
  if (config.channel === "whatsapp") return "Message WhatsApp";
  switch (config.linkedInAction) {
    case "invite":
      return "Invitation LinkedIn";
    case "invite_with_note":
      return "Invitation LinkedIn (avec note)";
    case "invite_then_message":
      return "Invitation + message (à l'acceptation)";
    default:
      return "Message LinkedIn";
  }
}

/** Vrai si le type d'action nécessite LinkedIn Premium */
export function requiresPremium(config: CampaignConfig): boolean {
  return config.linkedInAction === "invite_with_note";
}

/** Vrai si le type est une invitation (avec ou sans note ou suivie d'un message) */
export function isInviteAction(config: CampaignConfig): boolean {
  return (
    config.linkedInAction === "invite" ||
    config.linkedInAction === "invite_with_note" ||
    config.linkedInAction === "invite_then_message"
  );
}

/**
 * Vrai si le type déclenche un envoi en deux temps (invite puis message à
 * l'acceptation). Utilisé pour activer le champ de message de relance dans la
 * modale et pour la dépêche post-acceptation dans `record-invite-accepted.ts`.
 */
export function hasFollowUpMessage(config: CampaignConfig): boolean {
  return config.linkedInAction === "invite_then_message";
}
