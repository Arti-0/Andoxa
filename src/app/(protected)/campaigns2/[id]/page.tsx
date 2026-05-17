import { redirect } from "next/navigation";

/** @deprecated Prefer `/campaigns/[id]`. Permanent redirect configured in next.config.ts. */
export default async function LegacyCampaign2DetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/campaigns/${id}`);
}
