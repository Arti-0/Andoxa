"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { SessionTopbar } from "./topbar";
import { QueueRail } from "./queue-rail";
import { ProspectFocus } from "./prospect-focus";
import { QualificationBar } from "./qual-bar";
import {
  DEFAULT_SCRIPT,
  OUTCOMES,
  SESSION_META,
  SESSION_PROSPECTS,
  type Outcome,
} from "./session-data";

export default function CallSession2Page({ params }: { params: Promise<{ id: string }> }) {
  // id is captured but the preview uses static data. Real wiring will fetch by id.
  use(params);
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, (Outcome & { time: string }) | undefined>>({});
  const [sessionDurationSec, setSessionDurationSec] = useState(32 * 60 + 14);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [sessionScript, setSessionScript] = useState(DEFAULT_SCRIPT);
  const [individualScripts, setIndividualScripts] = useState<Record<string, string>>({});
  const [notesByProspect, setNotesByProspect] = useState<Record<string, { author: string; time: string; body: string }[]>>({});
  const [focusNotesSignal, setFocusNotesSignal] = useState(0);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [search, setSearch] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const prospects = SESSION_PROSPECTS;
  const current = prospects[currentIdx];

  useEffect(() => {
    const t = setInterval(() => setSessionDurationSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const goNext = () => {
    if (currentIdx < prospects.length - 1) setCurrentIdx((i) => i + 1);
    else setShowRecap(true);
  };
  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const recordOutcome = (outcome: Outcome) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setStatuses((s) => ({ ...s, [current.id]: { ...outcome, time } }));
    toast.success(`${current.firstName} ${current.lastName} — ${outcome.label}`, {
      description: "Fiche CRM mise à jour",
    });
    if (autoAdvance) setTimeout(goNext, 280);
  };

  const setIndividualScript = (pid: string, text: string) => {
    setIndividualScripts((s) => ({ ...s, [pid]: text }));
  };

  const addNote = (pid: string, text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setNotesByProspect((n) => ({
      ...n,
      [pid]: [...(n[pid] ?? []), { author: SESSION_META.agent.name, time, body: text }],
    }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? "";
      const inField = tag === "textarea" || tag === "input" || (e.target as HTMLElement | null)?.isContentEditable;

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
        recordOutcome(o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, showShortcuts, showBooking, showRecap, showCallback, showScriptEditor, autoAdvance]);

  return (
    <div className="flex h-screen flex-col bg-[#FAFAFB] dark:bg-background">
      <SessionTopbar
        campaignName={SESSION_META.campaign}
        goal={SESSION_META.goal}
        completed={Object.keys(statuses).length}
        sessionDurationSec={sessionDurationSec}
        agent={SESSION_META.agent}
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
            addNote={addNote}
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
        onConfirm={(slot) => {
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          setStatuses((s) => ({
            ...s,
            [current.id]: { id: "rdv", label: "RDV pris", color: "#5B2EBF", shortcut: "R", time },
          }));
          toast.success(`RDV pris — ${slot.date} ${slot.time}`);
          setShowBooking(false);
          if (autoAdvance) setTimeout(goNext, 280);
        }}
      />

      <CallbackModal
        open={showCallback}
        onOpenChange={setShowCallback}
        onPick={(label) => {
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          setStatuses((s) => ({
            ...s,
            [current.id]: { id: "callback", label: "À rappeler", color: "#D97706", shortcut: "A", time },
          }));
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
        onExit={() => router.push("/campaigns2")}
      />
    </div>
  );
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
  onConfirm: (slot: { date: string; time: string }) => void;
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
          <Button disabled={!date} onClick={() => onConfirm({ date, time })}>
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
  onPick: (label: string) => void;
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
            <Button key={s} variant="outline" className="justify-start" onClick={() => onPick(s)}>
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
