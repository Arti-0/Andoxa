"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MessageSquare,
  Linkedin,
  Phone,
  Mail,
  Copy,
} from "lucide-react";
import Link from "next/link";

interface MessageTemplate {
  id: string;
  name: string;
  channel: "linkedin" | "whatsapp" | "email";
  content: string;
  variables_used: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const CHANNEL_CONFIG = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  whatsapp: { label: "WhatsApp", icon: Phone, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  email: { label: "Email", icon: Mail, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
} as const;

const VARIABLES = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "company", label: "Entreprise" },
  { key: "jobTitle", label: "Poste" },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "Email" },
  { key: "bookingLink", label: "Lien de prise de RDV" },
];

const PREVIEW_PROSPECT: Record<string, string> = {
  firstName: "Marie",
  lastName: "Dupont",
  company: "TechCorp",
  jobTitle: "Directrice Marketing",
  phone: "+33 6 12 34 56 78",
  email: "marie@techcorp.fr",
  bookingLink: "https://andoxa.fr/booking/mon-lien",
};

function applyPreview(content: string): string {
  let result = content;
  for (const [key, value] of Object.entries(PREVIEW_PROSPECT)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export default function MessageTemplatesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formChannel, setFormChannel] = useState<"linkedin" | "whatsapp" | "email">("linkedin");
  const [formContent, setFormContent] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["message-templates", filterChannel],
    queryFn: async () => {
      const params = filterChannel ? `?channel=${filterChannel}` : "";
      const res = await fetch(`/api/message-templates${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data?.items ?? []) as MessageTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; channel: string; content: string }) => {
      const res = await fetch("/api/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; channel: string; content: string }) => {
      const res = await fetch(`/api/message-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/message-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    },
  });

  const resetForm = useCallback(() => {
    setShowCreate(false);
    setEditingId(null);
    setFormName("");
    setFormChannel("linkedin");
    setFormContent("");
  }, []);

  const startEdit = useCallback((t: MessageTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormChannel(t.channel);
    setFormContent(t.content);
    setShowCreate(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formName.trim() || !formContent.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, name: formName, channel: formChannel, content: formContent });
    } else {
      createMutation.mutate({ name: formName, channel: formChannel, content: formContent });
    }
  }, [editingId, formName, formChannel, formContent, createMutation, updateMutation]);

  const insertVariable = useCallback((varKey: string) => {
    setFormContent((prev) => prev + `{{${varKey}}}`);
  }, []);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const templates = data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-lg border p-2 hover:bg-accent"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mes messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez et gérez vos modèles de messages pour les campagnes et le suivi
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nouveau modèle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["", "linkedin", "whatsapp", "email"].map((ch) => (
          <button
            key={ch || "all"}
            onClick={() => setFilterChannel(ch)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterChannel === ch
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {ch === "" ? "Tous" : CHANNEL_CONFIG[ch as keyof typeof CHANNEL_CONFIG]?.label ?? ch}
          </button>
        ))}
      </div>

      {/* Create/Edit form */}
      {showCreate && (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">
            {editingId ? "Modifier le modèle" : "Nouveau modèle"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Invitation LinkedIn"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Canal</label>
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value as typeof formChannel)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Contenu</label>
            <div className="mb-2 mt-1 flex flex-wrap gap-1">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="rounded bg-muted px-2 py-0.5 text-xs font-mono hover:bg-accent"
                  type="button"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Bonjour {{firstName}}, j'ai vu votre profil chez {{company}}..."
              className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm min-h-[120px]"
              rows={5}
              maxLength={2000}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {formContent.length}/2000
            </p>
          </div>

          {/* Preview */}
          {formContent.trim() && (
            <div className="mt-4 rounded-md border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Aperçu</p>
              <p className="text-sm whitespace-pre-wrap">{applyPreview(formContent)}</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formName.trim() || !formContent.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Enregistrer" : "Créer"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Aucun modèle de message</p>
          <p className="text-sm text-muted-foreground">
            Créez votre premier modèle pour vos campagnes et suivis
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const cfg = CHANNEL_CONFIG[t.channel];
            const Icon = cfg.icon;

            return (
              <div
                key={t.id}
                className="group flex flex-col rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.name}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(t)}
                      className="rounded p-1 hover:bg-accent"
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer ce modèle ?")) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                      className="rounded p-1 hover:bg-destructive/10 text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground line-clamp-3 flex-1">
                  {t.content}
                </p>

                {t.variables_used.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {t.variables_used.map((v) => (
                      <span
                        key={v}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
