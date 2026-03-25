import { createApiHandler, Errors } from "@/lib/api";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";

interface HostedAuthLinkResponse {
  object?: string;
  url: string;
}

/**
 * POST /api/unipile/connect-whatsapp
 * Generate Unipile Hosted Auth link for connecting WhatsApp.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data: existingAccount } = await ctx.supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id, account_type")
    .eq("user_id", ctx.userId)
    .eq("account_type", "WHATSAPP")
    .maybeSingle();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  let unipileBase = process.env.UNIPILE_API_URL || "https://api1.unipile.com:13111";
  if (!unipileBase.startsWith("http")) unipileBase = `https://${unipileBase}`;

  const notifyUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/unipile`;
  const successUrl = `${baseUrl.replace(/\/$/, "")}/installation?whatsapp_connected=1`;
  const failureUrl = `${baseUrl.replace(/\/$/, "")}/installation?whatsapp_connected=0`;
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const body: Record<string, unknown> = {
    type: existingAccount?.unipile_account_id ? "reconnect" : "create",
    providers: ["WHATSAPP"],
    name: `${ctx.userId}__whatsapp`,
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
    const data = await unipileFetch<HostedAuthLinkResponse>("/hosted/accounts/link", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const url = (data as HostedAuthLinkResponse)?.url;
    if (!url) throw Errors.internal("Impossible d'obtenir le lien de connexion");
    return { url };
  } catch (err) {
    if (err instanceof UnipileApiError) {
      const type = err.unipileType ?? "";
      if (type === "errors/missing_credentials" || err.message === "Compte non connecté") {
        throw Errors.badRequest(
          "Unipile n'arrive pas à valider vos identifiants d'API (UNIPILE_API_KEY). " +
            "Vérifiez `UNIPILE_API_KEY` (token d'accès Unipile), assurez-vous qu'elle n'est pas expirée " +
            "et redémarrez l'application après modification, puis réessayez « Connecter WhatsApp ».",
          { unipileType: type }
        );
      }

      throw Errors.badRequest(err.message, { unipileType: type });
    }
    const message = err instanceof Error ? err.message : "Erreur de connexion";
    throw Errors.internal(message);
  }
});
