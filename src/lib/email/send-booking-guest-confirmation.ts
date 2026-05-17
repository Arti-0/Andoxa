import { Resend } from "resend";
import { BookingGuestConfirmationEmail } from "@/emails/BookingGuestConfirmationEmail";

/**
 * E-mail de confirmation au visiteur après une réservation via le lien public.
 * Requiert RESEND_API_KEY et RESEND_FROM_EMAIL ; sinon retourne false (sans lever).
 */
export async function sendBookingGuestConfirmationEmail(params: {
  to: string;
  hostName: string;
  slotStartIso: string;
  slotEndIso: string;
  meetUrl: string | null;
  /** Optional text/calendar part (UTF-8) — attached as `rendez-vous.ics`. */
  icsInvitation?: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.warn("[booking-guest-email] RESEND_API_KEY ou RESEND_FROM_EMAIL manquant — e-mail non envoyé");
    return false;
  }

  const start = new Date(params.slotStartIso);
  const end = new Date(params.slotEndIso);
  const dateLine = start.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLine = `${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  const subject = "Votre rendez-vous est confirmé";

  const resend = new Resend(apiKey);
  const icsTrimmed = params.icsInvitation?.trim();
  const attachments =
    icsTrimmed && icsTrimmed.length > 0
      ? [
          {
            filename: "rendez-vous.ics",
            content: Buffer.from(icsTrimmed, "utf-8"),
          },
        ]
      : undefined;

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    react: BookingGuestConfirmationEmail({
      hostName: params.hostName,
      dateLine,
      timeLine,
      meetUrl: params.meetUrl,
    }),
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    console.error("[booking-guest-email] Resend error:", error.message);
    return false;
  }
  return true;
}
