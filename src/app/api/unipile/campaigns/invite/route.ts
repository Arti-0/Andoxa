import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError, unipileFetch } from "@/lib/unipile/client";
import { applyMessageVariables, extractLinkedInSlug } from "@/lib/unipile/campaign";

interface ProspectRow {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  linkedin: string | null;
}

/**
 * POST /api/unipile/campaigns/invite
 * Send LinkedIn connection invitations to prospects
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{ prospect_ids: string[]; message: string }>(req);
  if (!body?.prospect_ids?.length) {
    throw Errors.validation({ prospect_ids: "Au moins un prospect est requis" });
  }
  const message = (body.message ?? "").trim() || "Bonjour, j'aimerais vous ajouter à mon réseau.";

  const { data: prospects } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, company, job_title, linkedin")
    .eq("organization_id", ctx.workspaceId)
    .in("id", body.prospect_ids)
    .not("linkedin", "is", null);

  if (!prospects?.length) {
    throw Errors.badRequest(
      "Aucun prospect avec un profil LinkedIn trouvé parmi les sélectionnés"
    );
  }

  const accountId = await getAccountIdForUser(ctx);

  let successCount = 0;
  const errors: string[] = [];

  for (const p of prospects as ProspectRow[]) {
    const slug = extractLinkedInSlug(p.linkedin);
    if (!slug) {
      errors.push(`${p.full_name ?? p.id}: URL LinkedIn invalide`);
      continue;
    }

    try {
      const profileRes = await unipileFetch<{ provider_id?: string }>(
        `/users/${encodeURIComponent(slug)}?account_id=${accountId}`
      );
      const providerId = (profileRes as { provider_id?: string })?.provider_id;
      if (!providerId) {
        errors.push(`${p.full_name ?? slug}: Impossible de résoudre le profil LinkedIn`);
        continue;
      }

      const personalizedMessage = applyMessageVariables(message, p);
      await unipileFetch("/users/invite", {
        method: "POST",
        body: JSON.stringify({
          account_id: accountId,
          provider_id: providerId,
          message: personalizedMessage,
        }),
      });
      successCount++;
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
    } catch (err) {
      const msg = err instanceof UnipileApiError ? err.message : String(err);
      errors.push(`${p.full_name ?? slug}: ${msg}`);
    }
  }

  return { success_count: successCount, errors: errors.slice(0, 10) };
});
