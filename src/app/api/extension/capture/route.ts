/**
 * POST /api/extension/capture
 *
 * Unified capture endpoint for the browser extensions. The extension hands
 * over the active tab URL (or a pasted URL); the server detects whether it
 * is a regular profile or a Sales Navigator list, calls Unipile, and streams
 * results back as Server-Sent Events:
 *
 *   event: meta   { kind, listName?, estimatedTotal? }
 *   event: batch  { prospects: [...], cursor, fetched }
 *   event: done   { total }
 *   event: error  { message }
 *
 * The extension consumes the stream and POSTs prospects through the existing
 * /api/prospects/import route — this endpoint is purely a Unipile reader.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import type { Database } from "@/lib/types/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLinkedInAccountIdForUserId } from "@/lib/unipile/account";
import {
  UnipileApiError,
  UnipileRateLimitError,
} from "@/lib/unipile/client";
import { inferLinkedInAccountTier } from "@/lib/linkedin/tier";
import {
  fetchLinkedInProfile,
  type ExtensionProspectPayload,
} from "@/lib/unipile/linkedin-profile";
import {
  extractLSNListId,
  fetchLSNListMembers,
} from "@/lib/unipile/linkedin-sales-nav";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";

export const runtime = "nodejs";
// Streaming a Sales Nav list with thousands of members can take minutes.
// Allow up to the Vercel function ceiling so we don't truncate mid-import.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

type CaptureContext = "profile" | "lsn_list";

interface CaptureBody {
  url?: string;
  context?: CaptureContext;
}

function detectContext(url: string): CaptureContext | null {
  if (extractLSNListId(url)) return "lsn_list";
  if (extractLinkedInSlug(url)) return "profile";
  return null;
}

function getBearer(req: NextRequest): string | null {
  const h =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function errorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: "CAPTURE_ERROR", message },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  const token = getBearer(req);
  if (!token) {
    return errorResponse(
      401,
      "Jeton d'authentification manquant. Reconnectez l'extension Andoxa."
    );
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: authData, error: authError } = await supabase.auth.getUser(
    token
  );
  if (authError || !authData?.user) {
    return errorResponse(
      401,
      "Session invalide ou expirée. Reconnectez l'extension Andoxa."
    );
  }
  const userId = authData.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", userId)
    .single();
  const workspaceId = profile?.active_organization_id ?? null;
  if (!workspaceId) return errorResponse(400, "Workspace required");

  let body: CaptureBody;
  try {
    body = (await req.json()) as CaptureBody;
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const url = body.url?.trim() ?? "";
  if (!url) return errorResponse(400, "url requis");

  const detected = detectContext(url);
  if (!detected) {
    return errorResponse(
      400,
      "URL non supportée. Ouvrez un profil LinkedIn ou une liste Sales Navigator standard."
    );
  }
  // body.context is advisory; the server detection wins.
  const context = detected;

  const rlName =
    context === "lsn_list"
      ? "extension-capture-list"
      : "extension-capture-profile";
  const rlRequests = context === "lsn_list" ? 1 : 60;
  const rl = await checkRateLimit(workspaceId, rlName, rlRequests, "1 m");
  if (rl && !rl.success) {
    return errorResponse(
      429,
      context === "lsn_list"
        ? "Une importation de liste est déjà en cours. Patientez une minute."
        : "Trop de captures. Réessayez dans une minute."
    );
  }

  const unipileAccountId = await getLinkedInAccountIdForUserId(
    supabase,
    userId
  );
  if (!unipileAccountId) {
    return errorResponse(
      400,
      "Connectez votre compte LinkedIn depuis la page Installation pour activer la capture."
    );
  }

  // Sales Navigator preflight — refuse early with a clear message instead of
  // letting Unipile reject with "feature has either not been subscribed".
  if (context === "lsn_list") {
    const { data: acct } = await supabase
      .from("user_unipile_accounts")
      .select("is_premium, premium_features")
      .eq("user_id", userId)
      .eq("account_type", "LINKEDIN")
      .maybeSingle();
    const tier = inferLinkedInAccountTier(
      acct?.is_premium ?? null,
      Array.isArray(acct?.premium_features)
        ? (acct?.premium_features as string[])
        : null
    );
    if (tier !== "sales_navigator") {
      return errorResponse(
        403,
        "Sales Navigator non détecté sur votre compte LinkedIn connecté. Connectez un compte Sales Navigator depuis Réglages → LinkedIn, puis réessayez."
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          // Stream already closed (client aborted) — swallow.
        }
      };
      const close = () => {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      try {
        if (context === "profile") {
          push("meta", { kind: "profile" });
          const prospect = await fetchLinkedInProfile(unipileAccountId, url);
          if (!prospect) {
            push("error", { message: "Profil LinkedIn introuvable." });
            close();
            return;
          }
          push("batch", { prospects: [prospect], cursor: null, fetched: 1 });
          push("done", { total: 1 });
          close();
          return;
        }

        // lsn_list path: stream pages of POST /linkedin/search results until
        // the cursor is null or the client aborts.
        const listId = extractLSNListId(url)!;
        let cursor: string | null = null;
        let fetched = 0;
        let safetyPages = 0;
        let metaSent = false;
        // 50 results per page (Unipile limit). 4000 pages = 200k contacts.
        const MAX_PAGES = 4000;

        do {
          const page: Awaited<ReturnType<typeof fetchLSNListMembers>> =
            await fetchLSNListMembers(unipileAccountId, url, cursor);

          if (!metaSent) {
            push("meta", {
              kind: "lsn_list",
              listId,
              listName: null,
              estimatedTotal: page.estimatedTotal,
            });
            metaSent = true;
          }

          fetched += page.members.length;
          push("batch", {
            prospects: page.members as ExtensionProspectPayload[],
            cursor: page.nextCursor,
            fetched,
          });

          cursor = page.nextCursor;
          safetyPages += 1;

          if (req.signal.aborted) {
            push("done", { total: fetched, aborted: true });
            close();
            return;
          }
        } while (cursor && safetyPages < MAX_PAGES);

        if (!metaSent) {
          // Empty list: still emit a meta so the client UI gets a snapshot.
          push("meta", {
            kind: "lsn_list",
            listId,
            listName: null,
            estimatedTotal: 0,
          });
        }

        push("done", { total: fetched });
        close();
      } catch (e) {
        Sentry.captureException(e);
        let message: string;
        if (e instanceof UnipileRateLimitError) {
          message =
            "LinkedIn limite temporairement les requêtes. Réessayez dans quelques minutes.";
        } else if (e instanceof UnipileApiError) {
          const raw = e.message ?? "";
          const looksLikeSalesNavGated =
            /not\s+been\s+subscribed|not\s+been\s+authenticated|feature.*subscrib/i.test(
              raw
            ) || e.unipileType === "errors/insufficient_permissions";
          if (context === "lsn_list" && looksLikeSalesNavGated) {
            message =
              "Le service de messagerie ne peut pas accéder à Sales Navigator pour ce compte. Vérifiez que l'abonnement Sales Navigator est actif sur votre compte LinkedIn, puis reconnectez-le depuis Réglages → LinkedIn.";
          } else {
            message = raw || "Erreur du service de messagerie.";
          }
        } else {
          message = "Erreur lors de la capture.";
        }
        push("error", { message });
        close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
