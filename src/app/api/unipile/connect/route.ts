import { createApiHandler, Errors } from "@/lib/api";
import {
  getUnipileApiRoot,
  UnipileApiError,
  unipileFetch,
} from "@/lib/unipile/client";

interface HostedAuthLinkResponse {
  object?: string;
  url: string;
}

/**
 * POST /api/unipile/connect
 * Generate Unipile Hosted Auth link for connecting LinkedIn.
 * - Si l'utilisateur a déjà un compte Unipile : type "reconnect" pour réutiliser le même compte.
 * - Sinon : type "create" pour créer une nouvelle connexion.
 * Returns { url } to redirect the user to Unipile's OAuth flow.
 * On success, Unipile calls notify_url (webhook) with account_id and name (our user_id).
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  // Check if user already has an Unipile account (reconnect vs create)
  const { data: existingAccount } = await ctx.supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  let unipileBase: string;
  try {
    unipileBase = getUnipileApiRoot();
  } catch {
    throw Errors.badRequest(
      "Configuration Unipile incomplète : définissez UNIPILE_API_URL (DSN du tableau de bord) et UNIPILE_API_KEY sur le serveur."
    );
  }
  const notifyUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/unipile`;
  const successUrl = `${baseUrl.replace(/\/$/, "")}/installation?connected=1`;
  const failureUrl = `${baseUrl.replace(/\/$/, "")}/installation?connected=0`;

  const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const body: Record<string, unknown> = {
    type: existingAccount?.unipile_account_id ? "reconnect" : "create",
    providers: ["LINKEDIN"],
    name: ctx.userId,
    notify_url: notifyUrl,
    api_url: unipileBase,
    expiresOn,
    success_redirect_url: successUrl,
    failure_redirect_url: failureUrl,
  };

  if (existingAccount?.unipile_account_id) {
    body.reconnect_account = existingAccount.unipile_account_id;
  }

  try {
    const data = await unipileFetch<HostedAuthLinkResponse>(
      "/hosted/accounts/link",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    const url = (data as HostedAuthLinkResponse)?.url;
    if (!url) {
      throw Errors.internal("Impossible d'obtenir le lien de connexion");
    }
    return { url };
  } catch (err) {
    if (err instanceof UnipileApiError) {
      const type = err.unipileType ?? "";
      if (type === "errors/missing_credentials" || err.message === "Compte non connecté") {
        throw Errors.badRequest(
          "Unipile n'arrive pas à valider vos identifiants d'API (UNIPILE_API_KEY). " +
            "Vérifiez que `UNIPILE_API_KEY` est bien la bonne valeur (token d'accès Unipile), " +
            "qu'elle n'est pas expirée et que vous avez redémarré l'application après modification. " +
            "Ensuite, réessayez « Connecter LinkedIn ».",
          { unipileType: type }
        );
      }

      if (type === "errors/disconnected_account") {
        throw Errors.badRequest(
          "Votre compte Unipile pour LinkedIn est déconnecté. " +
            "Reconnectez LinkedIn via « Connecter LinkedIn » puis vérifiez que le redirect complet s'est bien fait.",
          { unipileType: type }
        );
      }

      // Default: preserve Unipile's user-friendly message.
      throw Errors.badRequest(err.message, { unipileType: type });
    }
    const message = err instanceof Error ? err.message : "Erreur de connexion";
    if (message.includes("UNIPILE_API_KEY")) {
      throw Errors.internal(
        "La messagerie n'est pas configurée. Contactez l'administrateur."
      );
    }
    throw Errors.internal(message);
  }
});
