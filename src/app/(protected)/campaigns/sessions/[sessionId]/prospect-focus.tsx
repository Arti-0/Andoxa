"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CalendarPlus,
  Copy,
  ExternalLink,
  Linkedin,
  MailIcon,
  MapPin,
  PhoneIcon,
  StickyNote,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type SessionProspect, interpolateScript } from "./session-data";

export function ProspectFocus({
  prospect,
  sessionScript,
  individualScripts,
  setIndividualScript,
  onOpenBooking,
  notesByProspect,
  addNote,
  focusNotesSignal,
}: {
  prospect: SessionProspect;
  sessionScript: string;
  individualScripts: Record<string, string>;
  setIndividualScript: (id: string, text: string) => void;
  onOpenBooking: () => void;
  notesByProspect: Record<string, { author: string; time: string; body: string }[]>;
  addNote: (id: string, text: string) => void;
  focusNotesSignal: number;
}) {
  const [scriptOverride, setScriptOverride] = useState<boolean>(
    !!individualScripts[prospect.id],
  );
  const [draftNote, setDraftNote] = useState("");
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setScriptOverride(!!individualScripts[prospect.id]);
    setDraftNote("");
  }, [prospect.id, individualScripts]);

  useEffect(() => {
    if (focusNotesSignal > 0) notesRef.current?.focus();
  }, [focusNotesSignal]);

  const script = scriptOverride
    ? individualScripts[prospect.id] ?? sessionScript
    : sessionScript;
  const interpolated = interpolateScript(script, prospect);
  const notes = notesByProspect[prospect.id] ?? [];

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFB] dark:bg-background">
      <div className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#0052D9] text-base font-bold text-white">
                  {(prospect.firstName[0] + prospect.lastName[0]).toUpperCase()}
                </span>
                <div>
                  <div className="text-xl font-semibold tracking-tight">
                    {prospect.firstName} {prospect.lastName}
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">
                    {prospect.jobTitle} · {prospect.company}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {prospect.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {prospect.headcount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3" />
                      {prospect.sector}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {prospect.linkedin ? (
                  <a
                    href={prospect.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-[#0A66C2] hover:underline"
                  >
                    <Linkedin className="size-3.5" /> LinkedIn
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
                {prospect.email ? (
                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                    <MailIcon className="size-3.5" />
                    {prospect.email}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border bg-[#FAFAFB] p-3 dark:bg-background">
              <PhoneIcon className="size-4 text-[#0052D9]" />
              <span className="text-lg font-bold tabular-nums tracking-tight" style={{ fontFamily: "var(--font-mono, ui-monospace)" }}>
                {prospect.phone}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => {
                  void navigator.clipboard?.writeText(prospect.phone);
                }}
                title="Copier (C)"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button size="sm" onClick={onOpenBooking}>
                <CalendarPlus className="size-3.5" /> Booker un RDV (R)
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Script
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={scriptOverride}
                  onChange={(e) => {
                    setScriptOverride(e.target.checked);
                    if (e.target.checked) setIndividualScript(prospect.id, sessionScript);
                  }}
                />
                Personnaliser pour ce prospect
              </label>
            </div>
            {scriptOverride ? (
              <Textarea
                value={individualScripts[prospect.id] ?? sessionScript}
                onChange={(e) => setIndividualScript(prospect.id, e.target.value)}
                rows={10}
                className="font-mono text-[13px]"
              />
            ) : (
              <pre className="max-h-[400px] whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-[13px] leading-relaxed">
                {interpolated}
              </pre>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes (N)
              </div>
              <span className="text-[11px] text-muted-foreground">{notes.length} note{notes.length > 1 ? "s" : ""}</span>
            </div>
            <Textarea
              ref={notesRef}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Tapez une note rapide… (Cmd+Enter pour enregistrer)"
              rows={3}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (draftNote.trim()) {
                    addNote(prospect.id, draftNote);
                    setDraftNote("");
                  }
                }
              }}
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                disabled={!draftNote.trim()}
                onClick={() => {
                  addNote(prospect.id, draftNote);
                  setDraftNote("");
                }}
              >
                <StickyNote className="size-3.5" />
                Enregistrer
              </Button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {notes.map((n, i) => (
                <div key={i} className="rounded-md bg-muted/40 p-2.5 text-[12.5px]">
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    {n.author} · {n.time}
                  </div>
                  <div className="whitespace-pre-wrap">{n.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Historique
            </div>
            <div className="flex flex-col gap-2">
              {prospect.history.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground">Aucun historique.</div>
              ) : null}
              {prospect.history.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-[12.5px]">
                  <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded bg-muted text-muted-foreground">
                    {h.kind === "linkedin" ? <Linkedin className="size-3" /> : h.kind === "email" ? <MailIcon className="size-3" /> : h.kind === "phone" ? <PhoneIcon className="size-3" /> : <StickyNote className="size-3" />}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{h.label}</div>
                    {h.body ? <div className="mt-0.5 text-muted-foreground">{h.body}</div> : null}
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{h.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
