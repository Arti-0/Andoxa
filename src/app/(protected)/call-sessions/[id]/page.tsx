"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
  Phone,
  Loader2,
  Check,
  ArrowLeft,
  User,
  Building2,
  Mail,
} from "lucide-react";
import Link from "next/link";

interface Prospect {
  id: string;
  full_name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
}

interface Note {
  id: string;
  prospect_id: string;
  content: string;
  updated_at: string | null;
}

interface SessionData {
  id: string;
  title: string | null;
  ended_at: string | null;
  prospects: Prospect[];
  notesByProspect: Record<string, Note[]>;
}

function saveNote(
  sessionId: string,
  prospectId: string,
  content: string
): Promise<Note> {
  return fetch(`/api/call-sessions/${sessionId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ prospect_id: prospectId, content }),
  })
    .then((r) => r.json())
    .then((j) => j.data ?? j);
}

export default function CallSessionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string | undefined;

  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["call-session", id],
    queryFn: async () => {
      const res = await fetch(`/api/call-sessions/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as SessionData;
    },
    enabled: !!id,
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/call-sessions/${id}`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-session", id] });
    },
  });

  const handleNoteChange = useCallback(
    (prospectId: string, content: string) => {
      setLocalNotes((prev) => ({ ...prev, [prospectId]: content }));
    },
    []
  );

  const handleSaveNote = useCallback(
    async (prospectId: string) => {
      const content = localNotes[prospectId] ?? "";
      setSaving((prev) => ({ ...prev, [prospectId]: true }));
      try {
        await saveNote(id!, prospectId, content);
        queryClient.invalidateQueries({ queryKey: ["call-session", id] });
        setLocalNotes((prev) => {
          const next = { ...prev };
          delete next[prospectId];
          return next;
        });
      } finally {
        setSaving((prev) => ({ ...prev, [prospectId]: false }));
      }
    },
    [id, localNotes, queryClient]
  );

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Session introuvable</p>
        <Link href="/crm" className="mt-2 text-sm text-primary hover:underline">
          Retour au CRM
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  const isEnded = !!data.ended_at;
  const notesByProspect = data.notesByProspect ?? {};
  const prospects = data.prospects ?? [];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/crm"
            className="rounded-lg border p-2 hover:bg-accent"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {data.title ?? "Session d'appels"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {prospects.length} prospect{prospects.length > 1 ? "s" : ""}
              {isEnded && " · Terminée"}
            </p>
          </div>
        </div>
        {!isEnded && (
          <button
            type="button"
            onClick={() => endSessionMutation.mutate()}
            disabled={endSessionMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {endSessionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Terminer la session
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {prospects.map((p) => {
          const existingNotes = notesByProspect[p.id] ?? [];
          const latestNote = existingNotes[existingNotes.length - 1];
          const currentContent =
            localNotes[p.id] ?? latestNote?.content ?? "";
          const isSaving = saving[p.id];

          return (
            <div
              key={p.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {p.full_name ?? "Sans nom"}
                  </p>
                  {p.company && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {p.company}
                    </p>
                  )}
                  {p.email && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <a
                        href={`mailto:${p.email}`}
                        className="hover:underline"
                      >
                        {p.email}
                      </a>
                    </p>
                  )}
                  {p.phone && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <a
                        href={`tel:${p.phone}`}
                        className="hover:underline"
                      >
                        {p.phone}
                      </a>
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor={`notes-${p.id}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Notes partagées
                </label>
                <textarea
                  id={`notes-${p.id}`}
                  value={currentContent}
                  onChange={(e) => handleNoteChange(p.id, e.target.value)}
                  onBlur={() => {
                    if (currentContent !== (latestNote?.content ?? "")) {
                      handleSaveNote(p.id);
                    }
                  }}
                  placeholder="Ajoutez vos notes d'appel..."
                  className="mt-1 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                  rows={3}
                  readOnly={isEnded}
                />
                {!isEnded && (
                  <button
                    type="button"
                    onClick={() => handleSaveNote(p.id)}
                    disabled={
                      isSaving ||
                      currentContent === (latestNote?.content ?? "")
                    }
                    className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Enregistrer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
