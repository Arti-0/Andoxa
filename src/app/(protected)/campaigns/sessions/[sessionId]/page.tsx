"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/lib/workspace";
import {
  patchCallSessionProspect,
  postCallSessionNote,
  useCallSessionDetail,
  useOrgMembersForCampaigns,
} from "../../queries";
import { SessionTopbar } from "./topbar";
import { QueueRail } from "./queue-rail";
import { ProspectFocus } from "./prospect-focus";
import { QualificationBar } from "./qual-bar";
import { DEFAULT_SCRIPT, OUTCOMES, type Outcome, type SessionProspect } from "./session-data";

function splitFullName(full: string | null | undefined): { first: string; last: string } {
  const t = full?.trim() ?? "";
  if (!t) return { first: "—", last: "" };
  const parts = t.split(/\s+/);
  return { first: parts[0] ?? "—", last: parts.slice(1).join(" ") };
}

function mapRowToProspect(row: Record<string, unknown>): SessionProspect {
  const { first, last } = splitFullName(row.full_name as string | null | undefined);
  const md = row.metadata as Record<string, unknown> | null | undefined;
  const loc =
    typeof md?.location === "string"
      ? md.location
      : typeof md?.city === "string"
        ? md.city
        : "—";
  return {
    id: row.id as string,
    firstName: first,
    lastName: last,
    company: (row.company as string | null) ?? "—",
    jobTitle: (row.job_title as string | null) ?? "—",
    location: loc,
    headcount: typeof md?.headcount === "string" ? md.headcount : "—",
    sector: typeof md?.sector === "string" ? md.sector : "—",
    phone: (row.phone as string | null) ?? "—",
    phoneFix: typeof md?.phone_fix === "string" ? md.phone_fix : "",
    linkedin: (row.linkedin as string | null) ?? "",
    email: (row.email as string | null) ?? "",
    history: [],
  };
}

export default function CallSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  const detail = useCallSessionDetail(sessionId);
  const members = useOrgMembersForCampaigns();

  const sessionRow = detail.data ?? null;

  const prospects = useMemo(() => {
    const raw = sessionRow?.prospects;
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[]).map(mapRowToProspect);
  }, [sessionRow]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, (Outcome & { time: string }) | undefined>>({});
  const [sessionDurationSec, setSessionDurationSec] = useState(0);

  useEffect(() => {
    const base =
      typeof sessionRow?.total_duration_s === "number" && Number.isFinite(sessionRow.total_duration_s)
        ? sessionRow.total_duration_s
        : 0;
    setSessionDurationSec(base);
  }, [sessionRow]);

  useEffect(() => {
    const t = setInterval(() => setSessionDurationSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /** Sync outcome chips from GET */
  useEffect(() => {
    if (!detail.data?.prospects || !Array.isArray(detail.data.prospects)) return;
    const next: Record<string, (Outcome & { time: string }) | undefined> = {};
    for (const raw of detail.data.prospects as Record<string, unknown>[]) {
      const pid = raw.id as string;
      const out = typeof raw.outcome === "string" ? raw.outcome : raw.outcome == null ? null : String(raw.outcome);
      if (!out || out === "") continue;
      const def = OUTCOMES.find((o) => o.id === out);
      if (!def) continue;
      const called = typeof raw.called_at === "string" ? raw.called_at : null;
      const timeLabel = called
        ? formatShortTime(new Date(called))
        : "—";
      next[pid] = { ...def, time: timeLabel };
    }
    setStatuses(next);
  }, [detail.data]);

  const notesSeed = sessionRow?.notesByProspect as
    | Record<string, Array<Record<string, unknown>> | undefined>
    | undefined;

  const [notesByProspect, setNotesByProspect] = useState<
    Record<string, { author: string; time: string; body: string }[]>
  >({});

  useEffect(() => {
    if (!notesSeed) {
      setNotesByProspect({});
      return;
    }
    const out: Record<string, { author: string; time: string; body: string }[]> = {};
    for (const [pid, list] of Object.entries(notesSeed)) {
      if (!Array.isArray(list)) continue;
      out[pid] = list.map((n) => ({
        author: "Équipe",
        time: typeof n.updated_at === "string" ? formatShortTime(new Date(n.updated_at)) : "—",
        body: String(n.content ?? ""),
      }));
    }
    setNotesByProspect(out);
  }, [notesSeed]);

  useEffect(() => {
    setCurrentIdx(0);
  }, [sessionId, prospects.length]);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [sessionScript, setSessionScript] = useState(DEFAULT_SCRIPT);
  const [individualScripts, setIndividualScripts] = useState<Record<string, string>>({});
  const [focusNotesSignal, setFocusNotesSignal] = useState(0);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [search, setSearch] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const createdBy =
    typeof sessionRow?.created_by === "string" ? sessionRow.created_by : "";
  const creator = members.data?.find((m) => m.id === createdBy);
  const agent = {
    name: creator?.name ?? "Participant",
    initials: creator?.initials ?? "?",
  };

  const campaignName =
    typeof sessionRow?.title === "string" && sessionRow.title.trim()
      ? sessionRow.title.trim()
      : "Session d'appels";

  const current = prospects[currentIdx];

  const invalidateSessionQueries = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["campaigns", "call-session", workspaceId, sessionId] });
    void qc.invalidateQueries({ queryKey: ["campaigns", "sessions", workspaceId] });
  }, [qc, workspaceId, sessionId]);

  const goNext = useCallback(() => {
    if (prospects.length === 0) return setShowRecap(true);
    if (currentIdx < prospects.length - 1) setCurrentIdx((i) => i + 1);
    else setShowRecap(true);
  }, [currentIdx, prospects.length]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }, [currentIdx]);

  const applyOutcomePatch = useCallback(
    async (outcome: Outcome) => {
      if (!current || prospects.length === 0) return;
      const now = new Date();
      const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      await patchCallSessionProspect(sessionId, current.id, {
        outcome: outcome.id,
        called_at: now.toISOString(),
      });
      setStatuses((s) => ({
        ...s,
        [current.id]: {
          ...outcome,
          time: timeLabel,
        },
      }));
      invalidateSessionQueries();
    },
    [current, prospects.length, sessionId, invalidateSessionQueries],
  );

  const recordOutcome = useCallback(
    async (outcome: Outcome) => {
      if (!current) return;
      try {
        await applyOutcomePatch(outcome);
        toast.success(`${current.firstName} ${current.lastName} — ${outcome.label}`, {
          description: "Fiche CRM mise à jour",
        });
        if (autoAdvance) setTimeout(goNext, 280);
      } catch {
        toast.error("Impossible d'enregistrer le résultat");
      }
    },
    [applyOutcomePatch, autoAdvance, current, goNext],
  );

  const setIndividualScript = (pid: string, text: string) => {
    setIndividualScripts((s) => ({ ...s, [pid]: text }));
  };

  const addNote = async (pid: string, text: string) => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    await postCallSessionNote(sessionId, pid, trimmed);
    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setNotesByProspect((n) => ({
      ...n,
      [pid]: [...(n[pid] ?? []), { author: agent.name, time: timeLabel, body: trimmed }],
    }));
    invalidateSessionQueries();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!current) return;

      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? "";
      const inField =
        tag === "textarea" || tag === "input" || (e.target as HTMLElement | null)?.isContentEditable;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        if (inField) return;
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        if (showShortcuts) setShowShortcuts(false);
        else if (showBooking) setShowBooking(false);
        else if (showCallback) setShowCallback(false);
        else if (showScriptEditor) setShowScriptEditor(false);
        else if (showRecap) setShowRecap(false);
        return;
      }
      if (inField) return;
      if (showShortcuts || showBooking || showRecap || showCallback || showScriptEditor) return;

      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "c" || e.key === "C") {
        void navigator.clipboard?.writeText(current.phone);
        toast.success("Numéro copié");
        return;
      }
      if (e.key === "l" || e.key === "L") {
        if (current.linkedin) window.open(current.linkedin, "_blank");
        return;
      }
      if (e.key === "n" || e.key === "N") {
        setFocusNotesSignal((v) => v + 1);
        return;
      }

      const k = e.key.toUpperCase();
      if (k === "R") {
        e.preventDefault();
        setShowBooking(true);
        return;
      }
      if (k === "A") {
        e.preventDefault();
        setShowCallback(true);
        return;
      }
      const o = OUTCOMES.find((x) => x.shortcut === k);
      if (o && o.id !== "rdv" && o.id !== "callback") {
        e.preventDefault();
        void recordOutcome(o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    current,
    goNext,
    goPrev,
    recordOutcome,
    showShortcuts,
    showBooking,
    showCallback,
    showRecap,
    showScriptEditor,
  ]);

  if (detail.isPending) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFB] dark:bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Chargement de la session…</p>
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Button variant="outline" size="sm" onClick={() => router.push("/campaigns")}>
          Retour
        </Button>
        <p className="text-muted-foreground">Session introuvable ou inaccessible.</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-screen flex-col bg-[#FAFAFB] dark:bg-background">
        <SessionTopbar
          campaignName={campaignName}
          goal={0}
          completed={0}
          sessionDurationSec={sessionDurationSec}
          agent={agent}
          onExit={() => router.push("/campaigns")}
          onShortcuts={() => setShowShortcuts(true)}
          onConfigureScript={() => setShowScriptEditor(true)}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[13px] text-muted-foreground">
          <p className="text-foreground font-medium">Cette session n&apos;a aucun prospect.</p>
          <p>Ajoutez des numéros de téléphone côté CRM ou rouvrez la session depuis une liste avec prospects joignables.</p>
          <Button onClick={() => router.push("/campaigns")}>Retour au hub</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#FAFAFB] dark:bg-background">
      <SessionTopbar
        campaignName={campaignName}
        goal={prospects.length}
        completed={Object.keys(statuses).length}
        sessionDurationSec={sessionDurationSec}
        agent={agent}
        onExit={() => setShowRecap(true)}
        onShortcuts={() => setShowShortcuts(true)}
        onConfigureScript={() => setShowScriptEditor(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        <QueueRail
          prospects={prospects}
          currentIdx={currentIdx}
          statuses={statuses}
          onJump={setCurrentIdx}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={currentIdx > 0}
          hasNext={currentIdx < prospects.length - 1}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          searchRef={searchRef}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <ProspectFocus
            prospect={current}
            sessionScript={sessionScript}
            individualScripts={individualScripts}
            setIndividualScript={setIndividualScript}
            onOpenBooking={() => setShowBooking(true)}
            notesByProspect={notesByProspect}
            addNote={(pid, text) => {
              void addNote(pid, text);
            }}
            focusNotesSignal={focusNotesSignal}
          />
          <QualificationBar
            onPick={recordOutcome}
            onCallback={() => setShowCallback(true)}
            onSkip={goNext}
            onPrev={goPrev}
            hasPrev={currentIdx > 0}
            hasNext={currentIdx < prospects.length - 1}
            autoAdvance={autoAdvance}
            setAutoAdvance={setAutoAdvance}
            onOpenBooking={() => setShowBooking(true)}
          />
        </div>
      </div>

      <ShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />

      <BookingModal
        open={showBooking}
        onOpenChange={setShowBooking}
        prospectName={`${current.firstName} ${current.lastName}`}
        onConfirm={async (slot) => {
          const rdv = OUTCOMES.find((o) => o.id === "rdv");
          if (!rdv) return;
          const now = new Date();
          try {
            await patchCallSessionProspect(sessionId, current.id, {
              outcome: "rdv",
              called_at: now.toISOString(),
            });
            const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            setStatuses((s) => ({
              ...s,
              [current.id]: {
                ...rdv,
                time: timeLabel,
              },
            }));
            invalidateSessionQueries();
          } catch {
            toast.error("Impossible d'enregistrer le RDV");
            return;
          }
          toast.success(`RDV pris — ${slot.date} ${slot.time}`);
          setShowBooking(false);
          if (autoAdvance) setTimeout(goNext, 280);
        }}
      />

      <CallbackModal
        open={showCallback}
        onOpenChange={setShowCallback}
        onPick={async (label) => {
          const cb = OUTCOMES.find((o) => o.id === "callback");
          if (!cb) return;
          const now = new Date();
          try {
            await patchCallSessionProspect(sessionId, current.id, {
              outcome: "callback",
              called_at: now.toISOString(),
            });
            const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            setStatuses((s) => ({
              ...s,
              [current.id]: {
                ...cb,
                time: timeLabel,
              },
            }));
            invalidateSessionQueries();
          } catch {
            toast.error("Impossible d'enregistrer le rappel");
            return;
          }
          toast.success(`À rappeler — ${label.toLowerCase()}`);
          setShowCallback(false);
          if (autoAdvance) setTimeout(goNext, 280);
        }}
      />

      <ScriptEditorModal
        open={showScriptEditor}
        onOpenChange={setShowScriptEditor}
        initialValue={sessionScript}
        onSave={(text) => {
          setSessionScript(text);
          setShowScriptEditor(false);
          toast.success("Script de session enregistré");
        }}
      />

      <RecapModal
        open={showRecap}
        onOpenChange={setShowRecap}
        statuses={statuses}
        prospects={prospects}
        durationSec={sessionDurationSec}
        onResume={() => setShowRecap(false)}
        onExit={() => router.push("/campaigns")}
      />
    </div>
  );
}

function formatShortTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---------- Modals (simplified) ----------

function ShortcutsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const ROWS = [
    { keys: "← / →", label: "Prospect précédent / suivant" },
    { keys: "Espace", label: "Suivant" },
    { keys: "C", label: "Copier le numéro" },
    { keys: "L", label: "Ouvrir LinkedIn" },
    { keys: "N", label: "Focus sur les notes" },
    { keys: "R", label: "RDV pris (ouvre booking)" },
    { keys: "A", label: "À rappeler" },
    { keys: "P", label: "Pas de réponse" },
    { keys: "M", label: "Mauvais numéro" },
    { keys: "F", label: "Refus" },
    { keys: "/", label: "Rechercher" },
    { keys: "?", label: "Afficher cette aide" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {ROWS.map((r) => (
            <div key={r.keys} className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5">
              <kbd className="rounded border bg-card px-1.5 py-0.5 text-[11px] font-semibold">{r.keys}</kbd>
              <span className="text-[12.5px]">{r.label}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingModal({
  open,
  onOpenChange,
  prospectName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prospectName: string;
  onConfirm: (slot: { date: string; time: string }) => void | Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("14:00");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réserver un RDV</DialogTitle>
          <DialogDescription>Pour {prospectName}. L&apos;invitation sera envoyée par email.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rdv-date">Date</Label>
            <Input id="rdv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rdv-time">Heure</Label>
            <Input id="rdv-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={!date}
            onClick={() => {
              void onConfirm({ date, time });
            }}
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CallbackModal({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (label: string) => void | Promise<void>;
}) {
  const SLOTS = ["Dans 1 heure", "Cet après-midi", "Demain matin", "La semaine prochaine"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>À rappeler quand ?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {SLOTS.map((s) => (
            <Button
              key={s}
              variant="outline"
              className="justify-start"
              onClick={() => {
                void onPick(s);
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScriptEditorModal({
  open,
  onOpenChange,
  initialValue,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialValue: string;
  onSave: (text: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurer le script de session</DialogTitle>
          <DialogDescription>
            Variables disponibles : {`{{firstName}}, {{lastName}}, {{company}}, {{jobTitle}}, {{phone}}, {{email}}, {{bookingLink}}`}
          </DialogDescription>
        </DialogHeader>
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={14} className="font-mono text-[13px]" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => onSave(value)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecapModal({
  open,
  onOpenChange,
  statuses,
  prospects,
  durationSec,
  onResume,
  onExit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  statuses: Record<string, (Outcome & { time: string }) | undefined>;
  prospects: { id: string }[];
  durationSec: number;
  onResume: () => void;
  onExit: () => void;
}) {
  const counts: Record<string, number> = {};
  Object.values(statuses).forEach((s) => {
    if (s) counts[s.id] = (counts[s.id] ?? 0) + 1;
  });
  const total = Object.values(statuses).filter(Boolean).length;
  const mm = Math.floor(durationSec / 60);
  const ss = durationSec % 60;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Récapitulatif de la session</DialogTitle>
          <DialogDescription>
            {total} prospect{total > 1 ? "s" : ""} traité{total > 1 ? "s" : ""} sur {prospects.length} ·{" "}
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="inline-flex items-center gap-2 text-[13px]">
                <span className="size-2.5 rounded-full" style={{ background: o.color }} />
                {o.label}
              </span>
              <strong className="tabular-nums">{counts[o.id] ?? 0}</strong>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onResume}>
            Reprendre
          </Button>
          <Button onClick={onExit}>Terminer la session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
