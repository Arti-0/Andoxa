"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Bell, Search, LogOut, Check, CheckCheck } from "lucide-react";
import { useWorkspace } from "../../lib/workspace";
import { ThemeSwitcher } from "../ui/theme-switcher";
import { useNotifications } from "../../hooks/use-notifications";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/crm": "CRM",
  "/linkedin": "Installation",
  "/calendar": "Calendrier",
  "/settings": "Paramètres",
  "/messagerie": "Messagerie",
  "/campaigns": "Campagnes & Appels",
  "/call-sessions": "Campagnes & Appels",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, isTrialing, daysUntilTrialEnd } = useWorkspace();
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
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">{pageTitle}</h1>

        {isTrialing && daysUntilTrialEnd !== null && (
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {daysUntilTrialEnd > 0
              ? `${daysUntilTrialEnd} jours restants`
              : "Essai expiré"}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Rechercher un prospect...</span>
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-xs sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
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

        <ThemeSwitcher />

        <button
          onClick={() => signOut()}
          className="rounded-lg p-2 hover:bg-accent"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
