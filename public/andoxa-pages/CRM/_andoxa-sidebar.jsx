// ============================================================
// Andoxa — Canonical Sidebar (drop-in)
// ============================================================
// Self-contained: injects its own styles on load and exposes
//   window.AndoxaSidebar — pass `active` prop = one of
//   dashboard | crm | campaigns | workflows | inbox | calendar | settings
// All interactivity (collapse, org switcher, user menu) is internal.
// Visual tokens come from colors_and_type.css already present on every page.
// ============================================================

(function injectAndoxaSidebarStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("andoxa-sidebar-styles")) return;
  const css = `
  /* Andoxa Sidebar — canonical styles */
  .sb, .sb *, .sb *::before, .sb *::after { box-sizing: border-box; }
  .sb button { font-family: inherit; margin: 0; padding: 0; }
  .sb svg { display: block; }

  .sb {
    height: 100%;
    background: var(--neutral-0);
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width 220ms cubic-bezier(.4,0,.2,1);
    position: relative;
    font-family: var(--font-sans);
    color: var(--foreground);
  }
  .sb--expanded { width: 248px; }
  .sb--collapsed { width: 72px; }

  .sb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 14px 16px;
    height: 60px;
    flex-shrink: 0;
  }
  .sb-logo { display: flex; align-items: center; gap: 8px; overflow: hidden; }
  .sb-logo-full {
    height: 26px; width: auto; display: block; flex-shrink: 0;
    mix-blend-mode: multiply;
  }
  .sb-logo-mark-only {
    height: 28px; width: 28px; object-fit: contain; display: block;
    border-radius: 6px; flex-shrink: 0;
  }
  .sb-collapse-btn {
    width: 28px; height: 28px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: var(--radius-md);
    border: none; background: transparent;
    color: var(--neutral-600); cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
    flex-shrink: 0;
  }
  .sb-collapse-btn:hover { background: var(--neutral-100); color: var(--foreground); }

  .sb-collapsed-controls { display: flex; justify-content: center; padding: 0 14px 8px; }

  /* Org switcher */
  .sb-org-wrap { padding: 4px 12px 10px; border-bottom: 1px solid var(--sidebar-border); margin-bottom: 8px; position: relative; }
  .sb-org-wrap--collapsed { padding: 4px 0 10px; }
  .sb-org {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 8px 6px 6px; border-radius: var(--radius-md);
    background: transparent; user-select: none; position: relative;
    width: 100%; border: none; cursor: pointer; font-family: inherit;
    text-align: left; transition: background 150ms ease;
  }
  .sb-org:hover { background: var(--neutral-100); }
  .sb-org:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--brand-blue), 0 0 0 4px var(--brand-blue-tint); }
  .sb-org-chev { margin-left: auto; color: var(--neutral-600); flex-shrink: 0; transition: transform 150ms ease, color 150ms ease; }
  .sb-org:hover .sb-org-chev { color: var(--foreground); }
  .sb-org--open .sb-org-chev { transform: rotate(180deg); color: var(--foreground); }
  .sb-org--open { background: var(--neutral-100); }
  .sb-org-avatar {
    width: 34px; height: 34px; border-radius: 8px;
    color: white; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 13px; font-weight: 600; letter-spacing: -0.01em;
    overflow: hidden;
  }
  .sb-org-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .sb-org-meta { display: flex; flex-direction: column; gap: 1px; overflow: hidden; min-width: 0; }
  .sb-org-name { font-size: 14px; font-weight: 600; color: var(--foreground); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25; }
  .sb-org-plan { font-size: 11.5px; color: var(--neutral-600); font-weight: 500; letter-spacing: 0; white-space: nowrap; line-height: 1.25; }
  .sb-org--collapsed { justify-content: center; padding: 6px 0; width: 100%; }

  .sb-org-menu {
    position: absolute; top: calc(100% - 4px); left: 12px; right: 12px;
    background: var(--neutral-0); border: 1px solid var(--sidebar-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 12px 32px -8px rgba(0,0,0,0.15), 0 4px 10px -3px rgba(0,0,0,0.06);
    padding: 6px; z-index: 70;
    animation: sb-menu-in 140ms ease-out;
  }
  .sb-org-menu--collapsed { left: calc(100% + 8px); right: auto; top: 0; width: 280px; }
  .sb-org-menu-label { padding: 8px 10px 6px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--neutral-600); }
  .sb-org-row {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 7px 8px; border-radius: var(--radius-md);
    background: transparent; border: none; cursor: pointer;
    font-family: inherit; text-align: left; transition: background 120ms ease;
  }
  .sb-org-row:hover { background: var(--neutral-100); }
  .sb-org-row:focus-visible { outline: none; background: var(--neutral-100); box-shadow: inset 0 0 0 2px var(--brand-blue); }
  .sb-org-row-avatar { width: 30px; height: 30px; border-radius: 7px; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; overflow: hidden; }
  .sb-org-row-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .sb-org-row-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .sb-org-row-name { font-size: 13.5px; font-weight: 600; color: var(--foreground); letter-spacing: -0.005em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sb-org-row-plan { font-size: 11.5px; color: var(--neutral-600); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sb-org-row-check { color: var(--brand-blue); flex-shrink: 0; }
  .sb-org-menu-divider { height: 1px; background: var(--sidebar-border); margin: 4px 0; }
  .sb-org-add {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
    border-radius: var(--radius-md); background: transparent; border: none; cursor: pointer;
    font-family: inherit; text-align: left; color: var(--brand-blue);
    font-size: 13px; font-weight: 600; letter-spacing: -0.005em; transition: background 120ms ease;
  }
  .sb-org-add:hover { background: var(--brand-blue-tint); }
  .sb-org-add-icon { width: 30px; height: 30px; border-radius: 7px; background: var(--brand-blue-tint); color: var(--brand-blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  /* Search */
  .sb-search-wrap { padding: 4px 12px 10px; }
  .sb-search {
    width: 100%; height: 34px; display: flex; align-items: center; gap: 7px;
    padding: 0 8px; border-radius: var(--radius-md);
    background: var(--neutral-100); border: 1px solid transparent;
    color: var(--neutral-600); cursor: text;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    min-width: 0;
  }
  .sb-search:hover { background: var(--neutral-0); border-color: var(--neutral-200); }
  .sb-search:focus-within { background: var(--neutral-0); border-color: var(--brand-blue); box-shadow: 0 0 0 3px var(--brand-blue-tint); }
  .sb-search input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: 13px; color: var(--foreground); min-width: 0; width: 100%; padding: 0; text-overflow: ellipsis; }
  .sb-search > svg { flex-shrink: 0; }
  .sb-search input::placeholder { color: var(--neutral-600); }
  .sb-kbd {
    display: inline-flex; align-items: center; gap: 1px;
    font-family: var(--font-mono); font-size: 10.5px; color: var(--neutral-600);
    background: var(--neutral-0); border: 1px solid var(--neutral-200);
    border-radius: 4px; padding: 1px 5px; line-height: 1.3;
  }
  .sb-search-collapsed {
    width: 40px; height: 40px; margin: 0 auto 6px;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius-md); color: var(--neutral-600);
    background: transparent; border: none; cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
  }
  .sb-search-collapsed:hover { background: var(--neutral-100); color: var(--foreground); }

  /* Nav */
  .sb-nav { flex: 1; padding: 4px 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 2px; }
  .sb-nav-group { padding: 0 12px; display: flex; flex-direction: column; gap: 2px; }

  .sb-item {
    position: relative; display: flex; align-items: center; gap: 11px;
    height: 38px; padding: 0 10px; border-radius: var(--radius-md);
    background: transparent; color: var(--neutral-600); cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
    text-decoration: none; border: none; width: 100%;
    text-align: left; font-family: inherit; font-size: 14px; font-weight: 500;
    letter-spacing: -0.005em; outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .sb-item:hover:not(.sb-item--active) { background: var(--neutral-100); color: var(--foreground); }
  .sb-item:focus-visible { box-shadow: 0 0 0 2px var(--brand-blue), 0 0 0 4px var(--brand-blue-tint); }
  .sb-item--active { background: var(--brand-blue-tint); color: var(--brand-blue); }
  .sb-item--active .sb-icon { color: var(--brand-blue); }
  .sb-item--active::before {
    content: ""; position: absolute; left: -12px; top: 6px; bottom: 6px;
    width: 3px; background: var(--brand-blue); border-radius: 0 4px 4px 0;
  }
  .sb-icon { width: 18px; height: 18px; flex-shrink: 0; color: currentColor; transition: color 150ms ease; }
  .sb-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .sb-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
    background: var(--brand-blue-tint); color: var(--brand-blue);
    font-size: 11px; font-weight: 600; line-height: 1; letter-spacing: 0; flex-shrink: 0;
  }
  .sb-item--active .sb-badge { background: var(--brand-blue); color: white; }

  .sb-item--collapsed {
    justify-content: center; padding: 0;
    height: 40px; width: 40px; margin: 0 auto; gap: 0;
  }
  .sb-item--collapsed.sb-item--active::before { left: -16px; top: 7px; bottom: 7px; }
  .sb-badge--dot {
    position: absolute; top: 4px; right: 4px;
    min-width: 8px; width: 8px; height: 8px; padding: 0;
    background: var(--brand-blue); border: 2px solid var(--neutral-0); box-sizing: content-box;
  }

  /* Tooltip */
  .sb-tooltip {
    position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
    background: var(--neutral-950); color: var(--neutral-0);
    padding: 6px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 500;
    white-space: nowrap; opacity: 0; pointer-events: none;
    transition: opacity 120ms ease, transform 120ms ease; z-index: 50;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); letter-spacing: -0.005em;
  }
  .sb-tooltip::before {
    content: ""; position: absolute; left: -4px; top: 50%;
    transform: translateY(-50%) rotate(45deg); width: 8px; height: 8px;
    background: var(--neutral-950);
  }
  .sb-tooltip-badge {
    margin-left: 6px; background: rgba(255,255,255,0.18); color: white;
    padding: 1px 5px; border-radius: 999px; font-size: 10.5px; font-weight: 600;
  }
  .sb-item--collapsed:hover .sb-tooltip,
  .sb-search-collapsed:hover .sb-tooltip,
  .sb-org--collapsed:hover .sb-tooltip { opacity: 1; transform: translateY(-50%) translateX(0); }

  /* Footer */
  .sb-footer {
    padding: 6px 12px 12px; border-top: 1px solid var(--sidebar-border);
    flex-shrink: 0; display: flex; flex-direction: column; gap: 4px;
  }

  .sb-user {
    margin-top: 6px; display: flex; align-items: center; gap: 10px;
    padding: 8px 8px; border-radius: var(--radius-md);
    background: transparent; border: none; cursor: pointer;
    transition: background 150ms ease;
    width: 100%; text-align: left; font-family: inherit; position: relative;
  }
  .sb-user:hover { background: var(--neutral-100); }
  .sb-user:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--brand-blue), 0 0 0 4px var(--brand-blue-tint); }
  .sb-avatar-wrap { position: relative; width: 32px; height: 32px; flex-shrink: 0; }
  .sb-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #f3b988 0%, #c47349 100%);
    color: white; font-size: 12.5px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; letter-spacing: 0;
  }
  .sb-avatar-status {
    position: absolute; bottom: -1px; right: -1px;
    width: 10px; height: 10px; background: #22c55e;
    border-radius: 50%; border: 2px solid var(--neutral-0); box-sizing: content-box;
  }
  .sb-user-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .sb-user-name {
    font-size: 13px; font-weight: 600; color: var(--foreground);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.005em;
  }
  .sb-user-email {
    font-size: 11.5px; color: var(--neutral-600);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sb-user-chev { color: var(--neutral-600); flex-shrink: 0; transition: transform 150ms ease, color 150ms ease; }
  .sb-user:hover .sb-user-chev { color: var(--foreground); }
  .sb-user--open .sb-user-chev { transform: rotate(180deg); color: var(--foreground); }
  .sb-user--collapsed { justify-content: center; padding: 6px 0; }

  .sb-menu {
    position: absolute; bottom: calc(100% + 8px); left: 0; right: 0;
    background: var(--neutral-0); border: 1px solid var(--sidebar-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.05);
    padding: 6px; z-index: 60;
    animation: sb-menu-in 140ms ease-out;
  }
  @keyframes sb-menu-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sb-menu-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 8px 10px; border-radius: var(--radius-sm);
    background: transparent; border: none; cursor: pointer;
    font-family: inherit; font-size: 13.5px; color: var(--foreground);
    text-align: left; transition: background 120ms ease;
  }
  .sb-menu-item:hover { background: var(--neutral-100); }
  .sb-menu-item--danger { color: var(--color-destructive); }
  .sb-menu-item--danger:hover { background: oklch(0.96 0.04 27); }
  .sb-menu-divider { height: 1px; background: var(--sidebar-border); margin: 4px 0; }
  .sb-menu-header { padding: 8px 10px 10px; border-bottom: 1px solid var(--sidebar-border); margin-bottom: 4px; }
  .sb-menu-name { font-size: 13px; font-weight: 600; color: var(--foreground); }
  .sb-menu-email { font-size: 11.5px; color: var(--neutral-600); }
  `;
  const style = document.createElement("style");
  style.id = "andoxa-sidebar-styles";
  style.textContent = css;
  document.head.appendChild(style);
})();

(function defineAndoxaSidebar() {
  const { useState, useEffect, useRef } = React;

  /* ---------- Icons (Lucide-style, 1.75px stroke) ---------- */
  const SbIcon = ({ size = 18, stroke = "currentColor", strokeWidth = 1.75, fill, children }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size}
      viewBox="0 0 24 24"
      fill={fill || "none"}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );

  const SbIcons = {
    dashboard: (p) => <SbIcon {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></SbIcon>,
    crm: (p) => <SbIcon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SbIcon>,
    megaphone: (p) => <SbIcon {...p}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></SbIcon>,
    workflow: (p) => <SbIcon {...p}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M6 9v6a3 3 0 0 0 3 3h6"/></SbIcon>,
    message: (p) => <SbIcon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></SbIcon>,
    calendar: (p) => <SbIcon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></SbIcon>,
    settings: (p) => <SbIcon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.16.39.51.66.93.74H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SbIcon>,
    search: (p) => <SbIcon {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></SbIcon>,
    chevronLeft: (p) => <SbIcon {...p} strokeWidth={2}><polyline points="15 18 9 12 15 6"/></SbIcon>,
    chevronRight: (p) => <SbIcon {...p} strokeWidth={2}><polyline points="9 18 15 12 9 6"/></SbIcon>,
    chevronUp: (p) => <SbIcon {...p} strokeWidth={2}><polyline points="6 15 12 9 18 15"/></SbIcon>,
    chevronDown: (p) => <SbIcon {...p} strokeWidth={2}><polyline points="6 9 12 15 18 9"/></SbIcon>,
    check: (p) => <SbIcon {...p} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></SbIcon>,
    plus: (p) => <SbIcon {...p} strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></SbIcon>,
    user: (p) => <SbIcon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></SbIcon>,
    logout: (p) => <SbIcon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></SbIcon>,
    help: (p) => <SbIcon {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></SbIcon>,
  };

  const NAV = [
    { id: "dashboard",  label: "Tableau de bord",   icon: "dashboard" },
    { id: "crm",        label: "CRM",               icon: "crm",       badge: 4 },
    { id: "campaigns",  label: "Campagnes & Appels",icon: "megaphone" },
    { id: "workflows",  label: "Workflows",         icon: "workflow" },
    { id: "inbox",      label: "Messagerie",        icon: "message",   badge: 3 },
    { id: "calendar",   label: "Calendrier",        icon: "calendar",  badge: 2 },
  ];

  const FOOTER_NAV = [
    { id: "settings", label: "Paramètres", icon: "settings" },
  ];

  const USER = {
    name: "Sebastian Bodin",
    email: "sebastian.bodin11@gmail.com",
    initials: "SB",
  };

  const INITIAL_ORGS = [
    { id: "demo",   name: "Demo",        plan: "Plan Pro",  color: "#0052D9" },
    { id: "andoxa", name: "Andoxa",      plan: "Plan Team", color: "#FF6700" },
    { id: "acme",   name: "Acme Sales",  plan: "Plan Solo", color: "#7C3AED" },
  ];

  function getInitials(name) {
    return (name || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }

  function NavItem({ item, active, collapsed, showBadges }) {
    const IconComp = SbIcons[item.icon];
    const hasBadge = showBadges && typeof item.badge === "number" && item.badge > 0;
    return (
      <button
        type="button"
        role="link"
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={`sb-item ${active ? "sb-item--active" : ""} ${collapsed ? "sb-item--collapsed" : ""}`}
      >
        <span className="sb-icon"><IconComp size={collapsed ? 19 : 18} /></span>
        {!collapsed && <span className="sb-label">{item.label}</span>}
        {!collapsed && hasBadge && <span className="sb-badge">{item.badge}</span>}
        {collapsed && hasBadge && <span className="sb-badge sb-badge--dot" aria-hidden="true" />}
        {collapsed && (
          <span className="sb-tooltip" role="tooltip">
            {item.label}
            {hasBadge && <span className="sb-tooltip-badge">{item.badge}</span>}
          </span>
        )}
      </button>
    );
  }

  function UserBlock({ collapsed }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      if (!open) return;
      const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      const onKey  = (e) => { if (e.key === "Escape") setOpen(false); };
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("mousedown", onDown);
        window.removeEventListener("keydown", onKey);
      };
    }, [open]);
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={collapsed ? `Compte de ${USER.name}` : undefined}
          className={`sb-user ${open ? "sb-user--open" : ""} ${collapsed ? "sb-user--collapsed" : ""}`}
        >
          <span className="sb-avatar-wrap">
            <span className="sb-avatar">{USER.initials}</span>
            <span className="sb-avatar-status" aria-label="En ligne" />
          </span>
          {!collapsed && (
            <>
              <span className="sb-user-meta">
                <span className="sb-user-name">{USER.name}</span>
                <span className="sb-user-email">{USER.email}</span>
              </span>
              <span className="sb-user-chev"><SbIcons.chevronUp size={14} /></span>
            </>
          )}
          {collapsed && <span className="sb-tooltip" role="tooltip">{USER.name}</span>}
        </button>
        {open && (
          <div className="sb-menu" role="menu" style={collapsed ? { left: "100%", right: "auto", marginLeft: 12, bottom: 0, width: 220 } : null}>
            {collapsed && (
              <div className="sb-menu-header">
                <div className="sb-menu-name">{USER.name}</div>
                <div className="sb-menu-email">{USER.email}</div>
              </div>
            )}
            <button className="sb-menu-item" role="menuitem" onClick={() => setOpen(false)}>
              <SbIcons.user size={16} /> Mon profil
            </button>
            <button className="sb-menu-item" role="menuitem" onClick={() => setOpen(false)}>
              <SbIcons.settings size={16} /> Préférences
            </button>
            <button className="sb-menu-item" role="menuitem" onClick={() => setOpen(false)}>
              <SbIcons.help size={16} /> Aide & support
            </button>
            <div className="sb-menu-divider" />
            <button className="sb-menu-item sb-menu-item--danger" role="menuitem" onClick={() => setOpen(false)}>
              <SbIcons.logout size={16} /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    );
  }

  function OrgSwitcher({ collapsed, organizations, activeOrgId, onSwitchOrg }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const active = organizations.find(o => o.id === activeOrgId) || organizations[0];

    useEffect(() => {
      if (!open) return;
      const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
      const onKey  = (e) => { if (e.key === "Escape") setOpen(false); };
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("mousedown", onDown);
        window.removeEventListener("keydown", onKey);
      };
    }, [open]);

    return (
      <div ref={wrapRef} className={`sb-org-wrap ${collapsed ? "sb-org-wrap--collapsed" : ""}`}>
        <button
          type="button"
          className={`sb-org ${collapsed ? "sb-org--collapsed" : ""} ${open ? "sb-org--open" : ""}`}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={collapsed ? `Organisation : ${active.name} — changer` : undefined}
        >
          <span className="sb-org-avatar" style={{ background: active.color }}>
            <span>{getInitials(active.name)}</span>
          </span>
          {!collapsed && (
            <>
              <span className="sb-org-meta">
                <span className="sb-org-name">{active.name}</span>
                <span className="sb-org-plan">{active.plan}</span>
              </span>
              <span className="sb-org-chev"><SbIcons.chevronDown size={15} /></span>
            </>
          )}
          {collapsed && (
            <span className="sb-tooltip" role="tooltip">{active.name} <span className="sb-tooltip-badge">{active.plan}</span></span>
          )}
        </button>
        {open && (
          <div className={`sb-org-menu ${collapsed ? "sb-org-menu--collapsed" : ""}`} role="listbox" aria-label="Vos organisations">
            <div className="sb-org-menu-label">Vos organisations</div>
            {organizations.map(org => (
              <button
                key={org.id}
                type="button"
                role="option"
                aria-selected={org.id === active.id}
                className="sb-org-row"
                onClick={() => { setOpen(false); if (org.id !== active.id) onSwitchOrg(org.id); }}
              >
                <span className="sb-org-row-avatar" style={{ background: org.color }}>
                  <span>{getInitials(org.name)}</span>
                </span>
                <span className="sb-org-row-meta">
                  <span className="sb-org-row-name">{org.name}</span>
                  <span className="sb-org-row-plan">{org.plan}</span>
                </span>
                {org.id === active.id && organizations.length > 1 && (
                  <span className="sb-org-row-check"><SbIcons.check size={16} /></span>
                )}
              </button>
            ))}
            <div className="sb-org-menu-divider" />
            <button type="button" className="sb-org-add" onClick={() => setOpen(false)}>
              <span className="sb-org-add-icon"><SbIcons.plus size={16} /></span>
              Ajouter une organisation
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ============================================================
     AndoxaSidebar — drop-in component
     props:
       active: one of dashboard|crm|campaigns|workflows|inbox|calendar|settings
       logoBase: optional path prefix to find logo-full.jpg / logo-mark.jpg
                 (default "assets/")
     ============================================================ */
  function AndoxaSidebar({ active = "dashboard", logoBase = "assets/" }) {
    const [collapsed, setCollapsed] = useState(false);
    const [activeOrgId, setActiveOrgId] = useState(INITIAL_ORGS[0].id);
    const searchRef = useRef(null);

    useEffect(() => {
      const onKey = (e) => {
        if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
          e.preventDefault();
          if (searchRef.current) searchRef.current.focus();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
      <aside
        className={`sb ${collapsed ? "sb--collapsed" : "sb--expanded"}`}
        aria-label="Navigation principale"
      >
        <div className="sb-header" style={collapsed ? { justifyContent: "center", padding: "14px 0" } : null}>
          {!collapsed && (
            <div className="sb-logo">
              <img
                src={logoBase + "logo-full.jpg"}
                alt="Andoxa"
                className="sb-logo-full"
                style={{ height: 24 }}
                draggable="false"
              />
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              className="sb-collapse-btn"
              onClick={() => setCollapsed(true)}
              aria-label="Réduire la sidebar"
              title="Réduire"
            >
              <SbIcons.chevronLeft size={16} />
            </button>
          )}
          {collapsed && (
            <img
              src={logoBase + "logo-mark.jpg"}
              alt="Andoxa"
              className="sb-logo-mark-only"
              style={{ width: 28, height: 28 }}
              draggable="false"
            />
          )}
        </div>

        {collapsed && (
          <div className="sb-collapsed-controls">
            <button
              type="button"
              className="sb-collapse-btn"
              onClick={() => setCollapsed(false)}
              aria-label="Déplier la sidebar"
              title="Déplier"
            >
              <SbIcons.chevronRight size={16} />
            </button>
          </div>
        )}

        <OrgSwitcher
          collapsed={collapsed}
          organizations={INITIAL_ORGS}
          activeOrgId={activeOrgId}
          onSwitchOrg={setActiveOrgId}
        />

        {!collapsed && (
          <div className="sb-search-wrap">
            <label className="sb-search">
              <SbIcons.search size={15} stroke="currentColor" />
              <input
                ref={searchRef}
                type="search"
                placeholder="Rechercher…"
                aria-label="Rechercher"
              />
              <span className="sb-kbd" aria-hidden="true">⌘K</span>
            </label>
          </div>
        )}
        {collapsed && (
          <button
            type="button"
            className="sb-search-collapsed"
            aria-label="Rechercher"
            onClick={() => setCollapsed(false)}
            style={{ position: "relative" }}
          >
            <SbIcons.search size={18} />
            <span className="sb-tooltip" role="tooltip">Rechercher<span className="sb-tooltip-badge">⌘K</span></span>
          </button>
        )}

        <nav className="sb-nav" aria-label="Sections">
          <div className="sb-nav-group">
            {NAV.map(item => (
              <NavItem
                key={item.id}
                item={item}
                active={active === item.id}
                collapsed={collapsed}
                showBadges={true}
              />
            ))}
          </div>
        </nav>

        <div className="sb-footer">
          <div className="sb-nav-group" style={{ padding: 0 }}>
            {FOOTER_NAV.map(item => (
              <NavItem
                key={item.id}
                item={item}
                active={active === item.id}
                collapsed={collapsed}
                showBadges={true}
              />
            ))}
          </div>
          <UserBlock collapsed={collapsed} />
        </div>
      </aside>
    );
  }

  window.AndoxaSidebar = AndoxaSidebar;
})();
