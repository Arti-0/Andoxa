/**
 * Unipile API types – aligned with official spec (MCP)
 */

export interface UnipileListResponse<T> {
  object: string;
  items: T[];
  cursor?: string | null;
}

export interface UnipileLinkedInConnectionParams {
  im?: {
    id?: string;
    publicIdentifier?: string;
    username?: string;
    premiumId?: string | null;
    premiumFeatures?: string[];
    premiumContractId?: string | null;
    organizations?: unknown[];
    proxy?: { country?: string };
  };
}

export interface UnipileAccount {
  object: "Account";
  id: string;
  type: string;
  name: string;
  created_at: string;
  sources?: Array<{ id: string; status: string }>;
  groups?: unknown[];
  connection_params?: {
    im?: UnipileLinkedInConnectionParams["im"];
  };
}

export interface UnipileChat {
  object?: "Chat";
  id: string;
  account_id: string;
  account_type: string;
  name: string | null;
  timestamp: string | null;
  unread_count: number;
  provider_id?: string;
}

export interface UnipileAttachment {
  id: string;
  name?: string | null;
  extension?: string | null;
  size?: number;
  mime_type?: string | null;
}

export interface UnipileMessage {
  object?: "Message";
  id: string;
  text: string | null;
  timestamp: string;
  sender_id: string;
  sender_attendee_id?: string;
  is_sender: 0 | 1;
  attachments?: UnipileAttachment[];
}

export interface UnipileMessageSent {
  object: "MessageSent";
  message_id: string | null;
}

export interface UnipileError {
  title?: string;
  detail?: string;
  type?: string;
  status: number;
}

/** User-friendly messages for known Unipile error types */
export const UNIPILE_ERROR_MESSAGES: Record<string, string> = {
  "errors/missing_credentials": "Compte non connecté",
  "errors/disconnected_account": "Compte déconnecté, reconnectez LinkedIn",
  "errors/invalid_credentials": "Identifiants invalides",
  "errors/expired_credentials": "Session expirée, reconnectez votre compte",
  "errors/insufficient_credits": "Crédits InMail insuffisants",
  "errors/insufficient_permissions": "Permissions insuffisantes",
  "errors/resource_not_found": "Ressource introuvable",
  "errors/provider_error": "Erreur du fournisseur, réessayez plus tard",
  "errors/service_unavailable": "Service indisponible, réessayez plus tard",
};
