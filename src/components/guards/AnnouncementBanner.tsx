"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertCircle, Wrench } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "maintenance";
}

const TYPE_STYLES: Record<
  Announcement["type"],
  { bg: string; icon: typeof Info }
> = {
  info: { bg: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200", icon: Info },
  warning: { bg: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200", icon: AlertTriangle },
  error: { bg: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200", icon: AlertCircle },
  maintenance: { bg: "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200", icon: Wrench },
};

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem("dismissed_announcements");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissAnnouncement(id: string) {
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem(
    "dismissed_announcements",
    JSON.stringify([...dismissed])
  );
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(getDismissedIds());

    fetch("/api/announcements", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data?.announcements) {
          setAnnouncements(data.data.announcements);
        }
      })
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-0">
      {visible.map((a) => {
        const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.info;
        const Icon = style.icon;

        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm ${style.bg}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{a.title}</span>
              {a.message && (
                <span className="ml-1.5 opacity-80">{a.message}</span>
              )}
            </div>
            <button
              onClick={() => {
                dismissAnnouncement(a.id);
                setDismissed((prev) => new Set([...prev, a.id]));
              }}
              className="shrink-0 rounded p-1 opacity-60 hover:opacity-100"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
