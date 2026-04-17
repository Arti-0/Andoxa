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
 * POST /api/unipile/connect-linkedin
 * Génère un lien d’authentification hébergée pour connecter LinkedIn.
 * - type "reconnect" si l’utilisateur a déjà un compte LinkedIn lié
 * - type "create" sinon
 */
export const POST = createApiHandler(
  async (_req, ctx) => {
    if (!ctx.userId) throw Errors.badRequest("Authentication required");

    const { data: existingAccount } = await ctx.supabase
      .from("user_unipile_accounts")
      .select("unipile_account_id")
      .eq("user_id", ctx.userId)
      .eq("account_type", "LINKEDIN")
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
        "Configuration de messagerie incomplète sur le serveur : définissez UNIPILE_API_URL et UNIPILE_API_KEY."
      );
    }

    const notifyUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/unipile`;
    const successUrl = `${baseUrl.replace(/\/$/, "")}/onboarding?linkedin_connected=1`;
    const failureUrl = `${baseUrl.replace(/\/$/, "")}/onboarding?linkedin_connected=0`;
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // `name` est renvoyé sur notify_url ; format actuel = userId (compat futur : userId|orgId si besoin).
    const body: Record<string, unknown> = {
      type: existingAccount?.unipile_account_id ? "reconnect" : "create",
      providers: ["LINKEDIN"],
      name: ctx.userId,
      notify_url: notifyUrl,
      api_url: unipileBase,
      expiresOn,
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      /** Hosted Auth Wizard UI language (Unipile; may be ignored if unsupported). */
      locale: "fr",
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
          headers: { "Accept-Language": "fr-FR,fr;q=0.9" },
        }
      );
      const url = (data as HostedAuthLinkResponse)?.url;
      if (!url) throw Errors.internal("Impossible d'obtenir le lien de connexion");
      return { url };
    } catch (err) {
      if (err instanceof UnipileApiError) {
        throw Errors.badRequest(err.message, {
          unipileType: err.unipileType ?? "",
        });
      }
      throw Errors.internal(
        err instanceof Error ? err.message : "Erreur de connexion"
      );
    }
  },
  { requireWorkspace: false }
);
