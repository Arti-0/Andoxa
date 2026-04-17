import { Resend } from "resend";
import { BookingOwnerConfirmationEmail } from "@/emails/BookingOwnerConfirmationEmail";

/**
 * Envoie l'e-mail de confirmation au propriétaire du lien de réservation.
 * Requiert RESEND_API_KEY et RESEND_FROM_EMAIL ; sinon retourne false (sans lever).
 */
export async function sendBookingOwnerConfirmationEmail(params: {
  to: string;
  guestName: string;
  guestEmail: string;
  guestLinkedin: string | null;
  guestPhone: string | null;
  slotStartIso: string;
  slotEndIso: string;
  meetUrl: string | null;
  crmProspectUrl: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.warn("[booking-email] RESEND_API_KEY ou RESEND_FROM_EMAIL manquant — e-mail non envoyé");
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

  const subject = `Nouveau rendez-vous — ${params.guestName}, ${start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    react: BookingOwnerConfirmationEmail({
      guestName: params.guestName,
      guestEmail: params.guestEmail,
      guestLinkedin: params.guestLinkedin,
      guestPhone: params.guestPhone,
      dateLine,
      timeLine,
      meetUrl: params.meetUrl,
      crmProspectUrl: params.crmProspectUrl,
    }),
  });

  if (error) {
    console.error("[booking-email] Resend error:", error.message);
    return false;
  }
  return true;
}
