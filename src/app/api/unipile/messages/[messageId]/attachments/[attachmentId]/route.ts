import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUnipileHeaders } from "@/lib/unipile/client";

const UNIPILE_BASE =
  process.env.UNIPILE_API_URL || "https://api1.unipile.com:13111";
const UNIPILE_API_PATH = "/api/v1";

/**
 * GET /api/unipile/messages/[messageId]/attachments/[attachmentId]
 * Proxy attachment download from Unipile.
 * Requires auth and connected Unipile account.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ messageId: string; attachmentId: string }> }
) {
  const params = await context.params;
  const messageId = params?.messageId;
  const attachmentId = params?.attachmentId;

  if (!messageId || !attachmentId) {
    return NextResponse.json(
      { error: "messageId and attachmentId required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("user_unipile_accounts")
    .select("unipile_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account?.unipile_account_id) {
    return NextResponse.json(
      { error: "Connectez votre compte LinkedIn via Unipile" },
      { status: 403 }
    );
  }

  const base = UNIPILE_BASE.replace(/\/$/, "");
  const accountId = account.unipile_account_id;
  const url = `${base}${UNIPILE_API_PATH}/messages/${messageId}/attachments/${attachmentId}?account_id=${encodeURIComponent(accountId)}`;

  try {
    const headers = getUnipileHeaders();
    const res = await fetch(url, {
      headers: { "X-API-KEY": headers["X-API-KEY"] },
    });

    if (!res.ok) {
      const text = await res.text();
      let detail = "Erreur Unipile";
      try {
        const parsed = JSON.parse(text) as { detail?: string; title?: string };
        detail = parsed.detail ?? parsed.title ?? detail;
      } catch {
        detail = text || "Pièce jointe introuvable.";
      }
      if (res.status === 404) {
        detail = "Cette pièce jointe n'est pas disponible au téléchargement (LinkedIn peut limiter l'accès à certains fichiers).";
      }
      return NextResponse.json({ error: detail }, { status: res.status });
    }

    const contentType =
      res.headers.get("Content-Type") || "application/octet-stream";
    const contentDisposition =
      res.headers.get("Content-Disposition") || "attachment";

    const blob = await res.blob();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (err) {
    console.error("[API] Attachment fetch error:", err);
    return NextResponse.json(
      { error: "Erreur lors du téléchargement" },
      { status: 500 }
    );
  }
}
