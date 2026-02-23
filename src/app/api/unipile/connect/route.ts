import { createApiHandler, Errors } from "@/lib/api";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";

interface HostedAuthLinkResponse {
  object?: string;
  url: string;
}

/**
 * POST /api/unipile/connect
 * Generate Unipile Hosted Auth link for connecting LinkedIn.
 * Returns { url } to redirect the user to Unipile's OAuth flow.
 * On success, Unipile calls notify_url (webhook) with account_id and name (our user_id).
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  let unipileBase = process.env.UNIPILE_API_URL || "https://api1.unipile.com:13111";
  if (!unipileBase.startsWith("http")) {
    unipileBase = `https://${unipileBase}`;
  }
  const notifyUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/unipile`;
  const successUrl = `${baseUrl.replace(/\/$/, "")}/linkedin?connected=1`;
  const failureUrl = `${baseUrl.replace(/\/$/, "")}/linkedin?connected=0`;

  const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const body = {
    type: "create",
    providers: ["LINKEDIN"],
    name: ctx.userId,
    notify_url: notifyUrl,
    api_url: unipileBase,
    expiresOn,
    success_redirect_url: successUrl,
    failure_redirect_url: failureUrl,
  };

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
      throw Errors.internal("Unipile n'a pas renvoyé d'URL d'authentification");
    }
    return { url };
  } catch (err) {
    if (err instanceof UnipileApiError) {
      throw Errors.internal(err.message);
    }
    const message = err instanceof Error ? err.message : "Unipile API error";
    if (message.includes("UNIPILE_API_KEY")) {
      throw Errors.internal(
        "Unipile n'est pas configuré. Définissez UNIPILE_API_KEY."
      );
    }
    throw Errors.internal(message);
  }
});
