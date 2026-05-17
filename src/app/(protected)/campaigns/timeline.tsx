"use client";

import { useRouter } from "next/navigation";
import { Linkedin, MessageCircle, Phone } from "lucide-react";
import { CHANNEL_META, formatRelativeDate, type Item } from "./data";
import { ChannelPill, StatusBadge, TypeBadge } from "./primitives";

function getDayBucket(iso: string | null): "today" | "yesterday" | "thisWeek" | "older" {
  if (!iso) return "older";
  const d = new Date(iso);
  const now = new Date("2026-05-06T12:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (d >= today) return "today";
  if (d >= yest) return "yesterday";
  if (d >= weekAgo) return "thisWeek";
  return "older";
}

const BUCKET_LABELS = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  thisWeek: "Cette semaine",
  older: "Plus ancien",
} as const;

function TimelineRow({ item }: { item: Item }) {
  const router = useRouter();
  const isCampaign = item.kind === "campaign";
  const ch = CHANNEL_META[item.channel];
  const Icon = item.channel === "linkedin" ? Linkedin : item.channel === "whatsapp" ? MessageCircle : Phone;
  const date = isCampaign ? item.launchedAt : item.date;

  const handleClick = () => {
    if (isCampaign) router.push(`/campaigns/${item.id}`);
    else router.push(`/campaigns/sessions/${item.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="grid cursor-pointer items-center gap-3.5 rounded-md px-3.5 py-2.5 hover:bg-muted/40"
      style={{ gridTemplateColumns: "36px 1fr 140px 140px 110px" }}
    >
      <div
        className="flex size-8 items-center justify-center rounded-lg"
        style={{ background: `${ch.color}20`, color: ch.color }}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium">{item.name}</span>
          {isCampaign ? <TypeBadge type={item.type} /> : null}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
          {isCampaign
            ? `${item.processed}/${item.total} traités · ${item.meetings} RDV`
            : `${item.processed}/${item.total} appels · ${item.meetings} RDV`}
          {" · "}
          {item.creatorName}
        </div>
      </div>
      <div>
        <ChannelPill channel={item.channel} />
      </div>
      <div>
        <StatusBadge status={item.status} />
      </div>
      <div className="text-[12.5px] text-muted-foreground">{formatRelativeDate(date)}</div>
    </div>
  );
}

export function Timeline({ items }: { items: Item[] }) {
  const buckets: Record<keyof typeof BUCKET_LABELS, Item[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };
  items.forEach((it) => {
    const date = it.kind === "campaign" ? it.launchedAt : it.date;
    buckets[getDayBucket(date)].push(it);
  });
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {(Object.keys(buckets) as (keyof typeof BUCKET_LABELS)[]).map((bucket) => {
        if (buckets[bucket].length === 0) return null;
        return (
          <div key={bucket}>
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3.5 py-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {BUCKET_LABELS[bucket]}
              <span className="font-medium opacity-70">· {buckets[bucket].length}</span>
            </div>
            <div className="p-1.5">
              {buckets[bucket].map((it) => (
                <TimelineRow key={`${it.kind}-${it.id}`} item={it} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
