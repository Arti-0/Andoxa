/** Canal d'envoi */
export type CampaignChannel = "linkedin" | "whatsapp";

/**
 * Action LinkedIn — non applicable à WhatsApp.
 *
 * `invite_then_message` sends a bare invitation in phase 1 (no attached note,
 * higher acceptance rate than invite_with_note in practice) and a personalised
 * message in phase 2 once LinkedIn signals acceptance via the `new_relation`
 * webhook. The phase-2 message is stored in `campaign_jobs.metadata
 * .followup_message_template` and dispatched from `record-invite-accepted.ts`.
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
