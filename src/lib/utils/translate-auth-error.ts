/**
 * Translate Supabase auth errors to French
 * Handles HTTP status codes, rate limiting, and specific error messages
 * Respects GDPR by not exposing sensitive information
 */
import { logger } from "./logger";

export interface AuthErrorInfo {
  message: string;
  status?: number;
  code?: string;
}

export function translateAuthError(
  error: string | Error | AuthErrorInfo,
  context?: { action?: string; userId?: string }
): string {
  // Extract error information
  let errorMessage = "";
  let statusCode: number | undefined;
  let errorCode: string | undefined;

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    // Check if error has status property (from fetch/API errors)
    if ("status" in error) {
      statusCode = (error as { status: number }).status;
    }
  } else if (error && typeof error === "object") {
    errorMessage = error.message || "";
    statusCode = error.status;
    errorCode = error.code;
  }

  // Log error with context (sensitive data is automatically redacted by logger)
  logger.error(
    "Auth error occurred",
    error instanceof Error ? error : new Error(errorMessage),
    {
      action: context?.action || "auth",
      statusCode,
      errorCode,
      userId: context?.userId,
    }
  );

  // Map HTTP status codes to user-friendly messages
  if (statusCode) {
    switch (statusCode) {
      case 429:
        return "Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.";
      case 500:
      case 502:
      case 503:
        return "Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.";
      case 400:
        // Will fall through to specific error message mapping
        break;
      case 401:
        return "Votre session a expiré. Veuillez vous reconnecter.";
      case 403:
        return "Vous n'avez pas l'autorisation d'effectuer cette action.";
      case 404:
        return "Ressource introuvable.";
      default:
        if (statusCode >= 500) {
          return "Erreur serveur. Notre équipe a été notifiée. Veuillez réessayer plus tard.";
        }
    }
  }

  const errorMap: Record<string, string> = {
    // Rate limiting
    rate_limit:
      "Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.",
    "rate limit":
      "Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.",
    "too many requests":
      "Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.",
    "429":
      "Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.",

    // Login errors
    "Invalid login credentials": "Email ou mot de passe incorrect",
    "Email not confirmed": "Email non confirmé. Vérifiez votre boîte mail.",
    "Invalid email": "Adresse email invalide",
    "User not found": "Utilisateur introuvable",
    "Invalid password": "Mot de passe incorrect",

    // Sign up errors
    "User already registered": "Un compte existe déjà avec cet email",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères",
    "Signup requires a valid password": "Mot de passe requis",

    // Token/session errors
    "Invalid Refresh Token": "Session expirée. Veuillez vous reconnecter.",
    refresh_token_not_found: "Session expirée. Veuillez vous reconnecter.",
    "Token has expired": "Lien expiré. Veuillez réessayer.",

    // Email errors
    "For security purposes, you can only request this once every 60 seconds":
      "Pour des raisons de sécurité, veuillez attendre 60 secondes avant de réessayer",
    "Unable to validate email address": "Impossible de valider l'adresse email",
    "Email rate limit exceeded":
      "Trop de demandes d'email. Veuillez attendre quelques minutes.",
    "535 Authentication failed":
      "Erreur lors de l'envoi de l'email. Veuillez réessayer ou contacter le support.",

    // Network errors
    "Network request failed":
      "Erreur de connexion. Vérifiez votre connexion internet.",
    "Failed to fetch":
      "Erreur de connexion. Vérifiez votre connexion internet.",
    NetworkError: "Erreur de connexion. Vérifiez votre connexion internet.",

    // Generic server errors
    "Internal server error":
      "Erreur serveur. Notre équipe a été notifiée. Veuillez réessayer plus tard.",
    "Service unavailable":
      "Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.",
  };

  // Check for exact match (case-insensitive)
  const lowerMessage = errorMessage.toLowerCase();
  for (const [key, value] of Object.entries(errorMap)) {
    if (
      lowerMessage === key.toLowerCase() ||
      lowerMessage.includes(key.toLowerCase())
    ) {
      return value;
    }
  }

  // Check error code if available
  if (errorCode) {
    const codeMap: Record<string, string> = {
      rate_limit_exceeded:
        "Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.",
      email_rate_limit:
        "Trop de demandes d'email. Veuillez attendre quelques minutes.",
      invalid_credentials: "Email ou mot de passe incorrect",
      user_not_found: "Utilisateur introuvable",
      email_not_confirmed: "Email non confirmé. Vérifiez votre boîte mail.",
    };

    if (codeMap[errorCode]) {
      return codeMap[errorCode];
    }
  }

  // Default fallback based on error type
  if (
    lowerMessage.includes("password") ||
    lowerMessage.includes("credentials")
  ) {
    return "Email ou mot de passe incorrect";
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
    return "Erreur de connexion. Vérifiez votre connexion internet.";
  }

  if (lowerMessage.includes("timeout")) {
    return "La requête a expiré. Veuillez réessayer.";
  }

  // Generic fallback - never expose technical details
  return "Une erreur est survenue. Veuillez réessayer. Si le problème persiste, contactez le support.";
}

/**
 * Extract error information from various error types
 * Safely handles Supabase errors, fetch errors, and generic errors
 */
export function extractAuthError(error: unknown): {
  message: string;
  status?: number;
  code?: string;
} {
  if (typeof error === "string") {
    return { message: error };
  }

  if (error instanceof Error) {
    const result: { message: string; status?: number; code?: string } = {
      message: error.message,
    };

    // Check for status in error object (fetch errors)
    if ("status" in error) {
      result.status = (error as { status: number }).status;
    }

    // Check for code in error object (Supabase errors)
    if ("code" in error) {
      result.code = (error as { code: string }).code;
    }

    return result;
  }

  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;
    return {
      message: (errorObj.message as string) || "Erreur inconnue",
      status: errorObj.status as number | undefined,
      code: errorObj.code as string | undefined,
    };
  }

  return { message: "Erreur inconnue" };
}

