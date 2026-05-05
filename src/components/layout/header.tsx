"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useWorkspace } from "../../lib/workspace";
import { useNotifications } from "../../hooks/use-notifications";
import { HeaderProspectSearch } from "./header-prospect-search";
import { ThemeSwitcher } from "../theme-switcher";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/crm": "CRM",
  "/calendar": "Calendrier",
  "/settings": "Paramètres",
  "/messagerie": "Messagerie",
  "/campaigns": "Campagnes & Appels",
  "/call-sessions": "Campagnes & Appels",
  "/workflows": "Workflows",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isTrialing, daysUntilTrialEnd } = useWorkspace();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      pathname?.startsWith(path)
    )?.[1] || "Andoxa";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex h-16 min-w-0 items-center justify-between gap-3 border-b bg-card px-4 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
        <h1 className="truncate text-lg font-semibold">{pageTitle}</h1>

        {isTrialing && daysUntilTrialEnd !== null && (
          <div className="hidden shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 sm:block dark:bg-amber-900 dark:text-amber-200">
            {daysUntilTrialEnd > 0
              ? `${daysUntilTrialEnd} jours restants`
              : "Essai expiré"}
          </div>
        )}
      </div>

      <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        <HeaderProspectSearch />

        <div className="shrink-0">
          <ThemeSwitcher />
        </div>

        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            className="relative rounded-lg p-2 hover:bg-accent"
            aria-label="Notifications"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Tout marquer lu
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Chargement...
                  </p>
                )}

                {!loading && notifications.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucune notification
                  </p>
                )}

                {!loading &&
                  notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-accent/50 last:border-b-0 ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        if (n.target_url) {
                          router.push(n.target_url);
                          setShowDropdown(false);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${!n.is_read ? "font-semibold" : ""}`}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
