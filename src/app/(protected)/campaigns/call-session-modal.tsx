"use client";

// 2-step call-session creation wizard.
//
// Flow:
//   1. Prospects — pick a BDD (or skip and add later via the empty-shell
//      schedule_mode = "later" path); "only with phone" is forced ON because
//      a call session without a phone is useless.
//   2. Planification — name, description, start now or schedule later,
//      assignee, call order, advanced settings (WhatsApp follow-up, notify
//      team, duration).
//
// Sends `bdd_ids` to /api/call-sessions when a BDD is selected — the server
// resolves prospects scoped to the workspace. Backwards-compatible with the
// previous "empty shell, add prospects later" flow.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Phone,
  Zap,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type CallOrder = "list" | "random" | "priority";
export type ScheduleMode = "now" | "later";

export interface CreateSessionPayload {
  name: string;
  description?: string;
  scheduleMode: ScheduleMode;
  scheduleDate?: string;
  scheduleTime?: string;
  bdd_id?: string;
  /** Refinements only matter when a BDD is selected. Phone-only is forced. */
  refine_exclude_contacted?: boolean;
  refine_exclude_active?: boolean;
  callOrder?: CallOrder;
  /** Advanced */
  waFollowup?: boolean;
  notifyTeam?: boolean;
  durationMinutes?: number;
}

const DURATIONS: { id: number; label: string }[] = [
  { id: 30, label: "30 min" },
  { id: 60, label: "1h" },
  { id: 120, label: "2h" },
  { id: 240, label: "4h" },
  { id: 0, label: "Illimitée" },
];

const CALL_ORDERS: { id: CallOrder; label: string; hint: string }[] = [
  { id: "list", label: "Ordre de la liste", hint: "Suivre l'ordre d'origine" },
  { id: "random", label: "Aléatoire", hint: "Mélange les prospects" },
  { id: "priority", label: "Priorité", hint: "Statut > date d'activité" },
];

interface BddRow {
  id: string;
  name: string;
  prospect_count?: number | null;
}

function useBddOptions(open: boolean) {
  return useQuery({
    queryKey: ["call-sessions", "wizard-bdds"] as const,
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/bdd?page=1&pageSize=200", {
        credentials: "include",
      });
      if (!res.ok) return [] as BddRow[];
      const json = (await res.json()) as {
        items?: BddRow[];
        data?: { items?: BddRow[] };
      };
      return json.items ?? json.data?.items ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── Stepper ────────────────────────────────────────────────────────────────
function Stepper({
  step,
  maxReached,
  onJump,
}: {
  step: number;
  maxReached: number;
  onJump: (s: number) => void;
}) {
  const labels = ["Prospects", "Planification"];
  return (
    <div className="flex items-center gap-1 border-b px-6 py-3">
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        const reachable = idx <= maxReached;
        return (
          <button
            key={label}
            type="button"
            onClick={() => reachable && onJump(idx)}
            disabled={!reachable}
            className={cn(
              "group inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              active && "text-foreground",
              done && "text-muted-foreground",
              !active && !done && "text-muted-foreground/60",
              reachable && "cursor-pointer hover:bg-muted",
              !reachable && "cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                active && "bg-[#FF6700] text-white",
                done && "bg-emerald-500 text-white",
                !active && !done &&
                  "border border-border bg-background text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : idx}
            </span>
            {label}
            {idx < labels.length && (
              <span className="ml-1 h-px w-6 bg-border" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CallSessionModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateSessionPayload) => void | Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [bddId, setBddId] = useState<string | null>(null);
  const [excludeContacted, setExcludeContacted] = useState(false);
  const [excludeActive, setExcludeActive] = useState(true);

  // Step 2
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<ScheduleMode>("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("14:00");
  const [callOrder, setCallOrder] = useState<CallOrder>("list");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [waFollowup, setWaFollowup] = useState(true);
  const [notifyTeam, setNotifyTeam] = useState(false);
  const [duration, setDuration] = useState(60);

  const nameRef = useRef<HTMLInputElement>(null);

  const { data: bdds = [], isLoading: bddsLoading } = useBddOptions(open);

  const reset = () => {
    setStep(1);
    setMaxReached(1);
    setSubmitting(false);
    setBddId(null);
    setExcludeContacted(false);
    setExcludeActive(true);
    setName("");
    setDescription("");
    setMode("now");
    setDate("");
    setTime("14:00");
    setCallOrder("list");
    setAdvancedOpen(false);
    setWaFollowup(true);
    setNotifyTeam(false);
    setDuration(60);
  };

  useEffect(() => {
    if (!open) {
      const t = setTimeout(reset, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-focus the name input when step 2 mounts.
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => nameRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [step]);

  const selectedBdd = useMemo(
    () => bdds.find((b) => b.id === bddId) ?? null,
    [bdds, bddId],
  );

  const nameValid = name.trim().length >= 3 && name.trim().length <= 80;

  // Step 1 is valid in two cases:
  //   - User picked a BDD (real prospects ready to call).
  //   - User chose "later" — empty shell, add prospects on the session page.
  // The button label below adapts to which path the user is on.
  const step1Valid = !!bddId;
  const step2Valid = nameValid && (mode === "now" || (!!date && !!time));

  const goNext = () => {
    const next = Math.min(step + 1, 2);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  };
  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    if (submitting || !step2Valid) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        scheduleMode: mode,
        scheduleDate: mode === "later" ? date : undefined,
        scheduleTime: mode === "later" ? time : undefined,
        bdd_id: bddId ?? undefined,
        refine_exclude_contacted: bddId ? excludeContacted : undefined,
        refine_exclude_active: bddId ? excludeActive : undefined,
        callOrder,
        waFollowup,
        notifyTeam,
        durationMinutes: duration,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-[#FF6700] text-white">
              <Phone className="size-4" />
            </span>
            Nouvelle session d&apos;appels
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Choisissez la liste de prospects à appeler. Vous pourrez démarrer maintenant ou planifier ensuite."
              : "Donnez un nom à la session et choisissez quand elle démarre."}
          </DialogDescription>
        </DialogHeader>

        <Stepper step={step} maxReached={maxReached} onJump={(n) => setStep(n)} />

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1SessionProspects
              bdds={bdds}
              loading={bddsLoading}
              selected={bddId}
              onSelect={setBddId}
              excludeContacted={excludeContacted}
              setExcludeContacted={setExcludeContacted}
              excludeActive={excludeActive}
              setExcludeActive={setExcludeActive}
            />
          )}
          {step === 2 && (
            <Step2SessionConfig
              name={name}
              setName={setName}
              nameRef={nameRef}
              nameValid={nameValid}
              description={description}
              setDescription={setDescription}
              mode={mode}
              setMode={setMode}
              date={date}
              setDate={setDate}
              time={time}
              setTime={setTime}
              callOrder={callOrder}
              setCallOrder={setCallOrder}
              advancedOpen={advancedOpen}
              setAdvancedOpen={setAdvancedOpen}
              waFollowup={waFollowup}
              setWaFollowup={setWaFollowup}
              notifyTeam={notifyTeam}
              setNotifyTeam={setNotifyTeam}
              duration={duration}
              setDuration={setDuration}
              bddName={selectedBdd?.name ?? null}
            />
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t bg-muted/30 px-6 py-3">
          <div className="text-xs text-muted-foreground">
            Étape <strong className="text-foreground">{step}</strong> sur 2
          </div>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={goPrev} disabled={submitting}>
                <ArrowLeft className="size-3.5" />
                Précédent
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            {step === 1 && (
              <Button onClick={goNext} disabled={!step1Valid}>
                Continuer
                <ArrowRight className="size-3.5" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => void submit()} disabled={!step2Valid || submitting}>
                {mode === "now" ? (
                  <Zap className="size-3.5" />
                ) : (
                  <CalendarDays className="size-3.5" />
                )}
                {submitting
                  ? "Création…"
                  : mode === "now"
                    ? "Créer et démarrer"
                    : "Créer la session"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── STEP 1 ─────────────────────────────────────────────────────────────────
function Step1SessionProspects({
  bdds,
  loading,
  selected,
  onSelect,
  excludeContacted,
  setExcludeContacted,
  excludeActive,
  setExcludeActive,
}: {
  bdds: BddRow[];
  loading: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  excludeContacted: boolean;
  setExcludeContacted: (v: boolean) => void;
  excludeActive: boolean;
  setExcludeActive: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Liste de prospects</Label>
        {loading ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Chargement des listes…
          </div>
        ) : bdds.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Aucune liste — créez-en une depuis le CRM.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {bdds.map((b) => {
              const active = selected === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className={cn(
                    "flex w-full items-center justify-between border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
                    active ? "bg-orange-50" : "hover:bg-muted/50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {b.prospect_count ?? 0} prospects
                    </div>
                  </div>
                  {active && <Check className="size-4 text-[#FF6700]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="mb-1 block">Affinages</Label>
        <div className="rounded-md border bg-muted/30 p-3 text-[12px] text-muted-foreground">
          ✓ <strong className="text-foreground">Uniquement les prospects avec un numéro de téléphone</strong> (forcé — une session sans téléphone n&apos;est pas appelable).
        </div>
        <RefineToggle
          label="Exclure les prospects déjà contactés"
          hint="Garde uniquement les prospects au statut « nouveau »"
          checked={excludeContacted}
          onCheckedChange={setExcludeContacted}
        />
        <RefineToggle
          label="Exclure ceux déjà dans une campagne active"
          hint="Évite les chevauchements"
          checked={excludeActive}
          onCheckedChange={setExcludeActive}
        />
      </div>
    </div>
  );
}

function RefineToggle({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/30">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && (
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
        )}
      </div>
    </label>
  );
}

// ─── STEP 2 ─────────────────────────────────────────────────────────────────
function Step2SessionConfig({
  name,
  setName,
  nameRef,
  nameValid,
  description,
  setDescription,
  mode,
  setMode,
  date,
  setDate,
  time,
  setTime,
  callOrder,
  setCallOrder,
  advancedOpen,
  setAdvancedOpen,
  waFollowup,
  setWaFollowup,
  notifyTeam,
  setNotifyTeam,
  duration,
  setDuration,
  bddName,
}: {
  name: string;
  setName: (v: string) => void;
  nameRef: React.RefObject<HTMLInputElement | null>;
  nameValid: boolean;
  description: string;
  setDescription: (v: string) => void;
  mode: ScheduleMode;
  setMode: (v: ScheduleMode) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  callOrder: CallOrder;
  setCallOrder: (v: CallOrder) => void;
  advancedOpen: boolean;
  setAdvancedOpen: (v: boolean) => void;
  waFollowup: boolean;
  setWaFollowup: (v: boolean) => void;
  notifyTeam: boolean;
  setNotifyTeam: (v: boolean) => void;
  duration: number;
  setDuration: (v: number) => void;
  bddName: string | null;
}) {
  return (
    <div className="space-y-5">
      {bddName && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
          Cible : <strong className="text-foreground">{bddName}</strong>
        </div>
      )}

      <div>
        <Label htmlFor="session-name" className="mb-1.5 block">
          Nom de la session <span className="text-destructive">*</span>
        </Label>
        <Input
          ref={nameRef}
          id="session-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Appels relance leads MQL — 12 mai"
          maxLength={80}
        />
        <div className="mt-1 flex items-center justify-between">
          <span
            className={cn(
              "text-[11.5px]",
              !nameValid && name.length > 0
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {name.length > 0 && name.trim().length < 3
              ? "Au moins 3 caractères."
              : "Le nom apparaît dans la liste des sessions."}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {name.length}/80
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="session-description" className="mb-1.5 block">
          Description <span className="text-muted-foreground">(optionnel)</span>
        </Label>
        <Textarea
          id="session-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Objectif de la session, contexte…"
          rows={3}
          maxLength={500}
        />
      </div>

      <div>
        <Label className="mb-2 block">Démarrage</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("now")}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors",
              mode === "now"
                ? "border-[#FF6700] bg-orange-50"
                : "hover:border-[#FF6700]/40 hover:bg-muted/30",
            )}
          >
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-orange-100 text-[#FF6700]">
              <Zap className="size-4" />
            </span>
            <span>
              <div className="text-[13px] font-semibold">Démarrer maintenant</div>
              <div className="text-[11.5px] text-muted-foreground">
                Disponible immédiatement
              </div>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("later")}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors",
              mode === "later"
                ? "border-[#FF6700] bg-orange-50"
                : "hover:border-[#FF6700]/40 hover:bg-muted/30",
            )}
          >
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-orange-100 text-[#FF6700]">
              <CalendarDays className="size-4" />
            </span>
            <span>
              <div className="text-[13px] font-semibold">Planifier</div>
              <div className="text-[11.5px] text-muted-foreground">
                Démarrera à la date choisie
              </div>
            </span>
          </button>
        </div>
        {mode === "later" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="session-date" className="mb-1.5 block">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="session-time" className="mb-1.5 block">Heure</Label>
              <Input
                id="session-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Ordre d&apos;appel</Label>
        <div className="flex flex-wrap gap-2">
          {CALL_ORDERS.map((o) => {
            const active = callOrder === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setCallOrder(o.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-left text-[12px] transition-colors",
                  active
                    ? "border-[#FF6700] bg-orange-50 text-[#CC5200]"
                    : "hover:border-[#FF6700]/40 hover:bg-muted/30",
                )}
              >
                <div className="font-semibold">{o.label}</div>
                <div className="text-[11px] text-muted-foreground">{o.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      <details
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-md border"
      >
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
          Avancé
        </summary>
        <div className="space-y-3 border-t p-3">
          <RefineToggle
            label="Séquence WhatsApp automatique"
            hint="Envoie un message WhatsApp après un appel sans réponse"
            checked={waFollowup}
            onCheckedChange={setWaFollowup}
          />
          <RefineToggle
            label="Notifier l'équipe"
            hint="Envoie une notification à l'équipe au démarrage"
            checked={notifyTeam}
            onCheckedChange={setNotifyTeam}
          />
          <div>
            <Label className="mb-1.5 block">Durée prévue</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => {
                const active = duration === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDuration(d.id)}
                    className={cn(
                      "rounded-md border px-3 py-1 text-[12px] transition-colors",
                      active
                        ? "border-[#FF6700] bg-orange-50 text-[#CC5200]"
                        : "hover:border-[#FF6700]/40 hover:bg-muted/30",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
