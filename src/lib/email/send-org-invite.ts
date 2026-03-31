import { Resend } from "resend";
import { InviteEmail } from "@/emails/InviteEmail";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`${name} is required to send organization invites`);
  }
  return v;
}

/**
 * Envoie l'e-mail d'invitation org via Resend (un seul message : lien magic Supabase + contexte invite).
 * Requiert RESEND_API_KEY et RESEND_FROM_EMAIL (domaine vérifié).
 */
export async function sendOrganizationInviteEmail(params: {
  to: string;
  confirmUrl: string;
  organizationName: string;
  invitedBy: string;
}): Promise<void> {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("RESEND_FROM_EMAIL");
  const resend = new Resend(apiKey);
  const subject = `${params.invitedBy} vous invite à rejoindre ${params.organizationName} sur Andoxa`;
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    react: InviteEmail({
      confirmUrl: params.confirmUrl,
      orgName: params.organizationName,
      invitedBy: params.invitedBy,
    }),
  });
  if (error) {
    throw new Error(error.message);
  }
}
