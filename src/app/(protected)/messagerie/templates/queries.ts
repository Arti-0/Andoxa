"use client";

// Templates admin — wired to /api/message-templates.
//
// Schema gaps the design wants but backend doesn't yet have (BACKEND.md §7.2):
//   - `category` column → all templates render under category "first" client-side
//   - `usage` counter   → always 0 until template_usages table lands
//   - `both` channel    → mapped to "linkedin" on save (kept as "both" only when
//                          channel is unknown). Email templates from existing data
//                          surface as "li" so they're still visible.
//
// Variable syntax: backend stores `{{firstName}}` etc. The view layer accepts
// both `{{x}}` and the older `{x}` French form via resolveVars.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type AdminTemplate = {
  id: string;
  name: string;
  category: string; // kept for backward-compat with existing backend data
  tags?: string[];  // array of category IDs; replaces single category in UI
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
  content: string;
  variables_used: string[];
  is_default: boolean;
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

function backendToAdmin(t: BackendTemplate): AdminTemplate {
  return {
    id: t.id,
    name: t.name,
    category: "first", // TODO(BACKEND.md §7.2): read from DB once column exists
    tags: [],           // TODO(BACKEND.md §7.2): read tags array from DB
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

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      tpl: Omit<AdminTemplate, "id" | "usage"> & {
        id?: string;
        usage?: number;
      },
    ): Promise<AdminTemplate> => {
      const payload = {
        name: tpl.name,
        channel: designToBackendChannel(tpl.channel),
        content: tpl.content,
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
