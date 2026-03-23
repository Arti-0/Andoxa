import { createApiHandler, Errors } from "@/lib/api";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";

/**
 * GET /api/unipile/linkedin/recruiter/projects
 * Proxies Unipile LinkedIn Recruiter hiring projects (requires Recruiter/LSN-capable account).
 * @see https://developer.unipile.com/reference/linkedincontroller_gethiringprojects
 */
export const GET = createApiHandler(async (_req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const accountId = await getAccountIdForUser(ctx);

  try {
    const data = await unipileFetch<unknown>(
      `/linkedin/projects?account_id=${encodeURIComponent(accountId)}`
    );
    return { projects: data };
  } catch (err) {
    if (err instanceof UnipileApiError) {
      if (err.status === 403 || err.status === 404) {
        throw Errors.badRequest(
          "Ce compte LinkedIn ne semble pas avoir accès à LinkedIn Recruiter via Unipile, ou la fonctionnalité n'est pas activée."
        );
      }
      throw Errors.badRequest(err.message);
    }
    throw Errors.internal("Erreur Unipile");
  }
});
