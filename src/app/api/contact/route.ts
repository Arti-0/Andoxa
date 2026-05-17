import { NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * POST /api/contact
 *
 * Receives the marketing-site contact form (`@/components/marketing/contact-form`)
 * and forwards it to the team mailbox via Resend.
 *
 * Required env (already used elsewhere in the app):
 *   - RESEND_API_KEY
 *   - RESEND_FROM_EMAIL  (a verified domain address)
 * Optional:
 *   - CONTACT_TO_EMAIL   (defaults to "contact@andoxa.fr")
 */

export const runtime = "nodejs";

type Body = {
  topic?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  message?: string;
};

const TOPIC_LABEL: Record<string, string> = {
  sales: "Acheter Andoxa",
  demo: "Réserver une démo",
  support: "Support technique",
  partnership: "Partenariat",
  press: "Presse",
  other: "Autre",
};

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const company = body.company?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const topic = (body.topic ?? "sales").trim();

  if (firstName.length < 1 || lastName.length < 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 5) {
    return NextResponse.json({ error: "Champs requis manquants ou invalides." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.error("[contact] RESEND_API_KEY or RESEND_FROM_EMAIL is not configured");
    return NextResponse.json({ error: "Service email non configuré." }, { status: 500 });
  }
  const to = process.env.CONTACT_TO_EMAIL?.trim() || "contact@andoxa.fr";

  const topicLabel = TOPIC_LABEL[topic] ?? topic;
  const fullName = `${firstName} ${lastName}`.trim();
  const subject = `[Contact site] ${topicLabel} — ${fullName}`;

  const text = [
    `Sujet : ${topicLabel}`,
    `Nom : ${fullName}`,
    `Email : ${email}`,
    company ? `Entreprise : ${company}` : null,
    "",
    "Message :",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Geist,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b">
      <h2 style="margin:0 0 12px;font-size:16px">Nouveau message du site andoxa.fr</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:4px 12px 4px 0;color:#71717a">Sujet</td><td><strong>${escape(topicLabel)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#71717a">Nom</td><td>${escape(fullName)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#71717a">Email</td><td><a href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
        ${company ? `<tr><td style="padding:4px 12px 4px 0;color:#71717a">Entreprise</td><td>${escape(company)}</td></tr>` : ""}
      </table>
      <div style="white-space:pre-wrap;border-left:3px solid #0052D9;padding-left:12px;color:#27272a">${escape(message)}</div>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject,
      text,
      html,
    });
    if (error) {
      console.error("[contact] resend error", error);
      return NextResponse.json({ error: "Envoi impossible." }, { status: 502 });
    }
  } catch (e) {
    console.error("[contact] resend exception", e);
    return NextResponse.json({ error: "Envoi impossible." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
