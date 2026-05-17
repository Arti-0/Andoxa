import { redirect } from "next/navigation";

/** @deprecated Hub lives at `/campaigns`. Permanent redirect configured in next.config.ts. */
export default function LegacyCampaigns2HubRedirectPage() {
  redirect("/campaigns");
}
