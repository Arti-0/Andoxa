"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Phone,
  Calendar,
  ExternalLink,
  Linkedin,
  Mail,
  ArrowLeft,
  Loader2,
  Check,
  SkipForward,
  Pause,
  CheckCircle2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { extractCleanRole } from "@/lib/utils/extract-role";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_COLORS,
  PROSPECT_STATUS_DOT_COLORS,
  type ProspectStatus,
} from "@/lib/types/prospects";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionProspect {
  id: string;
  full_name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  job_title: string | null;
  linkedin: string | null;
  metadata: Record<string, unknown> | null;
  /** CRM pipeline status */
  status: string | null;
  notes: string | null;
  call_duration_s: number;
  call_status: string;
  called_at: string | null;
  outcome: string | null;
}

interface SessionData {
  id: string;
  title: string | null;
  status: string;
  total_duration_s: number;
  created_at: string;
  ended_at: string | null;
  prospects: SessionProspect[];
  notesByProspect: Record<string, Array<{ content: string; author_id: string }>>;
}

function isProspectStatus(s: string | null): s is ProspectStatus {
  return s != null && (PROSPECT_STATUSES as readonly string[]).includes(s);
}

function initials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isPendingCall(p: SessionProspect): boolean {
  return p.call_status === "pending" || p.call_status === "calling";
}

function isDoneCall(p: SessionProspect): boolean {
  return p.call_status === "completed" || p.call_status === "skipped";
}

function getNextPendingProspectId(prospects: SessionProspect[], afterId: string | null): string | null {
  if (!prospects.length) return null;
  const start = afterId ? prospects.findIndex((p) => p.id === afterId) + 1 : 0;
  for (let i = Math.max(0, start); i < prospects.length; i++) {
    if (isPendingCall(prospects[i])) return prospects[i].id;
  }
  for (let i = 0; i < prospects.length; i++) {
    if (isPendingCall(prospects[i])) return prospects[i].id;
  }
  return null;
}

function lastNoteLines(notes: string | null, maxLines: number): { preview: string; truncated: boolean } {
  if (!notes?.trim()) return { preview: "", truncated: false };
  const lines = notes.trim().split(/\r?\n/);
  if (lines.length <= maxLines) return { preview: notes.trim(), truncated: false };
  return { preview: lines.slice(-maxLines).join("\n"), truncated: true };
}

// ─── Session summary (completed session) ─────────────────────────────────────

function CompletedSessionSummary({ session }: { session: SessionData }) {
  const qualified = session.prospects.filter((p) => p.call_status === "completed").length;
  const skipped = session.prospects.filter((p) => p.call_status === "skipped").length;
  const total = session.prospects.length;

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 text-center">
      <div className="space-y-2">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="text-xl font-semibold">Session terminée</h2>
        <p className="text-sm text-muted-foreground">
          {session.title ?? "Session d'appels"} ·{" "}
          {new Date(session.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border bg-muted/30 px-3 py-4">
          <p className="text-2xl font-bold text-foreground">{qualified}</p>
          <p className="text-muted-foreground">Prospects qualifiés</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-4">
          <p className="text-2xl font-bold text-foreground">{skipped}</p>
          <p className="text-muted-foreground">Passés</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{total} prospect{total > 1 ? "s" : ""} au total</p>
      <Link
        href="/call-sessions"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Retour aux sessions
      </Link>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CallSessionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = params?.id as string;

  const [activeProspectId, setActiveProspectId] = useState<string | null>(null);
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [stepFlushPending, setStepFlushPending] = useState(false);
  const [noteSavePending, setNoteSavePending] = useState(false);
  const currentItemRef = useRef<HTMLDivElement>(null);
  const autoCompletedRef = useRef(false);
  const activeProspectIdRef = useRef(activeProspectId);
  activeProspectIdRef.current = activeProspectId;

  const { data: session, isLoading } = useQuery<SessionData>({
    queryKey: ["call-session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/call-sessions/${sessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return json.data;
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
    };

    const filterSession = `id=eq.${sessionId}`;
    const filterBySessionId = `call_session_id=eq.${sessionId}`;

    const channel = supabase
      .channel(`call-session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions", filter: filterSession },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_session_prospects",
          filter: filterBySessionId,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_session_notes",
          filter: filterBySessionId,
        },
        invalidate
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  useEffect(() => {
    if (!session?.prospects?.length) return;
    if (activeProspectId) return;
    if (session.status === "completed") return;
    // Ne pas sélectionner de prospect tant que la session n’est pas démarrée explicitement.
    if (session.status !== "in_progress") return;
    const next = getNextPendingProspectId(session.prospects, null);
    if (next) setActiveProspectId(next);
  }, [session, activeProspectId]);

  useEffect(() => {
    setQuickNoteDraft("");
  }, [activeProspectId]);

  useEffect(() => {
    autoCompletedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeProspectId]);

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/call-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "completed",
          total_duration_s: session?.total_duration_s ?? 0,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? `Erreur ${res.status}`);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
      await queryClient.refetchQueries({ queryKey: ["call-session", sessionId] });
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message || "Impossible de terminer la session"),
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/call-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? `Erreur ${res.status}`);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
      await queryClient.refetchQueries({ queryKey: ["call-session", sessionId] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Impossible de démarrer la session"),
  });

  const allProspectsProcessed =
    session &&
    session.prospects.length > 0 &&
    session.prospects.every((p) => p.call_status === "completed" || p.call_status === "skipped");

  useEffect(() => {
    if (!session || session.status === "completed" || !allProspectsProcessed || autoCompletedRef.current) return;
    // N’auto-compléter que lorsque la session a bien été démarrée (sinon pas de flux prospect côté UI).
    if (session.status !== "in_progress") return;
    autoCompletedRef.current = true;
    void endSessionMutation.mutateAsync().catch(() => {
      autoCompletedRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate identity changes every render
  }, [session?.id, session?.status, allProspectsProcessed]);

  const patchProspectStatusMutation = useMutation({
    mutationFn: async ({ prospectId, status }: { prospectId: string; status: ProspectStatus }) => {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? `Erreur ${res.status}`);
      }
      return res.json() as Promise<SessionProspect>;
    },
    onMutate: async ({ prospectId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["call-session", sessionId] });
      const previous = queryClient.getQueryData<SessionData>(["call-session", sessionId]);
      if (previous) {
        queryClient.setQueryData<SessionData>(["call-session", sessionId], {
          ...previous,
          prospects: previous.prospects.map((p) => (p.id === prospectId ? { ...p, status } : p)),
        });
      }
      return { previous };
    },
    onError: (err: Error, _v, context) => {
      if (context?.previous) queryClient.setQueryData(["call-session", sessionId], context.previous);
      toast.error(err.message || "Impossible de mettre à jour le statut");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
    },
  });

  const appendNoteMutation = useMutation({
    mutationFn: async ({ prospectId, appendedBlock, previousNotes }: { prospectId: string; appendedBlock: string; previousNotes: string }) => {
      const newNotes = previousNotes.trim() ? `${previousNotes.trim()}\n\n${appendedBlock}` : appendedBlock;
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error("Impossible d'enregistrer la note");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
      toast.success("Note enregistrée");
      setQuickNoteDraft("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const flushForProspect = useCallback(
    async (prospectId: string, opts?: { statusOverride?: string }): Promise<boolean> => {
      const sess = queryClient.getQueryData<SessionData>(["call-session", sessionId]);
      if (!sess) return true;
      const p = sess.prospects.find((x) => x.id === prospectId);
      if (!p) return true;

      const status = opts?.statusOverride ?? p.call_status;
      const body: Record<string, unknown> = {
        call_state: {
          status,
          outcome: p.outcome,
          call_duration_s: p.call_duration_s,
          called_at: p.called_at,
        },
      };

      const res = await fetch(
        `/api/call-sessions/${sessionId}/prospects/${prospectId}/complete-step`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json as { error?: { message?: string } })?.error?.message ?? `Erreur ${res.status}`);
        return false;
      }
      await queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
      return true;
    },
    [queryClient, sessionId]
  );

  const advanceAfterStep = useCallback(
    (currentId: string) => {
      const sess = queryClient.getQueryData<SessionData>(["call-session", sessionId]);
      if (!sess) return;
      const next = getNextPendingProspectId(sess.prospects, currentId);
      setActiveProspectId(next);
    },
    [queryClient, sessionId]
  );

  const skipAndNext = useCallback(
    async (currentId: string) => {
      setStepFlushPending(true);
      try {
        const ok = await flushForProspect(currentId, { statusOverride: "skipped" });
        if (!ok) return;
        advanceAfterStep(currentId);
      } finally {
        setStepFlushPending(false);
      }
    },
    [flushForProspect, advanceAfterStep]
  );

  const completeAndNext = useCallback(
    async (currentId: string) => {
      setStepFlushPending(true);
      try {
        const ok = await flushForProspect(currentId, { statusOverride: "completed" });
        if (!ok) return;
        advanceAfterStep(currentId);
      } finally {
        setStepFlushPending(false);
      }
    },
    [flushForProspect, advanceAfterStep]
  );

  const requestJumpTo = useCallback(
    (targetId: string) => {
      if (!session) return;
      const currentId = activeProspectIdRef.current;
      const nextId = currentId ? getNextPendingProspectId(session.prospects, currentId) : null;
      if (targetId !== nextId && nextId != null) {
        const ok = window.confirm(
          "Ce prospect n'est pas le suivant dans l'ordre de la session. Voulez-vous quand même l'afficher ?"
        );
        if (!ok) return;
      }
      setActiveProspectId(targetId);
    },
    [session]
  );

  const pauseSession = useCallback(() => {
    const ok = window.confirm("Mettre la session en pause ? Vous pourrez y revenir plus tard depuis la liste des sessions.");
    if (!ok) return;
    router.push("/call-sessions");
  }, [router]);

  useEffect(() => {
    if (!session || session.status === "completed" || session.status !== "in_progress") return;

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;

      const currentId = activeProspectIdRef.current;
      if (!currentId) return;

      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        void completeAndNext(currentId);
        return;
      }
      if (e.key === "ArrowRight" || (e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        void skipAndNext(currentId);
        return;
      }
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        e.preventDefault();
        pauseSession();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, completeAndNext, skipAndNext, pauseSession]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-muted-foreground">Session introuvable</p>
        <button type="button" onClick={() => router.push("/call-sessions")} className="text-primary hover:underline">
          Retour aux sessions
        </button>
      </div>
    );
  }

  const needsExplicitStart =
    session.status !== "in_progress" && session.status !== "completed";

  if (needsExplicitStart) {
    const prospectCount = session.prospects.length;
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3 lg:px-6">
          <button type="button" onClick={() => router.push("/call-sessions")} className="rounded p-1 hover:bg-accent" aria-label="Retour">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{session.title ?? "Session d'appels"}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(session.created_at).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                En attente
              </span>
            </p>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
          <div className="mx-auto max-w-md space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Session d&apos;appels</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {session.title ?? "Session d'appels"}
            </h2>
            <p className="text-muted-foreground">
              {prospectCount} prospect{prospectCount > 1 ? "s" : ""} avec numéro de téléphone
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startSessionMutation.mutateAsync()}
            disabled={startSessionMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {startSessionMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
            Démarrer la session
          </button>
        </div>
      </div>
    );
  }

  const activeProspect = session.prospects.find((p) => p.id === activeProspectId);
  const isSessionCompleted = session.status === "completed";

  const processedCount = session.prospects.filter(isDoneCall).length;
  const total = session.prospects.length;

  const doneList = session.prospects.filter(isDoneCall);
  const upcomingList = session.prospects.filter((p) => isPendingCall(p) && p.id !== activeProspectId);

  const { preview: notesPreview, truncated: notesTruncated } = lastNoteLines(activeProspect?.notes ?? null, 3);

  const handleSaveQuickNote = () => {
    if (!activeProspect) return;
    const text = quickNoteDraft.trim();
    if (!text) {
      toast.message("Saisissez une note avant d'enregistrer.");
      return;
    }
    const day = new Date().toLocaleDateString("fr-FR");
    const appendedBlock = `[Appel ${day}] ${text}`;
    setNoteSavePending(true);
    appendNoteMutation.mutate(
      {
        prospectId: activeProspect.id,
        appendedBlock,
        previousNotes: activeProspect.notes ?? "",
      },
      { onSettled: () => setNoteSavePending(false) }
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3 lg:px-6">
        <button type="button" onClick={() => router.push("/call-sessions")} className="rounded p-1 hover:bg-accent" aria-label="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{session.title ?? "Session d'appels"}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(session.created_at).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {isSessionCompleted ? (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                Terminée
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                En cours
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left panel */}
        <aside className="flex w-full shrink-0 flex-col border-b bg-card md:h-auto md:w-72 md:border-b-0 md:border-r">
          <div className="shrink-0 border-b px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session d&apos;appels</p>
            <p className="truncate text-sm font-semibold">{session.title ?? "Sans titre"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{processedCount}</span> / {total} prospects traités
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {doneList.map((p) => {
              const done = p.call_status === "completed";
              return (
                <div
                  key={p.id}
                  className="flex cursor-default items-center gap-3 border-b border-border/60 px-3 py-2.5 opacity-50"
                  aria-disabled
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {initials(p.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {done ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" /> : <SkipForward className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      <p className="truncate text-sm">{p.full_name ?? "Inconnu"}</p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {extractCleanRole(p.job_title)}
                      {p.company ? ` · ${p.company}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}

            {activeProspect && !isSessionCompleted && (
              <div
                ref={currentItemRef}
                className="flex items-center gap-3 border-b border-primary bg-accent/30 px-3 py-2.5 ring-2 ring-inset ring-primary/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials(activeProspect.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{activeProspect.full_name ?? "Inconnu"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {extractCleanRole(activeProspect.job_title)}
                    {activeProspect.company ? ` · ${activeProspect.company}` : ""}
                  </p>
                </div>
              </div>
            )}

            {!isSessionCompleted &&
              upcomingList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => requestJumpTo(p.id)}
                  className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {initials(p.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.full_name ?? "Inconnu"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {extractCleanRole(p.job_title)}
                      {p.company ? ` · ${p.company}` : ""}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 pb-8 md:p-6 lg:p-8">
            {isSessionCompleted ? (
              <CompletedSessionSummary session={session} />
            ) : allProspectsProcessed ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Enregistrement de la session…</p>
              </div>
            ) : !activeProspect ? (
              <p className="py-12 text-center text-muted-foreground">Aucun prospect en attente.</p>
            ) : (
              <>
                {/* Prospect card */}
                <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold leading-tight">{activeProspect.full_name ?? "Inconnu"}</h2>
                      {activeProspect.job_title && (
                        <p className="text-sm text-muted-foreground" title={activeProspect.job_title}>
                          {extractCleanRole(activeProspect.job_title)}
                        </p>
                      )}
                      {activeProspect.company && <p className="text-sm text-muted-foreground">{activeProspect.company}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/prospect/${activeProspect.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                      >
                        Ouvrir la fiche complète
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {activeProspect.linkedin && (
                        <a
                          href={activeProspect.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                        >
                          <Linkedin className="h-3 w-3" />
                          Voir sur LinkedIn
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {activeProspect.phone && (
                      <a
                        href={`tel:${activeProspect.phone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 hover:bg-accent"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {activeProspect.phone}
                      </a>
                    )}
                    {activeProspect.email && (
                      <a
                        href={`mailto:${activeProspect.email}`}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 hover:bg-accent"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {activeProspect.email}
                      </a>
                    )}
                  </div>
                  {notesPreview && (
                    <div className="border-t pt-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground/90">{notesPreview}</p>
                      {notesTruncated && (
                        <Link href={`/prospect/${activeProspect.id}`} className="mt-1 inline-block text-xs text-primary hover:underline">
                          voir tout
                        </Link>
                      )}
                    </div>
                  )}
                </section>

                {/* Qualification */}
                <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                  <h3 className="text-sm font-semibold">Qualifier ce prospect</h3>
                  <p className="text-xs text-muted-foreground">
                    Statut CRM actuel :{" "}
                    <span className="font-medium text-foreground">
                      {isProspectStatus(activeProspect.status) ? PROSPECT_STATUS_LABELS[activeProspect.status] : activeProspect.status ?? "—"}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PROSPECT_STATUSES.map((st) => {
                      const selected = activeProspect.status === st;
                      const dot = PROSPECT_STATUS_DOT_COLORS[st];
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={patchProspectStatusMutation.isPending}
                          onClick={() =>
                            patchProspectStatusMutation.mutate({ prospectId: activeProspect.id, status: st })
                          }
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? `${PROSPECT_STATUS_COLORS[st]} border-transparent ring-2 ring-primary`
                              : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                          {PROSPECT_STATUS_LABELS[st]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <label htmlFor="quick-note" className="text-xs font-medium text-muted-foreground">
                      Notes rapides
                    </label>
                    <textarea
                      id="quick-note"
                      value={quickNoteDraft}
                      onChange={(e) => setQuickNoteDraft(e.target.value)}
                      placeholder="Ajouter une note sur cet appel…"
                      rows={3}
                      className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSaveQuickNote}
                      disabled={noteSavePending || appendNoteMutation.isPending}
                      className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {noteSavePending || appendNoteMutation.isPending ? "…" : "Sauvegarder"}
                    </button>
                  </div>
                </section>

                {/* Session controls */}
                <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void skipAndNext(activeProspect.id)}
                      disabled={stepFlushPending}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <span>⏭</span> Prospect suivant
                    </button>
                    <button
                      type="button"
                      onClick={() => void completeAndNext(activeProspect.id)}
                      disabled={stepFlushPending}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-green-600 bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <span>✓</span> Terminer &amp; suivant
                    </button>
                    <button
                      type="button"
                      onClick={pauseSession}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Raccourcis : ↵ Terminer · → ou N Suivant · P ou Échap Pause
                  </p>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
