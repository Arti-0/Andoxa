"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Phone,
  PhoneOff,
  SkipForward,
  Calendar,
  ExternalLink,
  Linkedin,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  PhoneCall,
  PhoneMissed,
  UserCheck,
  UserX,
  AlertCircle,
  BarChart3,
  Timer,
  Users,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Stopwatch, formatTime } from "@/components/call-sessions/Stopwatch";
import type { StopwatchHandle } from "@/components/call-sessions/Stopwatch";

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

const OUTCOMES = [
  { value: "no_answer", label: "Pas de réponse", icon: PhoneMissed, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "callback", label: "Rappeler", icon: Clock, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { value: "interested", label: "Intéressé", icon: UserCheck, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "not_interested", label: "Pas intéressé", icon: UserX, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  { value: "booked", label: "RDV pris", icon: Calendar, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "wrong_number", label: "Mauvais n°", icon: AlertCircle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-400",
  calling: "bg-amber-400 animate-pulse",
  completed: "bg-green-500",
  skipped: "bg-slate-300",
};

// ─── Completed Stats View ─────────────────────────────────────────────────────

function CompletedSessionStats({ session }: { session: SessionData }) {
  const total = session.prospects.length;
  const called = session.prospects.filter((p) => p.call_status === "completed").length;
  const skipped = session.prospects.filter((p) => p.call_status === "skipped").length;
  const pending = session.prospects.filter((p) => p.call_status === "pending").length;
  const totalCallTime = session.prospects.reduce((a, p) => a + p.call_duration_s, 0);
  const withDuration = session.prospects.filter((p) => p.call_duration_s > 0);
  const avgCall = withDuration.length > 0 ? Math.round(totalCallTime / withDuration.length) : 0;
  const paused = Math.max(0, session.total_duration_s - totalCallTime);
  const answered = session.prospects.filter(
    (p) => p.outcome && !["no_answer", "wrong_number"].includes(p.outcome)
  ).length;
  const booked = session.prospects.filter((p) => p.outcome === "booked").length;
  const interested = session.prospects.filter((p) => p.outcome === "interested").length;
  const callback = session.prospects.filter((p) => p.outcome === "callback").length;
  const notInterested = session.prospects.filter((p) => p.outcome === "not_interested").length;
  const noAnswer = session.prospects.filter((p) => p.outcome === "no_answer").length;
  const wrongNumber = session.prospects.filter((p) => p.outcome === "wrong_number").length;
  const contactRate = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Résumé de la session</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Timer} label="Durée totale" value={formatTime(session.total_duration_s)} />
        <StatCard icon={Phone} label="Temps en appel" value={formatTime(totalCallTime)} />
        <StatCard icon={Clock} label="Temps en pause" value={formatTime(paused)} />
        <StatCard icon={BarChart3} label="Appel moyen" value={formatTime(avgCall)} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Prospects" value={`${total}`} />
        <StatCard icon={PhoneCall} label="Appelés" value={`${called}`} />
        <StatCard icon={TrendingUp} label="Taux de contact" value={`${contactRate}%`} />
        <StatCard icon={Calendar} label="RDV pris" value={`${booked}`} />
      </div>

      {/* Outcome breakdown */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Détail des résultats</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Intéressés", count: interested, color: "text-green-600" },
            { label: "RDV pris", count: booked, color: "text-blue-600" },
            { label: "Rappeler", count: callback, color: "text-amber-600" },
            { label: "Pas intéressé", count: notInterested, color: "text-red-600" },
            { label: "Pas de réponse", count: noAnswer, color: "text-slate-500" },
            { label: "Mauvais n°", count: wrongNumber, color: "text-orange-600" },
            { label: "Passés", count: skipped, color: "text-slate-400" },
            { label: "Non appelés", count: pending, color: "text-slate-300" },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className={`font-semibold ${color}`}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

// ─── Completed Prospect Detail ──────────────────────────────────────────────

function CompletedProspectDetail({ prospect, session }: { prospect: SessionProspect; session: SessionData }) {
  const outcomeInfo = OUTCOMES.find((o) => o.value === prospect.outcome);
  const notes = session.notesByProspect?.[prospect.id];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">{prospect.full_name ?? "Inconnu"}</h2>
        <Link
          href={`/prospect/${prospect.id}`}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Voir la fiche <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {prospect.job_title && <p className="text-sm text-muted-foreground">{prospect.job_title}</p>}
      {prospect.company && <p className="text-sm text-muted-foreground">{prospect.company}</p>}

      <div className="flex flex-wrap gap-2">
        {prospect.phone && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm">
            <Phone className="h-3.5 w-3.5" /> {prospect.phone}
          </span>
        )}
        {prospect.email && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm">
            <Mail className="h-3.5 w-3.5" /> {prospect.email}
          </span>
        )}
        {prospect.linkedin && (
          <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Call summary */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Résumé de l&apos;appel</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Statut</span>
            <p className="font-medium capitalize">{prospect.call_status === "completed" ? "Appelé" : prospect.call_status === "skipped" ? "Passé" : "Non appelé"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Durée</span>
            <p className="font-medium">{prospect.call_duration_s > 0 ? formatTime(prospect.call_duration_s) : "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Appelé à</span>
            <p className="font-medium">{prospect.called_at ? new Date(prospect.called_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Résultat</span>
            {outcomeInfo ? (
              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${outcomeInfo.color}`}>
                <outcomeInfo.icon className="h-3 w-3" />
                {outcomeInfo.label}
              </span>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && notes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Notes</h3>
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="rounded-lg border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                {n.content}
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [localContact, setLocalContact] = useState<Record<string, { email: string; phone: string }>>({});
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [globalElapsed, setGlobalElapsed] = useState(0);
  const [sessionTimerStarted, setSessionTimerStarted] = useState(false);
  const [stepFlushPending, setStepFlushPending] = useState(false);
  const globalStopwatchRef = useRef<StopwatchHandle>(null);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localContactRef = useRef(localContact);
  localContactRef.current = localContact;
  const bookingDateRef = useRef(bookingDate);
  bookingDateRef.current = bookingDate;
  const bookingNotesRef = useRef(bookingNotes);
  bookingNotesRef.current = bookingNotes;
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
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!session?.prospects?.length) return;
    if (activeProspectId) return;
    if (session.status === "completed") return; // show stats view by default
    const first = session.prospects.find((p) => p.call_status === "pending") ?? session.prospects[0];
    setActiveProspectId(first.id);
  }, [session, activeProspectId]);

  useEffect(() => {
    if (!session?.notesByProspect) return;
    const initial: Record<string, string> = {};
    for (const [pid, notes] of Object.entries(session.notesByProspect)) {
      if (notes?.length) initial[pid] = notes[0].content;
    }
    setLocalNotes((prev) => ({ ...initial, ...prev }));
  }, [session?.notesByProspect]);

  useEffect(() => {
    if (!activeProspectId || !session) return;
    setLocalContact((prev) => {
      if (prev[activeProspectId]) return prev;
      const p = session.prospects.find((x) => x.id === activeProspectId);
      if (!p) return prev;
      return {
        ...prev,
        [activeProspectId]: { email: p.email ?? "", phone: p.phone ?? "" },
      };
    });
  }, [activeProspectId, session]);

  const updateProspectMutation = useMutation({
    mutationFn: async (payload: { prospectId: string; status?: string; call_duration_s?: number; called_at?: string; outcome?: string }) => {
      const { prospectId, ...body } = payload;
      const res = await fetch(`/api/call-sessions/${sessionId}/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? `Erreur ${res.status}`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] }),
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la mise à jour du prospect"),
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/call-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed", total_duration_s: globalElapsed }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? `Erreur ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
      toast.success("Session terminée");
    },
    onError: (err: Error) => toast.error(err.message || "Impossible de terminer la session"),
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ prospectId, content }: { prospectId: string; content: string }) => {
      const res = await fetch(`/api/call-sessions/${sessionId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prospect_id: prospectId, content }),
      });
      if (!res.ok) throw new Error("Erreur de sauvegarde des notes");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bookingMutation = useMutation({
    mutationFn: async (payload: { prospect_id: string; scheduled_for?: string; notes?: string }) => {
      const res = await fetch(`/api/call-sessions/${sessionId}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? `Erreur ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
      setShowBookingForm(false);
      setBookingDate("");
      setBookingNotes("");
      toast.success("RDV réservé");
    },
    onError: (err: Error) => toast.error(err.message || "Impossible de réserver le RDV"),
  });

  const handleNoteChange = useCallback(
    (prospectId: string, content: string) => {
      setLocalNotes((prev) => ({ ...prev, [prospectId]: content }));
      if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
      noteTimerRef.current = setTimeout(() => {
        saveNoteMutation.mutate({ prospectId, content });
      }, 1500);
    },
    [saveNoteMutation]
  );

  const handleStartCall = useCallback(
    (prospectId: string) => {
      if (!sessionTimerStarted) {
        globalStopwatchRef.current?.start();
        setSessionTimerStarted(true);
      }
      updateProspectMutation.mutate({
        prospectId,
        status: "calling",
        called_at: new Date().toISOString(),
      });
    },
    [updateProspectMutation, sessionTimerStarted]
  );

  const handleStopCall = useCallback(
    (prospectId: string, durationSeconds: number) => {
      updateProspectMutation.mutate({
        prospectId,
        status: "completed",
        call_duration_s: durationSeconds,
      });
    },
    [updateProspectMutation]
  );

  const handleOutcome = useCallback(
    (prospectId: string, outcome: string) => {
      updateProspectMutation.mutate({ prospectId, outcome, status: "completed" });
    },
    [updateProspectMutation]
  );

  const flushForProspect = useCallback(
    async (prospectId: string, opts?: { statusOverride?: string }): Promise<boolean> => {
      const sess = queryClient.getQueryData<SessionData>(["call-session", sessionId]);
      if (!sess) return true;
      const p = sess.prospects.find((x) => x.id === prospectId);
      if (!p) return true;

      const lc = localContactRef.current[prospectId] ?? {
        email: p.email ?? "",
        phone: p.phone ?? "",
      };
      const prospect: { email?: string; phone?: string } = {};
      const emailT = (lc.email ?? "").trim();
      const phoneT = (lc.phone ?? "").trim();
      const prevE = (p.email ?? "").trim().toLowerCase();
      if (emailT.toLowerCase() !== prevE) prospect.email = lc.email ?? "";
      const prevP = (p.phone ?? "").trim();
      if (phoneT !== prevP) prospect.phone = lc.phone ?? "";

      const bd = bookingDateRef.current.trim();
      const bn = bookingNotesRef.current.trim();
      const isActiveBooking = activeProspectIdRef.current === prospectId;
      const booking =
        isActiveBooking && (bd || bn)
          ? { ...(bd ? { scheduled_for: bd } : {}), ...(bn ? { notes: bn } : {}) }
          : undefined;

      const status = opts?.statusOverride ?? p.call_status;
      const body: Record<string, unknown> = {
        call_state: {
          status,
          outcome: p.outcome,
          call_duration_s: p.call_duration_s,
          called_at: p.called_at,
        },
      };
      if (Object.keys(prospect).length) body.prospect = prospect;
      if (booking && Object.keys(booking).length) body.booking = booking;

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
      if (isActiveBooking && (bd || bn)) {
        setBookingDate("");
        setBookingNotes("");
        setShowBookingForm(false);
        toast.success("RDV enregistré");
      }
      await queryClient.invalidateQueries({ queryKey: ["call-session", sessionId] });
      return true;
    },
    [queryClient, sessionId]
  );

  const advanceToNext = useCallback(
    (currentId: string) => {
      const sess = queryClient.getQueryData<SessionData>(["call-session", sessionId]);
      if (!sess) return;
      const idx = sess.prospects.findIndex((p) => p.id === currentId);
      const next = sess.prospects.find((p, i) => i > idx && p.call_status === "pending");
      if (next) setActiveProspectId(next.id);
      else if (idx + 1 < sess.prospects.length) setActiveProspectId(sess.prospects[idx + 1].id);
    },
    [queryClient, sessionId]
  );

  const goToNext = useCallback(
    async (currentId: string) => {
      setStepFlushPending(true);
      try {
        const ok = await flushForProspect(currentId);
        if (!ok) return;
        advanceToNext(currentId);
      } finally {
        setStepFlushPending(false);
      }
    },
    [flushForProspect, advanceToNext]
  );

  const handleSkip = useCallback(
    async (prospectId: string) => {
      setStepFlushPending(true);
      try {
        const ok = await flushForProspect(prospectId, { statusOverride: "skipped" });
        if (!ok) return;
        advanceToNext(prospectId);
      } finally {
        setStepFlushPending(false);
      }
    },
    [flushForProspect, advanceToNext]
  );

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
        <button onClick={() => router.push("/crm")} className="text-primary hover:underline">
          Retour au CRM
        </button>
      </div>
    );
  }

  const activeProspect = session.prospects.find((p) => p.id === activeProspectId);
  const isCompleted = session.status === "completed";

  // Stats
  const completed = session.prospects.filter((p) => p.call_status === "completed").length;
  const totalCallTime = session.prospects.reduce((a, p) => a + p.call_duration_s, 0);
  const completedWithDuration = session.prospects.filter((p) => p.call_duration_s > 0);
  const avgCallTime = completedWithDuration.length > 0 ? Math.round(totalCallTime / completedWithDuration.length) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 lg:px-8 lg:py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/crm")} className="rounded p-1 hover:bg-accent" aria-label="Retour">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-semibold">{session.title ?? "Session d'appels"}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              }`}>
                {isCompleted ? "Terminée" : "En cours"}
              </span>
              <span>{completed}/{session.prospects.length} appelés</span>
              <span>Moy: {formatTime(avgCallTime)}</span>
              <span>Total: {formatTime(totalCallTime)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isCompleted && (
            <Stopwatch
              ref={globalStopwatchRef}
              size="sm"
              onTick={setGlobalElapsed}
              onStop={(d) => setGlobalElapsed(d)}
            />
          )}
          {!isCompleted && (
            <button
              onClick={() => endSessionMutation.mutate()}
              disabled={endSessionMutation.isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {endSessionMutation.isPending ? "…" : "Terminer"}
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left panel: prospect list */}
        <div className="w-full md:w-72 lg:w-80 xl:w-96 shrink-0 overflow-y-auto border-r bg-card max-h-48 md:max-h-none">
          {session.prospects.map((p) => {
            const isActive = p.id === activeProspectId;
            const outcomeInfo = OUTCOMES.find((o) => o.value === p.outcome);
            return (
              <button
                key={p.id}
                onClick={() => setActiveProspectId(p.id)}
                className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                  isActive ? "bg-accent" : ""
                }`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[p.call_status] ?? STATUS_COLORS.pending}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.full_name ?? "Inconnu"}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.company ?? ""}</p>
                </div>
                <div className="shrink-0 text-right">
                  {p.call_duration_s > 0 && (
                    <span className="text-xs text-muted-foreground">{formatTime(p.call_duration_s)}</span>
                  )}
                  {outcomeInfo && (
                    <span className={`mt-0.5 block rounded px-1.5 py-0.5 text-[10px] font-medium ${outcomeInfo.color}`}>
                      {outcomeInfo.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 xl:p-10">
          {isCompleted ? (
            <div className="mx-auto max-w-3xl xl:max-w-4xl">
              {!activeProspect ? (
                <CompletedSessionStats session={session} />
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setActiveProspectId(null)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour aux statistiques
                  </button>
                  <CompletedProspectDetail prospect={activeProspect} session={session} />
                </div>
              )}
            </div>
          ) : !activeProspect ? (
            <p className="text-center text-muted-foreground">Sélectionnez un prospect</p>
          ) : (
            <div className="mx-auto max-w-3xl xl:max-w-4xl space-y-6">
              {/* Prospect info */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{activeProspect.full_name ?? "Inconnu"}</h2>
                {activeProspect.job_title && (
                  <p className="text-muted-foreground">{activeProspect.job_title}</p>
                )}
                {activeProspect.company && (
                  <p className="text-sm text-muted-foreground">{activeProspect.company}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {activeProspect.phone && (
                    <a
                      href={`tel:${activeProspect.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                    >
                      <Phone className="h-4 w-4" />
                      {activeProspect.phone}
                    </a>
                  )}
                  {activeProspect.email && (
                    <a
                      href={`mailto:${activeProspect.email}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <Mail className="h-4 w-4" />
                      {activeProspect.email}
                    </a>
                  )}
                  {activeProspect.linkedin && (
                    <a
                      href={activeProspect.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor={`call-email-${activeProspect.id}`} className="text-xs font-medium text-muted-foreground">
                      E-mail
                    </label>
                    <input
                      id={`call-email-${activeProspect.id}`}
                      type="email"
                      autoComplete="email"
                      value={localContact[activeProspect.id]?.email ?? ""}
                      onChange={(e) =>
                        setLocalContact((prev) => ({
                          ...prev,
                          [activeProspect.id]: {
                            email: e.target.value,
                            phone: prev[activeProspect.id]?.phone ?? activeProspect.phone ?? "",
                          },
                        }))
                      }
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`call-phone-${activeProspect.id}`} className="text-xs font-medium text-muted-foreground">
                      Téléphone
                    </label>
                    <input
                      id={`call-phone-${activeProspect.id}`}
                      type="tel"
                      autoComplete="tel"
                      value={localContact[activeProspect.id]?.phone ?? ""}
                      onChange={(e) =>
                        setLocalContact((prev) => ({
                          ...prev,
                          [activeProspect.id]: {
                            email: prev[activeProspect.id]?.email ?? activeProspect.email ?? "",
                            phone: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                      placeholder="+33…"
                    />
                  </div>
                </div>
              </div>

              {/* Call controls */}
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Appel</h3>
                  {activeProspect.call_status === "completed" && activeProspect.call_duration_s > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Durée : {formatTime(activeProspect.call_duration_s)}
                    </span>
                  )}
                </div>

                {activeProspect.call_status === "pending" && (
                  <button
                    onClick={() => handleStartCall(activeProspect.id)}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Démarrer l&apos;appel
                  </button>
                )}

                {activeProspect.call_status === "calling" && (
                  <Stopwatch
                    autoStart
                    size="md"
                    onStop={(d) => handleStopCall(activeProspect.id, d)}
                  />
                )}

                {/* Outcome buttons */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Résultat</p>
                  <div className="flex flex-wrap gap-2">
                    {OUTCOMES.map((o) => {
                      const Icon = o.icon;
                      const isSelected = activeProspect.outcome === o.value;
                      return (
                        <button
                          key={o.value}
                          onClick={() => handleOutcome(activeProspect.id, o.value)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            isSelected ? o.color + " ring-2 ring-primary" : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t pt-3">
                  <button
                    onClick={() => setShowBookingForm((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Réserver un RDV
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSkip(activeProspect.id)}
                    disabled={stepFlushPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Passer
                  </button>
                  <button
                    type="button"
                    onClick={() => void goToNext(activeProspect.id)}
                    disabled={stepFlushPending}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {stepFlushPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <SkipForward className="h-3.5 w-3.5" />
                    )}
                    Prospect suivant
                  </button>
                </div>

                {/* Quick booking form */}
                {showBookingForm && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold">Réservation rapide</p>
                    <input
                      type="datetime-local"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                    />
                    <textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Notes..."
                      className="w-full resize-none rounded-md border bg-background px-3 py-1.5 text-sm"
                      rows={2}
                    />
                    <button
                      onClick={() =>
                        bookingMutation.mutate({
                          prospect_id: activeProspect.id,
                          scheduled_for: bookingDate || undefined,
                          notes: bookingNotes || undefined,
                        })
                      }
                      disabled={bookingMutation.isPending}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {bookingMutation.isPending ? "…" : "Confirmer"}
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Notes partagées</h3>
                <textarea
                  value={localNotes[activeProspect.id] ?? ""}
                  onChange={(e) => handleNoteChange(activeProspect.id, e.target.value)}
                  placeholder="Vos notes sur ce prospect..."
                  className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
