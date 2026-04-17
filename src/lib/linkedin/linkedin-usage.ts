export type LinkedInUsagePayload = {
  invitations_sent: number;
  invitations_workflow: number;
  invitations_direct: number;
  messages_sent: number;
  profile_views: number;
  invitations_week: number;
};

export async function fetchLinkedInUsage(): Promise<LinkedInUsagePayload> {
  const res = await fetch("/api/dashboard/linkedin-usage", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch LinkedIn usage");
  const json = await res.json();
  return (json.data ?? json) as LinkedInUsagePayload;
}
