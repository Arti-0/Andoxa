"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";
import { fetchLinkedInUsage } from "@/lib/linkedin/linkedin-usage";
import { getLinkedInInviteWeeklyUsageCap } from "@/lib/linkedin/limits";
import { DAILY_QUOTAS, getQuotaBarColor } from "@/lib/linkedin/quotas";

function UsageRow({
  label,
  used,
  quota,
  index,
  reduceMotion,
  footnote,
}: {
  label: string;
  used: number;
  quota: number;
  index: number;
  reduceMotion: boolean;
  footnote?: ReactNode;
}) {
  const pct = quota > 0 ? (used / quota) * 100 : 0;
  const widthPct = Math.min(pct, 100);
  const colorClass = getQuotaBarColor(used, quota);
  const stagger = index * 0.1;
  const barDuration = reduceMotion ? 0 : 0.6;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <motion.span
          className="shrink-0 tabular-nums text-muted-foreground"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.35, delay: 0.7 + stagger, ease: "easeOut" }
          }
        >
          {used} / {quota}
        </motion.span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={reduceMotion ? { width: `${widthPct}%` } : { width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: barDuration, ease: "easeOut", delay: stagger }
          }
        />
      </div>
      {footnote ? <div className="text-xs text-muted-foreground">{footnote}</div> : null}
    </div>
  );
}

interface UsageQuotasProps {
  workspaceId: string | null | undefined;
}

export type { LinkedInUsagePayload } from "@/lib/linkedin/linkedin-usage";

export function UsageQuotas({ workspaceId }: UsageQuotasProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const { data: linkedIn, isLoading: linkedInLoading } = useLinkedInAccount();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["dashboard-linkedin-usage", workspaceId],
    queryFn: fetchLinkedInUsage,
    enabled: !!workspaceId && !!linkedIn?.connected,
    staleTime: 60 * 1000,
  });

  if (linkedInLoading) {
    return null;
  }

  if (!linkedIn?.connected) {
    return null;
  }

  if (!workspaceId) {
    return null;
  }

  if (usageLoading || !usage) {
    return (
      <div
        className="rounded-xl border bg-card p-5 shadow-xs"
        aria-busy="true"
        aria-label="Chargement de l’activité LinkedIn"
      >
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-14 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const weeklyCap = getLinkedInInviteWeeklyUsageCap(linkedIn.linkedin_is_premium);
  const weeklyNote = (
    <>
      {usage.invitations_week} / {weeklyCap} cette semaine
    </>
  );

  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">
        Activité LinkedIn aujourd&apos;hui
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Quotas indicatifs (UTC). Les vues de profil ne sont pas encore suivies.
      </p>
      <div className="mt-6 space-y-6">
        <UsageRow
          label="Invitations"
          used={usage.invitations_sent}
          quota={DAILY_QUOTAS.invitations}
          index={0}
          reduceMotion={reduceMotion}
          footnote={weeklyNote}
        />
        <UsageRow
          label="Messages"
          used={usage.messages_sent}
          quota={DAILY_QUOTAS.messages}
          index={1}
          reduceMotion={reduceMotion}
        />
        <UsageRow
          label="Vues profil"
          used={usage.profile_views}
          quota={DAILY_QUOTAS.profile_views}
          index={2}
          reduceMotion={reduceMotion}
        />
      </div>
    </div>
  );
}
