"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, LogOut } from "lucide-react";
import { useWorkspace } from "../../lib/workspace";
import { ThemeSwitcher } from "../ui/theme-switcher";

/**
 * Header - Top bar with search and actions
 */

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/crm": "CRM",
  "/linkedin": "LinkedIn",
  "/calendar": "Calendrier",
  "/settings": "Paramètres",
};

export function Header() {
  const pathname = usePathname();
  const { signOut, workspace, isTrialing, daysUntilTrialEnd } = useWorkspace();

  // Get page title from pathname
  const pageTitle = Object.entries(PAGE_TITLES).find(
    ([path]) => pathname?.startsWith(path)
  )?.[1] || "Andoxa";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Left: Page title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
        
        {/* Trial banner */}
        {isTrialing && daysUntilTrialEnd !== null && (
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {daysUntilTrialEnd > 0
              ? `${daysUntilTrialEnd} jours restants`
              : "Essai expiré"}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          onClick={() => {
            // TODO: Open command palette / search
          }}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-xs sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="rounded-lg p-2 hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Theme switcher */}
        <ThemeSwitcher />

        {/* Sign out */}
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
