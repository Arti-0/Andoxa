import { redirect } from "next/navigation";

/** @deprecated Prefer `/campaigns/sessions/[sessionId]`. Permanent redirect configured in next.config.ts. */
export default async function LegacyCallSessionRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/campaigns/sessions/${id}`);
}
