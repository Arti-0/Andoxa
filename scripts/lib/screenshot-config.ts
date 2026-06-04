import path from "path";

/** Fixed IDs keep re-seeds idempotent when env vars are unset. */
export const SCREENSHOT_ORG_ID =
  process.env.ANDOXA_SCREENSHOT_ORG_ID ??
  "a1111111-1111-4111-8111-111111111111";

export const SCREENSHOT_USER_EMAIL =
  process.env.ANDOXA_SCREENSHOT_EMAIL ?? "screenshots@andoxa.dev";

export const SCREENSHOT_USER_PASSWORD =
  process.env.ANDOXA_SCREENSHOT_PASSWORD ?? "AndoxaScreenshot2026!";

export const SCREENSHOT_ORG_NAME = "Acme Sales";
export const SCREENSHOT_USER_NAME = "Marie Dupont";

export const HOMEPAGE_ASSETS_BUCKET =
  process.env.HOMEPAGE_ASSETS_BUCKET ?? "homepage-assets";

export const SCREENSHOT_STATE_PATH = path.join(
  process.cwd(),
  "scripts",
  ".screenshot-state.json"
);

export const LOCAL_SCREENSHOT_DIR = path.join(
  process.cwd(),
  "public",
  "screenshots"
);

export const PLAYWRIGHT_VIEWPORT = { width: 1440, height: 900 } as const;

export type ScreenshotTarget = {
  id: string;
  filename: string;
  /** Resolved at runtime from seed state when `routeKey` is set. */
  routeKey?:
    | "dashboard"
    | "crm"
    | "campaigns"
    | "callSession"
    | "messagerie"
    | "calendar";
  /** Static path (no auth). */
  route?: string;
  /** Full viewport including collapsed sidebar (default). */
  framing: "app" | "main" | "manual";
  waitSelector?: string;
  /** Enable Unipile API mocks (messagerie). */
  mockMessagerie?: boolean;
};

export const SCREENSHOT_TARGETS: ScreenshotTarget[] = [
  {
    id: "01-extension-linkedin",
    filename: "01-extension-linkedin-profil.png",
    framing: "manual",
  },
  {
    id: "02-dashboard",
    filename: "02-dashboard.png",
    routeKey: "dashboard",
    framing: "app",
    waitSelector: '[data-screenshot-ready="true"]',
  },
  {
    id: "03-crm",
    filename: "03-crm.png",
    routeKey: "crm",
    framing: "app",
    waitSelector: '[data-screenshot-ready="true"]',
  },
  {
    id: "04-campagnes",
    filename: "04-campagnes.png",
    routeKey: "campaigns",
    framing: "app",
    waitSelector: '[data-screenshot-ready="true"]',
  },
  {
    id: "05-call-session",
    filename: "05-call-session.png",
    routeKey: "callSession",
    framing: "app",
    waitSelector: '[data-screenshot-ready="true"]',
  },
  {
    id: "06-messagerie",
    filename: "06-messagerie.png",
    routeKey: "messagerie",
    framing: "app",
    mockMessagerie: true,
    waitSelector: '[data-screenshot-ready="true"]',
  },
  {
    id: "07-calendrier",
    filename: "07-calendrier.png",
    routeKey: "calendar",
    framing: "app",
    waitSelector: '[data-screenshot-ready="true"]',
  },
];

export type ScreenshotState = {
  orgId: string;
  userId: string;
  email: string;
  routes: {
    dashboard: string;
    crm: string;
    campaigns: string;
    callSession: string;
    messagerie: string;
    calendar: string;
  };
  updatedAt: string;
};

export function resolveRoute(
  target: ScreenshotTarget,
  state: ScreenshotState
): string | null {
  if (target.route) return target.route;
  if (!target.routeKey) return null;
  return state.routes[target.routeKey] ?? null;
}
