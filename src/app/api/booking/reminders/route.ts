import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { unipileFetch } from "@/lib/unipile/client";

/**
 * POST /api/booking/reminders
 * Cron-triggered: sends WhatsApp reminders for bookings scheduled in the next 60-90 minutes.
 * 
 * Security: should be called by a Vercel cron or with CRON_SECRET header.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();

  const now = new Date();
  const from = new Date(now.getTime() + 60 * 60 * 1000);
  const to = new Date(now.getTime() + 90 * 60 * 1000);

  const { data: bookings, error: bookingsError } = await supabase
    .from("quick_bookings")
    .select("id, prospect_id, organization_id, booked_by, scheduled_for, notes")
    .gte("scheduled_for", from.toISOString())
    .lte("scheduled_for", to.toISOString());

  if (bookingsError || !bookings?.length) {
    return NextResponse.json({ sent: 0, message: "No upcoming bookings" });
  }

  const prospectIds = [...new Set(bookings.map((b) => b.prospect_id))];
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, phone, organization_id")
    .in("id", prospectIds);

  const prospectMap = new Map((prospects ?? []).map((p) => [p.id, p]));

  const orgIds = [...new Set(bookings.map((b) => b.organization_id))];
  const { data: templates } = await supabase
    .from("message_templates")
    .select("organization_id, content")
    .eq("channel", "whatsapp")
    .eq("is_default", true)
    .in("organization_id", orgIds);

  const templateMap = new Map((templates ?? []).map((t) => [t.organization_id, t.content]));

  const bookerIds = [...new Set(bookings.map((b) => b.booked_by))];
  const { data: whatsappAccounts } = await supabase
    .from("user_unipile_accounts")
    .select("user_id, unipile_account_id")
    .eq("account_type", "WHATSAPP")
    .in("user_id", bookerIds);

  const accountMap = new Map((whatsappAccounts ?? []).map((a) => [a.user_id, a.unipile_account_id]));

  let sent = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    const prospect = prospectMap.get(booking.prospect_id);
    if (!prospect?.phone) continue;

    const accountId = accountMap.get(booking.booked_by);
    if (!accountId) continue;

    const template =
      templateMap.get(booking.organization_id) ??
      "Bonjour {{name}}, ceci est un rappel pour votre rendez-vous prévu le {{date}} à {{time}}. À bientôt !";

    const scheduledDate = new Date(booking.scheduled_for!);
    const message = template
      .replace(/\{\{name\}\}/g, prospect.full_name ?? "")
      .replace(/\{\{date\}\}/g, scheduledDate.toLocaleDateString("fr-FR"))
      .replace(/\{\{time\}\}/g, scheduledDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));

    try {
      await unipileFetch("/chats", {
        method: "POST",
        body: JSON.stringify({
          account_id: accountId,
          attendees_ids: [prospect.phone],
          text: message,
        }),
      });
      sent++;
    } catch (err) {
      errors.push(`${prospect.full_name ?? prospect.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors: errors.slice(0, 10) });
}
