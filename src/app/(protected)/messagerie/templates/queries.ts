"use client";

// Templates admin — wired to /api/message-templates.
//
// Remaining schema gaps (BACKEND.md §7.2):
//   - `usage` counter → always 0 until template_usages table lands
//   - `both` channel → mapped to "linkedin" on save (kept as "both" only when
//     channel is unknown). Email templates surface as "li" so they're visible.
//
// Variable syntax: backend stores `{{firstName}}` etc. The view layer accepts
// both `{{x}}` and the older `{x}` French form via resolveVars.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  parseTemplateCategory,
  type TemplateCategory,
} from "../data";

export type AdminTemplate = {
  id: string;
  name: string;
  /** Legacy enum (first | relance | …) kept as a fallback display value. */
  category: TemplateCategory;
  /** Dynamic FK into template_categories. Preferred over `category` going forward. */
  categoryId: string | null;
  /** Joined name from template_categories — undefined for legacy rows. */
  categoryName: string | null;
  /** First entry holds the active-filter id — categoryId when set, else the enum. */
  tags?: string[];
  channel: "li" | "wa" | "both";
  content: string;
  usage: number;
};

const TEMPLATES_KEY = ["messagerie", "admin-templates"] as const;
const FIVE_MIN = 5 * 60 * 1000;

interface BackendTemplate {
  id: string;
  name: string;
  channel: "linkedin" | "whatsapp" | "email";
  /** Foreign key to template_categories(id). Replaces the legacy enum string. */
  category_id?: string | null;
  /**
   * The /api/message-templates SELECT aliases the FK join as `category`. It's
   * either the joined row OR the legacy enum string for older payloads that
   * don't include the join.
   */
  category?:
    | { id: string; name: string; sort_order: number }
    | string
    | null;
  content: string;
  variables_used: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Server-side category row from /api/template-categories. */
export interface TemplateCategoryRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function backendToDesignChannel(
  ch: BackendTemplate["channel"],
): "li" | "wa" | "both" {
  if (ch === "linkedin") return "li";
  if (ch === "whatsapp") return "wa";
  return "both";
}

function designToBackendChannel(
  ch: AdminTemplate["channel"],
): BackendTemplate["channel"] {
  if (ch === "wa") return "whatsapp";
  // "li" and "both" both store as "linkedin" until backend supports "both".
  return "linkedin";
}

function designSaveCategory(tpl: Pick<AdminTemplate, "category" | "tags">): TemplateCategory {
  // Legacy enum fallback — only used when the saved tag isn't a UUID
  // (older templates without category_id, or "all" sentinel).
  const first = tpl.tags?.[0];
  return parseTemplateCategory(typeof first === "string" ? first : tpl.category);
}

function backendToAdmin(t: BackendTemplate): AdminTemplate {
  // Prefer the dynamic category (id from the FK join) — fall back to the
  // legacy enum text only when no join exists. The page uses tags[0] as the
  // active-filter id, so we put the dynamic UUID there when available.
  const joined =
    typeof t.category === "object" && t.category !== null ? t.category : null;
  const legacyEnum = typeof t.category === "string" ? t.category : null;
  const tagId = joined?.id ?? legacyEnum ?? "other";
  const enumCategory = parseTemplateCategory(legacyEnum);
  return {
    id: t.id,
    name: t.name,
    category: enumCategory,
    categoryId: t.category_id ?? joined?.id ?? null,
    categoryName: joined?.name ?? null,
    tags: [tagId],
    channel: backendToDesignChannel(t.channel),
    content: t.content,
    usage: 0,           // TODO(BACKEND.md §7.2): wire to template_usages
  };
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const msg =
      (j as { error?: { message?: string } })?.error?.message ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}

async function fetchAdminTemplates(): Promise<AdminTemplate[]> {
  const data = await getJson<{ items?: BackendTemplate[] }>(
    "/api/message-templates",
  );
  return (data.items ?? []).map(backendToAdmin);
}

export function useAdminTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: fetchAdminTemplates,
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildCategoryPayload(tpl: {
  category?: TemplateCategory;
  categoryId?: string | null;
  tags?: string[];
}): Record<string, unknown> {
  // Send the new dynamic FK when we have one; fall back to the legacy enum
  // string so old callers / seeded categories still work.
  if (tpl.categoryId) return { category_id: tpl.categoryId };
  const tag = tpl.tags?.[0];
  if (tag && UUID_RE.test(tag)) return { category_id: tag };
  // designSaveCategory requires `category` to be a real value — fall back to
  // parsing the tag (or "other") when called from create paths that don't set it.
  return {
    category: parseTemplateCategory(tpl.category ?? tag ?? "other"),
  };
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      // categoryId/categoryName are optional on input — categoryId can be
      // derived from `tags[0]` when it's a UUID, and the server doesn't
      // accept categoryName separately (use `category_name` for inline create
      // — surfaced as a future enhancement once the modal needs it).
      tpl: Omit<AdminTemplate, "id" | "usage" | "categoryId" | "categoryName"> & {
        id?: string;
        usage?: number;
        categoryId?: string | null;
        categoryName?: string | null;
      },
    ): Promise<AdminTemplate> => {
      const payload = {
        name: tpl.name,
        channel: designToBackendChannel(tpl.channel),
        content: tpl.content,
        ...buildCategoryPayload(tpl),
      };
      if (tpl.id) {
        const updated = await getJson<BackendTemplate>(
          `/api/message-templates/${tpl.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        return backendToAdmin(updated);
      }
      const created = await getJson<BackendTemplate>("/api/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return backendToAdmin(created);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      // The composer's quick-insert list also reads templates.
      void qc.invalidateQueries({
        queryKey: ["messagerie", "templates"],
      });
    },
  });
}

// ─── Dynamic categories (template_categories table) ─────────────────────────

const CATEGORIES_KEY = ["messagerie", "template-categories"] as const;

export function useTemplateCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () =>
      getJson<{ items: TemplateCategoryRow[] }>("/api/template-categories").then(
        (r) => r.items ?? [],
      ),
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useCreateTemplateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; sort_order?: number }) =>
      getJson<TemplateCategoryRow>("/api/template-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useDeleteTemplateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ success: boolean }>(`/api/template-categories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useRenameTemplateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      getJson<TemplateCategoryRow>(`/api/template-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await getJson<{ success: boolean }>(`/api/message-templates/${id}`, {
        method: "DELETE",
      });
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      void qc.invalidateQueries({
        queryKey: ["messagerie", "templates"],
      });
    },
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    // No server-side dup endpoint; create with copied fields.
    mutationFn: async (tpl: AdminTemplate): Promise<AdminTemplate> => {
      const created = await getJson<BackendTemplate>("/api/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tpl.name + " (copie)",
          channel: designToBackendChannel(tpl.channel),
          content: tpl.content,
          ...buildCategoryPayload(tpl),
        }),
      });
      return backendToAdmin(created);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      void qc.invalidateQueries({
        queryKey: ["messagerie", "templates"],
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking URL — the user's public booking link, set on the Calendar page.
// Used by the template editor preview so {lien_booking} renders the real link
// instead of a placeholder.
// ─────────────────────────────────────────────────────────────────────────────

export function useBookingUrl(): string | null {
  const { data } = useQuery({
    queryKey: ["booking-slug"],
    queryFn: async () => {
      const res = await fetch("/api/booking/slug", { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? json) as {
        booking_slug: string | null;
        booking_public_path: string | null;
      };
    },
    staleTime: 5 * 60 * 1000,
  });
  const path = data?.booking_public_path ?? null;
  if (!path) return null;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://andoxa.fr";
  return `${origin}/booking/${path.replace(/^\/+|\/+$/g, "")}`;
}
