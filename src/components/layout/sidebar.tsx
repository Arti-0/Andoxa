"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Users,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Building2,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { LogoDisplay } from "../ui/logo-display";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useWorkspace } from "../../lib/workspace";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  getUserOrganizations,
  type Organization,
} from "../../lib/organizations/utils-client";
import { normalizePlanIdForRoutes } from "@/lib/billing/effective-plan";
import { canAccessRoute, type PlanId } from "@/lib/config/plans-config";
import { useMessagingRealtime } from "@/hooks/use-messaging-realtime";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/campaigns", label: "Campagnes & Appels", icon: Megaphone },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/messagerie", label: "Messagerie", icon: MessageSquare },
  { href: "/calendar", label: "Calendrier", icon: Calendar },
];

const FOOTER_NAV_ITEMS: NavItem[] = [
  { href: "/settings", label: "Paramètres", icon: Settings },
];

function cleanOrgName(name: string | undefined | null): string {
  if (!name) return "Mon organisation";
  let cleaned = name.replace(/'s Organization$/i, "").trim();
  cleaned = cleaned.replace(/^Organisation de\s+/i, "").trim();
  if (!cleaned) return "Mon organisation";
  return cleaned;
}

function OrgLogoThumb({
  logoUrl,
  className,
}: {
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/50",
        className ?? "h-7 w-7"
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URLs; matches dashboard-header
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { workspace, profile, user, switchWorkspace, refresh } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);

  const { unseenCount, markAllSeen } = useMessagingRealtime();

  useEffect(() => {
    if (pathname?.startsWith("/messagerie")) {
      void markAllSeen();
    }
  }, [pathname, markAllSeen]);

  const loadOrgs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await getUserOrganizations(user.id);
      setOrgs(list);
    } catch {
      setOrgs([]);
    } finally {
      setOrgsLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (orgOpen && !orgsLoaded) {
      loadOrgs();
    }
  }, [orgOpen, orgsLoaded, loadOrgs]);

  const handleSwitch = async (orgId: string) => {
    try {
      await switchWorkspace(orgId);
      refresh?.();
      setOrgOpen(false);
      setOrgsLoaded(false);
    } catch {
      // silent
    }
  };

  const displayName = cleanOrgName(workspace?.name);

  const routePlan = normalizePlanIdForRoutes(
    workspace?.plan,
    workspace?.subscription_status
  ) as PlanId;
  const mainNavItems = MAIN_NAV_ITEMS.filter((item) =>
    canAccessRoute(routePlan, item.href)
  );

  const mainNavItemsWithBadges = mainNavItems.map((item) => {
    if (item.href === "/messagerie" && unseenCount > 0) {
      return { ...item, badge: unseenCount };
    }
    return item;
  });

  const displayUserName =
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "Utilisateur";
  const displayUserEmail = profile?.email || user?.email || "";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
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

      <nav className="flex-1 overflow-auto p-2">
        <ul className="space-y-1">
          <li>
            <Popover open={orgOpen} onOpenChange={setOrgOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? displayName : undefined}
                >
                  <OrgLogoThumb
                    logoUrl={workspace?.logo_url}
                    className={cn(isCollapsed ? "h-8 w-8" : "h-7 w-7")}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{displayName}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1" align="start" side="bottom">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Organisations
                </p>
                {orgs.length === 0 && orgsLoaded && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">Aucune organisation</p>
                )}
                {orgs.map((org) => {
                  const isActive = org.id === workspace?.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => !isActive && handleSwitch(org.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-accent font-medium"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <OrgLogoThumb logoUrl={org.logo_url} />
                      <span className="min-w-0 flex-1 truncate text-left">
                        {cleanOrgName(org.name)}
                      </span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </li>
          <li aria-hidden="true">
            <div className="my-1 border-t" />
          </li>
          {mainNavItemsWithBadges.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            const badge = item.badge ?? 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => {
                    if (item.href === "/messagerie" && badge > 0) {
                      void markAllSeen();
                    }
                  }}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-5 w-5" />
                    {isCollapsed && badge > 0 && (
                      <span
                        className={cn(
                          "absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full bg-red-500 font-semibold leading-none text-white",
                          badge > 99
                            ? "h-4 min-w-4 px-0.5 text-[9px]"
                            : "h-4 min-w-4 px-0.5 text-[10px]"
                        )}
                        aria-label={`${badge} message${badge > 1 ? "s" : ""} non lu${badge > 1 ? "s" : ""}`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                  {!isCollapsed && badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-2">
        <ul className="space-y-1">
          {FOOTER_NAV_ITEMS.map((item) => {
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
      </div>

      <div className="border-t p-4">
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="bg-muted text-sm font-medium">
              {profile?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {displayUserName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {displayUserEmail}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
