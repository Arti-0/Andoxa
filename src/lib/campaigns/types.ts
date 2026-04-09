/** Canal d'envoi */
export type CampaignChannel = "linkedin" | "whatsapp";

/** Action LinkedIn — non applicable à WhatsApp */
export type LinkedInAction = "invite" | "invite_with_note" | "contact";

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
    default:
      return "Message LinkedIn";
  }
}

/** Vrai si le type d'action nécessite LinkedIn Premium */
export function requiresPremium(config: CampaignConfig): boolean {
  return config.linkedInAction === "invite_with_note";
}

/** Vrai si le type est une invitation (avec ou sans note) */
export function isInviteAction(config: CampaignConfig): boolean {
  return (
    config.linkedInAction === "invite" ||
    config.linkedInAction === "invite_with_note"
  );
}
