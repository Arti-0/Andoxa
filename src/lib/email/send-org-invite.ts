import { Resend } from "resend";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`${name} is required to send organization invites`);
  }
  return v;
}

function buildInviteEmailHtml(params: {
  inviteUrl: string;
  organizationName: string;
}): string {
  const { inviteUrl, organizationName } = params;
  const safeOrg = organizationName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation — Andoxa</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;">
    Rejoignez ${safeOrg} sur Andoxa.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:40px 36px;">
              <h1 style="margin:0 0 12px 0;font-family:system-ui,sans-serif;font-size:22px;font-weight:600;color:#0f172a;">
                Invitation à rejoindre l&apos;équipe
              </h1>
              <p style="margin:0 0 24px 0;font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#475569;">
                Vous avez été invité(e) à rejoindre <strong style="color:#0f172a;">${safeOrg}</strong> sur <strong style="color:#0f172a;">Andoxa</strong>.
                Ouvrez le lien ci-dessous pour vous connecter ou créer votre compte avec la même adresse e-mail que celle qui a reçu ce message.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 24px auto;">
                <tr>
                  <td style="border-radius:9999px;background-color:#5e6ad2;">
                    <a href="${inviteUrl.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 32px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9999px;">
                      Accepter l&apos;invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
                <span style="word-break:break-all;color:#4f46e5;">${inviteUrl.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the org invite email via Resend. Requires RESEND_API_KEY and RESEND_FROM_EMAIL (verified domain).
 */
export async function sendOrganizationInviteEmail(params: {
  to: string;
  inviteUrl: string;
  organizationName: string;
}): Promise<void> {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("RESEND_FROM_EMAIL");
  const resend = new Resend(apiKey);
  const subject = `Invitation à rejoindre ${params.organizationName} sur Andoxa`;
  const html = buildInviteEmailHtml({
    inviteUrl: params.inviteUrl,
    organizationName: params.organizationName,
  });
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    html,
  });
  if (error) {
    throw new Error(error.message);
  }
}
