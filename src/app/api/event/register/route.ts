import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppMessage } from "@/lib/unipile/campaign";
import { normalizePhoneForWhatsApp } from "@/lib/utils/phone";
import { withRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { captureRouteError } from "@/lib/sentry/route-error";

/**
 * POST /api/event/register
 * Public lead capture for the pitch event QR code.
 *
 * Required env:
 * - CONFERENCE_ORG_ID                Organization that owns these leads
 * - CONFERENCE_OWNER_USER_ID         User id used as prospects.user_id
 * - CONFERENCE_WHATSAPP_ACCOUNT_ID   Unipile account_id of the sending WA box
 *
 * Optional env:
 * - CONFERENCE_BDD_ID                Attach prospects to this list
 * - CONFERENCE_NAME                  Slugified into tags + shown in copy
 * - CONFERENCE_WHATSAPP_MESSAGE      Override the default thank-you. {{name}}, {{first_name}}.
 * - CONFERENCE_WHATSAPP_HOURLY_CAP   Default 30. Hard cap on WA sends per hour to stay below WhatsApp spam thresholds.
 * - CONFERENCE_DISABLE_RATE_LIMIT    Set to "true" to skip IP + WhatsApp caps (local testing / staging).
 * - TURNSTILE_SECRET_KEY             If set, validates the Cloudflare Turnstile token. If empty, captcha is skipped.
 */
const DEFAULT_THANK_YOU =
  "Bonjour {{first_name}}, merci d'être venu·e au pitch ce soir ! Votre tarif inaugural à vie est réservé. On revient vers vous dès demain. — Sebastian & Andreas, Andoxa";

function ipFromRequest(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "anon";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function eventRegisterRateLimitsDisabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.CONFERENCE_DISABLE_RATE_LIMIT?.trim().toLowerCase() === "true";
}

async function verifyTurnstile(
  token: string | undefined,
  remoteIp: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true; // captcha not configured → don't block
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp && remoteIp !== "anon") form.set("remoteip", remoteIp);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      }
    );
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
    } | null;
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const route = "api/event/register";
  const remoteIp = ipFromRequest(req);

  // Per-IP throttle: 5 submissions / 10 min (skipped in dev / CONFERENCE_DISABLE_RATE_LIMIT).
  if (!eventRegisterRateLimitsDisabled()) {
    const rl = await withRateLimit(req, `event-register:${remoteIp}`, {
      name: "event-register",
      requests: 5,
      window: "10 m",
    });
    if (rl) return rl;
  }

  const orgId = process.env.CONFERENCE_ORG_ID?.trim();
  const ownerId = process.env.CONFERENCE_OWNER_USER_ID?.trim();
  const waAccountId = process.env.CONFERENCE_WHATSAPP_ACCOUNT_ID?.trim();

  if (!orgId || !ownerId || !waAccountId) {
    const missing: string[] = [];
    if (!orgId) missing.push("CONFERENCE_ORG_ID");
    if (!ownerId) missing.push("CONFERENCE_OWNER_USER_ID");
    if (!waAccountId) missing.push("CONFERENCE_WHATSAPP_ACCOUNT_ID");
    if (process.env.NODE_ENV === "development") {
      console.error("[event/register] Missing env:", missing.join(", "));
    }
    return NextResponse.json(
      {
        success: false,
        error: "Le formulaire n'est pas configuré. Réessayez plus tard.",
        ...(process.env.NODE_ENV === "development" && {
          missingEnv: missing,
        }),
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Requête invalide." },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const whatsappRaw =
    typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  const campaign =
    typeof body.campaign === "string"
      ? body.campaign.trim().slice(0, 64)
      : "launch_inaugural";
  const consent = body.consent === true;
  const turnstileToken =
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
  const honeypot = typeof body.website === "string" ? body.website : "";

  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { success: false, error: "Oups, il manque votre nom." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { success: false, error: "Votre email ne semble pas valide." },
      { status: 400 }
    );
  }
  if (company.length < 1 || company.length > 200) {
    return NextResponse.json(
      { success: false, error: "Et le nom de votre boîte ?" },
      { status: 400 }
    );
  }
  if (!consent) {
    return NextResponse.json(
      { success: false, error: "Merci d'accepter d'être recontacté." },
      { status: 400 }
    );
  }

  let normalizedPhone: string | null = null;
  if (whatsappRaw.length > 0) {
    const digits = normalizePhoneForWhatsApp(whatsappRaw);
    if (!/^\d{10,15}$/.test(digits)) {
      return NextResponse.json(
        { success: false, error: "Le numéro WhatsApp n'a pas l'air valide." },
        { status: 400 }
      );
    }
    normalizedPhone = digits;
  }

  const captchaOk = await verifyTurnstile(turnstileToken, remoteIp);
  if (!captchaOk) {
    return NextResponse.json(
      { success: false, error: "Vérification anti-robot échouée. Réessayez." },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  const tags = ["conference", "pitch_event"];
  const eventName = process.env.CONFERENCE_NAME?.trim();
  if (eventName) tags.push(slugify(eventName));
  if (campaign) tags.push(slugify(campaign));

  const submittedAt = new Date().toISOString();

  const insertPayload = {
    user_id: ownerId,
    organization_id: orgId,
    full_name: name,
    email,
    company,
    phone: normalizedPhone,
    tags,
    source: "inbound",
    status: "new",
    bdd_id: process.env.CONFERENCE_BDD_ID?.trim() || null,
    metadata: {
      conference: {
        event: eventName ?? null,
        campaign,
        submitted_at: submittedAt,
        ip: remoteIp,
        user_agent: req.headers.get("user-agent") ?? null,
      },
      consent: {
        text: "Form submission consent — recontact by Andoxa",
        given_at: submittedAt,
        ip: remoteIp,
      },
    },
  };

  const { data: prospect, error: insertErr } = await service
    .from("prospects")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr || !prospect) {
    captureRouteError(route, insertErr ?? new Error("prospect insert failed"), {
      extra: { stage: "insert_prospect", email },
    });
    return NextResponse.json(
      { success: false, error: "Enregistrement impossible. Réessayez." },
      { status: 500 }
    );
  }

  let sentWhatsApp = false;

  if (normalizedPhone) {
    // Global WA hourly cap — protects the sender number from being flagged
    // as spam by WhatsApp when the QR gets scanned by a crowd.
    const hourlyCap = Number.parseInt(
      process.env.CONFERENCE_WHATSAPP_HOURLY_CAP ?? "30",
      10
    );
    const cap = Number.isFinite(hourlyCap) && hourlyCap > 0 ? hourlyCap : 30;

    const skipWaCaps = eventRegisterRateLimitsDisabled();

    const globalRl = skipWaCaps
      ? null
      : await checkRateLimit("global", "event-wa-global", cap, "1 h");

    // Per-phone 24h cap — same scanner shouldn't get pinged twice if they resubmit.
    const phoneRl = skipWaCaps
      ? null
      : await checkRateLimit(
          `phone:${normalizedPhone}`,
          "event-wa-per-phone",
          1,
          "24 h"
        );

    const globalAllowed = skipWaCaps || (globalRl ? globalRl.success : true);
    const phoneAllowed = skipWaCaps || (phoneRl ? phoneRl.success : true);

    if (globalAllowed && phoneAllowed) {
      const messageTpl =
        process.env.CONFERENCE_WHATSAPP_MESSAGE?.trim() || DEFAULT_THANK_YOU;
      const firstName = name.split(/\s+/)[0] ?? name;
      const text = messageTpl
        .replace(/\{\{name\}\}/gi, name)
        .replace(/\{\{first_name\}\}/gi, firstName);

      try {
        const chatRes = await sendWhatsAppMessage({
          accountId: waAccountId,
          phone: normalizedPhone,
          text,
        });

        const chatId = chatRes?.id;
        if (chatId) {
          await service.from("unipile_chat_prospects").upsert(
            {
              prospect_id: prospect.id,
              unipile_chat_id: chatId,
              organization_id: orgId,
            },
            { onConflict: "prospect_id,unipile_chat_id" }
          );
        }
        sentWhatsApp = true;
      } catch (err) {
        captureRouteError(route, err, {
          extra: {
            stage: "whatsapp_send",
            prospect_id: prospect.id,
            phone_tail: normalizedPhone.slice(-4),
          },
        });
        // Don't fail the request — lead is saved.
      }
    } else {
      captureRouteError(
        route,
        new Error(
          globalAllowed
            ? "WA per-phone cap hit (resubmission)"
            : "WA global hourly cap hit"
        ),
        {
          extra: { stage: "whatsapp_rate_limit", prospect_id: prospect.id },
        },
        "warn"
      );
    }
  }

  return NextResponse.json({ success: true, sentWhatsApp });
}
