'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Megaphone,
    MessageSquare,
    Users,
    Calendar,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Check,
    Workflow,
    Lock,
    Plus,
    User as UserIcon,
    LogOut,
    HelpCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { LogoDisplay } from '../ui/logo-display';
import { useWorkspace } from '../../lib/workspace';
import {
    getUserOrganizations,
    type Organization,
} from '../../lib/organizations/utils-client';
import { normalizePlanIdForRoutes } from '@/lib/billing/effective-plan';
import { canAccessRoute, type PlanId } from '@/lib/config/plans-config';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { useMessagingRealtime } from '@/hooks/use-messaging-realtime';
import { useLinkedInAccount } from '@/hooks/use-linkedin-account';
import { isAnyUnipileMessagingConnected } from '@/components/unipile/connection-gate';
import { createClient } from '@/lib/supabase/client';
import { AddOrganizationModal } from '../organizations/add-organization-modal';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
}

const MAIN_NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/crm', label: 'CRM', icon: Users },
    { href: '/campaigns', label: 'Campagnes & Appels', icon: Megaphone },
    { href: '/workflows', label: 'Workflows', icon: Workflow },
    { href: '/messagerie', label: 'Messagerie', icon: MessageSquare },
    { href: '/calendar', label: 'Calendrier', icon: Calendar },
];

const FOOTER_NAV_ITEMS: NavItem[] = [
    { href: '/settings', label: 'Paramètres', icon: Settings },
];

function cleanOrgName(name: string | undefined | null): string {
    if (!name) return 'Mon organisation';
    let cleaned = name.replace(/'s Organization$/i, '').trim();
    cleaned = cleaned.replace(/^Organisation de\s+/i, '').trim();
    if (!cleaned) return 'Mon organisation';
    return cleaned;
}

function getInitials(name: string): string {
    return (name || '?')
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

const PLAN_LABELS: Record<string, string> = {
    trial: 'Essai',
    solo: 'Plan Solo',
    team: 'Plan Team',
    custom: 'Plan Custom',
    demo: 'Plan Demo',
};

function planLabel(plan?: string | null): string {
    if (!plan) return '';
    return PLAN_LABELS[plan] ?? plan;
}

function OrgAvatar({
    logoUrl,
    name,
    size = 34,
    rounded = 8,
}: {
    logoUrl?: string | null;
    name: string;
    size?: number;
    rounded?: number;
}) {
    return (
        <span
            className="sb-org-avatar"
            style={{ width: size, height: size, borderRadius: rounded }}
        >
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" key={logoUrl} />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </span>
    );
}

interface OrgSwitcherProps {
    collapsed: boolean;
    organizations: Organization[];
    activeOrgId?: string;
    activeOrg: { name: string; plan?: string | null; logo_url?: string | null };
    onSwitch: (id: string) => void;
    onAdd: () => void;
}

function OrgSwitcher({
    collapsed,
    organizations,
    activeOrgId,
    activeOrg,
    onSwitch,
    onAdd,
}: OrgSwitcherProps) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const displayName = cleanOrgName(activeOrg.name);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
                setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const focusables =
                    listRef.current?.querySelectorAll<HTMLElement>(
                        '[data-org-row]'
                    );
                if (!focusables || !focusables.length) return;
                const arr = Array.from(focusables);
                const current = document.activeElement as HTMLElement;
                const idx = arr.indexOf(current);
                const next =
                    e.key === 'ArrowDown'
                        ? Math.min(arr.length - 1, idx + 1)
                        : Math.max(0, idx - 1);
                arr[next < 0 ? 0 : next].focus();
            }
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const handleSwitch = (id: string) => {
        setOpen(false);
        if (id !== activeOrgId) onSwitch(id);
    };
    const handleAdd = () => {
        setOpen(false);
        onAdd();
    };

    return (
        <div
            ref={wrapRef}
            className={cn('sb-org-wrap', collapsed && 'sb-org-wrap--collapsed')}
        >
            <button
                type="button"
                className={cn(
                    'sb-org',
                    collapsed && 'sb-org--collapsed',
                    open && 'sb-org--open'
                )}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={
                    collapsed
                        ? `Organisation : ${displayName} — changer`
                        : undefined
                }
            >
                <OrgAvatar
                    logoUrl={activeOrg.logo_url}
                    name={displayName}
                    size={34}
                />
                {!collapsed && (
                    <>
                        <span className="sb-org-meta">
                            <span className="sb-org-name">{displayName}</span>
                            {activeOrg.plan && (
                                <span className="sb-org-plan">
                                    {planLabel(activeOrg.plan)}
                                </span>
                            )}
                        </span>
                        <span className="sb-org-chev">
                            <ChevronDown className="h-3.5 w-3.5" />
                        </span>
                    </>
                )}
                {collapsed && (
                    <span className="sb-tooltip" role="tooltip">
                        {displayName}
                        {activeOrg.plan && (
                            <span className="sb-tooltip-badge">
                                {planLabel(activeOrg.plan)}
                            </span>
                        )}
                    </span>
                )}
            </button>

            {open && (
                <div
                    ref={listRef}
                    className={cn(
                        'sb-org-menu',
                        collapsed && 'sb-org-menu--collapsed'
                    )}
                    role="listbox"
                    aria-label="Vos organisations"
                >
                    <div className="sb-org-menu-label">Vos organisations</div>
                    {organizations.length === 0 && (
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                            Aucune organisation
                        </div>
                    )}
                    {organizations.map((org) => {
                        const name = cleanOrgName(org.name);
                        const isActive = org.id === activeOrgId;
                        return (
                            <button
                                key={org.id}
                                type="button"
                                data-org-row
                                role="option"
                                aria-selected={isActive}
                                className="sb-org-row"
                                onClick={() => handleSwitch(org.id)}
                            >
                                <OrgAvatar
                                    logoUrl={org.logo_url}
                                    name={name}
                                    size={30}
                                    rounded={7}
                                />
                                <span className="sb-org-row-meta">
                                    <span className="sb-org-row-name">
                                        {name}
                                    </span>
                                    {org.plan && (
                                        <span className="sb-org-row-plan">
                                            {planLabel(org.plan)}
                                        </span>
                                    )}
                                </span>
                                {isActive && (
                                    <span className="sb-org-row-check">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <div className="sb-org-menu-divider" />
                    <button
                        type="button"
                        className="sb-org-add"
                        onClick={handleAdd}
                    >
                        <span className="sb-org-add-icon">
                            <Plus className="h-4 w-4" />
                        </span>
                        Ajouter une organisation
                    </button>
                </div>
            )}
        </div>
    );
}

interface UserBlockProps {
    collapsed: boolean;
    name: string;
    email: string;
    avatarUrl?: string | null;
}

function UserBlock({ collapsed, name, email, avatarUrl }: UserBlockProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const initial = (name || email || 'U').charAt(0).toUpperCase();

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false);
        };
        const esc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', handler);
        window.addEventListener('keydown', esc);
        return () => {
            window.removeEventListener('mousedown', handler);
            window.removeEventListener('keydown', esc);
        };
    }, [open]);

    const onLogout = async () => {
        setOpen(false);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/auth/login');
        } catch {
            router.push('/auth/login');
        }
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={collapsed ? `Compte de ${name}` : undefined}
                className={cn(
                    'sb-user',
                    open && 'sb-user--open',
                    collapsed && 'sb-user--collapsed'
                )}
            >
                <span className="sb-avatar-wrap">
                    <span className="sb-avatar">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="" />
                        ) : (
                            initial
                        )}
                    </span>
                    <span className="sb-avatar-status" aria-label="En ligne" />
                </span>
                {!collapsed && (
                    <>
                        <span className="sb-user-meta">
                            <span className="sb-user-name">{name}</span>
                            <span className="sb-user-email">{email}</span>
                        </span>
                        <span className="sb-user-chev">
                            <ChevronUp className="h-3.5 w-3.5" />
                        </span>
                    </>
                )}
                {collapsed && (
                    <span className="sb-tooltip" role="tooltip">
                        {name}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="sb-menu"
                    role="menu"
                    style={
                        collapsed
                            ? {
                                  left: '100%',
                                  right: 'auto',
                                  marginLeft: 12,
                                  bottom: 0,
                                  width: 220,
                              }
                            : undefined
                    }
                >
                    {collapsed && (
                        <div className="sb-menu-header">
                            <div className="sb-menu-name">{name}</div>
                            <div className="sb-menu-email">{email}</div>
                        </div>
                    )}
                    <button
                        type="button"
                        className="sb-menu-item"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            router.push('/settings');
                        }}
                    >
                        <UserIcon className="h-4 w-4" /> Mon profil
                    </button>
                    <button
                        type="button"
                        className="sb-menu-item"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            router.push('/settings');
                        }}
                    >
                        <Settings className="h-4 w-4" /> Préférences
                    </button>
                    <button
                        type="button"
                        className="sb-menu-item"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            router.push('/resources/guide');
                        }}
                    >
                        <HelpCircle className="h-4 w-4" /> Aide & support
                    </button>
                    <div className="sb-menu-divider" />
                    <button
                        type="button"
                        className="sb-menu-item sb-menu-item--danger"
                        role="menuitem"
                        onClick={onLogout}
                    >
                        <LogOut className="h-4 w-4" /> Se déconnecter
                    </button>
                </div>
            )}
        </div>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const { workspace, profile, user, switchWorkspace, refresh } =
        useWorkspace();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [orgsLoaded, setOrgsLoaded] = useState(false);
    const [addOrgOpen, setAddOrgOpen] = useState(false);

    // Keep org-switcher logos in sync when workspace identity changes in context.
    useEffect(() => {
        if (!workspace?.id) return;
        setOrgs((prev) =>
            prev.map((org) =>
                org.id === workspace.id
                    ? {
                          ...org,
                          logo_url: workspace.logo_url,
                          name: workspace.name,
                      }
                    : org
            )
        );
    }, [workspace?.id, workspace?.logo_url, workspace?.name]);

    const { unseenCount, markAllSeen } = useMessagingRealtime();
    const { data: unipileMe, isPending: unipilePending } = useLinkedInAccount();
    const showUnipileNavLock =
        !unipilePending && !isAnyUnipileMessagingConnected(unipileMe);

    useEffect(() => {
        if (pathname?.startsWith('/messagerie')) {
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

    // Preload orgs once so we always know whether to render the dropdown's
    // single-org case correctly (we still show the dropdown either way, but
    // we want the list to be ready when the user opens it).
    useEffect(() => {
        if (!orgsLoaded && user?.id) {
            void loadOrgs();
        }
    }, [orgsLoaded, user?.id, loadOrgs]);

    const handleSwitch = async (orgId: string) => {
        try {
            await switchWorkspace(orgId);
            refresh?.();
            setOrgsLoaded(false);
        } catch {
            // silent
        }
    };

    const routePlan = normalizePlanIdForRoutes(
        workspace?.plan,
        workspace?.subscription_status
    ) as PlanId;
    const workflowsEnabled = isFeatureEnabled('workflows');
    const mainNavItems = MAIN_NAV_ITEMS.filter(
        (item) =>
            canAccessRoute(routePlan, item.href) &&
            // #FF: workflows — hide the Workflows nav entry until ready.
            (workflowsEnabled || item.href !== '/workflows')
    );
    const mainNavItemsWithBadges = mainNavItems.map((item) => {
        if (item.href === '/messagerie' && unseenCount > 0) {
            return { ...item, badge: unseenCount };
        }
        return item;
    });

    const displayUserName =
        profile?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
    const displayUserEmail = profile?.email || user?.email || '';

    return (
        <>
            <aside
                className={cn(
                    'sb',
                    isCollapsed ? 'sb--collapsed' : 'sb--expanded'
                )}
                aria-label="Navigation principale"
            >
                <div
                    className="sb-header"
                    style={
                        isCollapsed
                            ? { justifyContent: 'center', padding: '14px 0' }
                            : undefined
                    }
                >
                    {/* Logo links to the marketing site so users can jump out
                        of the app shell to the public homepage. */}
                    {!isCollapsed && (
                        <Link
                            href="/"
                            className="sb-logo"
                            aria-label="Retour à l'accueil Andoxa"
                        >
                            <LogoDisplay
                                collapsed={false}
                                className="h-6 w-auto"
                            />
                        </Link>
                    )}
                    {!isCollapsed && (
                        <button
                            type="button"
                            className="sb-collapse-btn"
                            onClick={() => setIsCollapsed(true)}
                            aria-label="Réduire la barre latérale"
                            title="Réduire"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                    {isCollapsed && (
                        <Link
                            href="/"
                            aria-label="Retour à l'accueil Andoxa"
                            className="inline-flex"
                        >
                            <LogoDisplay collapsed={true} className="h-8 w-8" />
                        </Link>
                    )}
                </div>

                {isCollapsed && (
                    <div className="sb-collapsed-controls">
                        <button
                            type="button"
                            className="sb-collapse-btn"
                            onClick={() => setIsCollapsed(false)}
                            aria-label="Déplier la barre latérale"
                            title="Déplier"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <OrgSwitcher
                    collapsed={isCollapsed}
                    organizations={orgs}
                    activeOrgId={workspace?.id}
                    activeOrg={{
                        name: workspace?.name ?? 'Mon organisation',
                        plan: workspace?.plan,
                        logo_url: workspace?.logo_url,
                    }}
                    onSwitch={handleSwitch}
                    onAdd={() => setAddOrgOpen(true)}
                />

                <nav className="sb-nav" aria-label="Sections">
                    <div className="sb-nav-group">
                        {mainNavItemsWithBadges.map((item) => {
                            const isActive = pathname?.startsWith(item.href);
                            const Icon = item.icon;
                            const badge = item.badge ?? 0;
                            const showLock =
                                showUnipileNavLock &&
                                (item.href === '/messagerie' ||
                                    item.href === '/campaigns' ||
                                    item.href === '/workflows');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => {
                                        if (
                                            item.href === '/messagerie' &&
                                            badge > 0
                                        ) {
                                            void markAllSeen();
                                        }
                                    }}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'sb-item',
                                        isActive && 'sb-item--active',
                                        isCollapsed && 'sb-item--collapsed'
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <span className="sb-icon">
                                        <Icon className="h-[18px] w-[18px]" />
                                    </span>
                                    {!isCollapsed && (
                                        <>
                                            <span className="sb-label">
                                                {item.label}
                                                {showLock && (
                                                    <Lock
                                                        className="sb-lock"
                                                        aria-hidden
                                                    />
                                                )}
                                            </span>
                                            {badge > 0 && (
                                                <span className="sb-badge">
                                                    {badge > 99 ? '99+' : badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {isCollapsed && badge > 0 && (
                                        <span
                                            className="sb-badge sb-badge--dot"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {isCollapsed && (
                                        <span
                                            className="sb-tooltip"
                                            role="tooltip"
                                        >
                                            {item.label}
                                            {badge > 0 && (
                                                <span className="sb-tooltip-badge">
                                                    {badge > 99 ? '99+' : badge}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <div className="sb-footer">
                    <div className="sb-nav-group" style={{ padding: 0 }}>
                        {FOOTER_NAV_ITEMS.map((item) => {
                            const isActive = pathname?.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'sb-item',
                                        isActive && 'sb-item--active',
                                        isCollapsed && 'sb-item--collapsed'
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <span className="sb-icon">
                                        <Icon className="h-[18px] w-[18px]" />
                                    </span>
                                    {!isCollapsed && (
                                        <span className="sb-label">
                                            {item.label}
                                        </span>
                                    )}
                                    {isCollapsed && (
                                        <span
                                            className="sb-tooltip"
                                            role="tooltip"
                                        >
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                    <UserBlock
                        collapsed={isCollapsed}
                        name={displayUserName}
                        email={displayUserEmail}
                        avatarUrl={profile?.avatar_url}
                    />
                </div>
            </aside>

            <AddOrganizationModal
                open={addOrgOpen}
                onClose={() => setAddOrgOpen(false)}
            />
        </>
    );
}
