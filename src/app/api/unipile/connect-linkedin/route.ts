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
 * Génère un lien Unipile Hosted Auth pour connecter LinkedIn.
 * - type "reconnect" si l'user a déjà un compte Unipile LINKEDIN
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
        "Configuration Unipile incomplète : définissez UNIPILE_API_URL et UNIPILE_API_KEY."
      );
    }

    const notifyUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/unipile`;
    const successUrl = `${baseUrl.replace(/\/$/, "")}/onboarding?linkedin_connected=1`;
    const failureUrl = `${baseUrl.replace(/\/$/, "")}/onboarding?linkedin_connected=0`;
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
