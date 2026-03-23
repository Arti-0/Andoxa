"use client";

import { type LucideIcon, CheckCircle, AlertTriangle, Circle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type ActivityFeedItemStatus = "success" | "warning" | "default";

export interface ActivityFeedItem {
  id?: string;
  name: string;
  action: string;
  time: string;
  status?: ActivityFeedItemStatus;
  href?: string;
  actorName?: string | null;
  actorAvatar?: string | null;
}

export interface ActivityFeedProps {
  title?: string;
  icon?: LucideIcon;
  items: ActivityFeedItem[];
  className?: string;
  emptyMessage?: string;
}

const statusIconConfig: Record<
  ActivityFeedItemStatus,
  { Icon: LucideIcon; box: string }
> = {
  success: {
    Icon: CheckCircle,
    box: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    Icon: AlertTriangle,
    box: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  default: {
    Icon: Circle,
    box: "bg-slate-400/15 text-slate-600 dark:text-slate-400",
  },
};

function ActivityFeedItemRow({
  name,
  action,
  time,
  status = "default",
  href,
  actorName,
  actorAvatar,
}: ActivityFeedItem) {
  const iconCfg = statusIconConfig[status];
  const StatusIcon = iconCfg.Icon;
  const content = (
    <>
      {actorName ? (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={actorAvatar ?? undefined} alt={actorName} />
          <AvatarFallback className="bg-muted text-[10px]">
            {actorName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            iconCfg.box
          )}
        >
          <StatusIcon className="h-4 w-4" aria-hidden />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{action}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
    </>
  );

  const wrapperClass =
    "flex items-center gap-3 py-2.5 hover:bg-muted/30 transition-colors";
  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {content}
      </Link>
    );
  }
  return <div className={wrapperClass}>{content}</div>;
}

export function ActivityFeed({
  title = "Activité récente",
  icon: Icon,
  items,
  className,
  emptyMessage = "Aucune activité récente",
}: ActivityFeedProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="divide-y">
          {items.map((item, i) => (
            <ActivityFeedItemRow
              key={item.id ?? i}
              name={item.name}
              action={item.action}
              time={item.time}
              status={item.status}
              href={item.href}
              actorName={item.actorName}
              actorAvatar={item.actorAvatar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
