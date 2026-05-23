export function buildBookingEventDescription(opts: {
  hostDescription: string;
  guestName: string;
  guestEmail?: string | null;
  guestLinkedin?: string | null;
  guestPhone?: string | null;
  meetUrl?: string | null;
}): string {
  const lines: string[] = [];
  const hostBlock = opts.hostDescription.trim();
  if (hostBlock) {
    lines.push(hostBlock);
    lines.push("");
  }
  lines.push(`Invité : ${opts.guestName}`);
  if (opts.guestEmail) lines.push(`E-mail : ${opts.guestEmail}`);
  if (opts.guestLinkedin) lines.push(`LinkedIn : ${opts.guestLinkedin}`);
  if (opts.guestPhone) lines.push(`Téléphone : ${opts.guestPhone}`);
  if (opts.meetUrl) {
    lines.push("");
    lines.push(`Visioconférence : ${opts.meetUrl}`);
  }
  return lines.join("\n");
}
