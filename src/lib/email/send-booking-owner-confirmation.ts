import { Resend } from "resend";
import { BookingOwnerConfirmationEmail } from "@/emails/BookingOwnerConfirmationEmail";

/**
 * Envoie l'e-mail de confirmation au propriétaire du lien de réservation.
 * Requiert RESEND_API_KEY et RESEND_FROM_EMAIL ; sinon retourne false (sans lever).
 */
export async function sendBookingOwnerConfirmationEmail(params: {
  to: string;
  guestName: string;
  guestEmail: string | null;
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
  // Vercel server runs UTC; force Europe/Paris so the host sees the same
  // wall-clock time they confirmed in the calendar. See guest email for ctx.
  const PARIS_TZ = "Europe/Paris" as const;
  const dateLine = start.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: PARIS_TZ,
  });
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PARIS_TZ,
  };
  const timeLine = `${start.toLocaleTimeString("fr-FR", timeOpts)} – ${end.toLocaleTimeString("fr-FR", timeOpts)}`;

  const subject = `Nouveau rendez-vous — ${params.guestName}, ${start.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: PARIS_TZ })} à ${start.toLocaleTimeString("fr-FR", timeOpts)}`;

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
