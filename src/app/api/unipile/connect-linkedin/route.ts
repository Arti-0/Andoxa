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
/** Whitelist of in-app paths the caller may request as the post-connect landing. */
const ALLOWED_REDIRECT_PATHS = new Set(["/onboarding", "/settings"]);

function resolveRedirectBase(raw: unknown): string {
  if (typeof raw !== "string") return "/onboarding";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return "/onboarding";
  // Strip query / hash before comparing — the caller may pass `/settings?tab=integrations`.
  const path = trimmed.split(/[?#]/)[0] ?? "";
  return ALLOWED_REDIRECT_PATHS.has(path) ? trimmed : "/onboarding";
}

export const POST = createApiHandler(
  async (req, ctx) => {
    if (!ctx.userId) throw Errors.badRequest("Authentication required");

    const { data: existingAccount } = await ctx.supabase
      .from("user_unipile_accounts")
      .select("unipile_account_id")
      .eq("user_id", ctx.userId)
      .eq("account_type", "LINKEDIN")
      .maybeSingle();

    // Caller-supplied redirect: a user reconnecting from /settings should land
    // back there, not be punted into /onboarding. Validated against a small
    // allowlist to keep this from becoming an open-redirect surface.
    let redirectBase = "/onboarding";
    try {
      const json = (await req.clone().json().catch(() => null)) as
        | { redirect?: string }
        | null;
      if (json?.redirect) {
        redirectBase = resolveRedirectBase(json.redirect);
      }
    } catch {
      /* body optional */
    }

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

    const cleanBase = baseUrl.replace(/\/$/, "");
    const sep = redirectBase.includes("?") ? "&" : "?";
    const notifyUrl = `${cleanBase}/api/webhooks/unipile`;
    const successUrl = `${cleanBase}${redirectBase}${sep}linkedin_connected=1`;
    const failureUrl = `${cleanBase}${redirectBase}${sep}linkedin_connected=0`;
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
        const type = err.unipileType ?? "";
        // `errors/missing_credentials` on /hosted/accounts/link does NOT mean
        // the user's LinkedIn session is bad — at this point the user has no
        // session yet, that's why they're connecting. It means Unipile
        // rejected the SERVER's UNIPILE_API_KEY (wrong, expired, or not
        // entitled for the requested provider). Surface a clear admin-flavored
        // message instead of the generic "Compte non connecté" so the user
        // doesn't think their LinkedIn is broken.
        if (type === "errors/missing_credentials" || err.message === "Compte non connecté") {
          throw Errors.badRequest(
            "Le service de messagerie n'a pas pu valider la clé d'accès serveur (UNIPILE_API_KEY). " +
              "Vérifiez que la clé est correcte et non expirée, redémarrez l'application après modification, " +
              "puis réessayez « Connecter LinkedIn ».",
            { unipileType: type }
          );
        }
        throw Errors.badRequest(err.message, { unipileType: type });
      }
      throw Errors.internal(
        err instanceof Error ? err.message : "Erreur de connexion"
      );
    }
  },
  { requireWorkspace: false }
);
