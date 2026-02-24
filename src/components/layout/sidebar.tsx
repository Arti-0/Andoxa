"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Linkedin,
  Megaphone,
  MessageSquare,
  Users,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { LogoDisplay } from "../ui/logo-display";
import { useWorkspace } from "../../lib/workspace";

/**
 * Sidebar - Navigation simplifiée (Point 8)
 * 
 * 4-5 items principaux seulement
 * Features avancées via recherche/settings
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
  },
  {
    href: "/linkedin",
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    href: "/crm",
    label: "CRM",
    icon: Users,
  },
  {
    href: "/messagerie",
    label: "Messagerie",
    icon: MessageSquare,
  },
  {
    href: "/campaigns",
    label: "Campagnes",
    icon: Megaphone,
  },
  {
    href: "/calendar",
    label: "Calendrier",
    icon: Calendar,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { workspace, profile } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Andoxa */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <Link
          href="/"
          className={cn(
            "flex min-w-0 flex-1 items-center justify-start transition-opacity hover:opacity-80",
            isCollapsed && "justify-center"
          )}
        >
          <LogoDisplay
            collapsed={isCollapsed}
            className={cn(isCollapsed ? "h-8 w-8" : "h-5 w-auto")}
          />
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="shrink-0 rounded-lg p-1.5 hover:bg-accent"
          aria-label={isCollapsed ? "Développer la barre latérale" : "Réduire la barre latérale"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-2">
        <ul className="space-y-1">
          {/* Organization name - first entry */}
          <li>
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-foreground",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? workspace?.name || "Andoxa" : undefined}
            >
              {!isCollapsed ? (
                <span className="truncate">
                  {workspace?.name || "Andoxa"}
                </span>
              ) : (
                <span className="text-lg font-bold">
                  {workspace?.name?.charAt(0) || "A"}
                </span>
              )}
            </div>
          </li>
          <li aria-hidden="true">
            <div className="my-1 border-t" />
          </li>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {profile?.full_name?.charAt(0) || "U"}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium">
                {profile?.full_name || "Utilisateur"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
