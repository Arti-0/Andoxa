import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { getAccountIdForUser } from "@/lib/unipile/account";
import { UnipileApiError } from "@/lib/unipile/client";
import { sendLinkedInInviteForProspect } from "@/lib/unipile/linkedin-single-invite";

interface ProspectRow {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
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

  const body = await parseBody<{
    prospect_ids: string[];
    message: string;
    message_by_prospect?: Record<string, string>;
  }>(req);
  if (!body?.prospect_ids?.length) {
    throw Errors.validation({ prospect_ids: "Au moins un prospect est requis" });
  }
  const message = (body.message ?? "").trim() || "Bonjour, j'aimerais vous ajouter à mon réseau.";

  const { data: prospects } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, company, job_title, phone, email, linkedin")
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

  const byProspect = body.message_by_prospect ?? {};

  for (const p of prospects as ProspectRow[]) {
    try {
      const override = byProspect[p.id]?.trim() || null;
      await sendLinkedInInviteForProspect(ctx, p, accountId, message, override);
      successCount++;
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
    } catch (err) {
      const slugHint = p.linkedin ?? p.id;
      const msg = err instanceof UnipileApiError ? err.message : String(err);
      errors.push(`${p.full_name ?? slugHint}: ${msg}`);
    }
  }

  return { success_count: successCount, errors: errors.slice(0, 10) };
}, { rateLimit: { name: "campaigns", requests: 5, window: "1 m" } });
