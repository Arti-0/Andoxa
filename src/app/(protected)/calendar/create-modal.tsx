"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initials, avatarColor, type CalEvent } from "./data";
import type { WeekDay } from "./data";
import type { CustomCal } from "./calendars-sidebar";
import {
  useCreateEvent, useUpdateEvent, useProspectSearch, useOrgMembers,
  type CreateEventInput, type OrgMember,
} from "./queries";

type Prefill = { day?: number; start?: number; end?: number } | null;

type Props = {
  open: boolean;
  prefill: Prefill;
  editing?: CalEvent | null;
  onClose: () => void;
  onCreate: () => void;
  weekDays: WeekDay[];
  customCals: CustomCal[];
};

const MEETING_OPTIONS = [
  { id: "meet",     label: "Google Meet" },
  { id: "inperson", label: "En personne" },
  { id: "phone",    label: "Téléphone" },
  { id: "other",    label: "Autre" },
];

type SelectedAttendee =
  | { kind: "member"; id: string; name: string; avatarUrl: string | null; color: string; accent: string }
  | { kind: "email";  id: string; email: string };

function decimalToTimeStr(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timeStrToDecimal(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (isNaN(h) ? 0 : h) + (isNaN(m) ? 0 : m / 60);
}

export function CreateEventModal({ open, prefill, editing, onClose, onCreate, weekDays, customCals }: Props) {
  const isEdit = !!editing;
  const [title, setTitle] = useState("");
  const [calendarId, setCalendarId] = useState("me");
  const [allDay, setAllDay] = useState(false);
  const [platform, setPlatform] = useState("meet");
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");

  const [selectedAttendees, setSelectedAttendees] = useState<SelectedAttendee[]>([]);
  const [attendeeQuery, setAttendeeQuery] = useState("");
  const [showAttendeeSuggest, setShowAttendeeSuggest] = useState(false);

  const [prospectQuery, setProspectQuery] = useState("");
  const [showProspectSuggest, setShowProspectSuggest] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<{ id: string; name: string; company: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [error, setError] = useState<string | null>(null);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const { data: prospectResults = [], isFetching: searchFetching } = useProspectSearch(debouncedQuery);
  const { data: orgMembers = [] } = useOrgMembers();

  // Reset state when modal (re-)opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setCalendarId(editing.calendarId);
      setAllDay(false);
      setPlatform(editing.meeting);
      setSendEmailInvite(true);
      setStartTime(decimalToTimeStr(editing.start));
      setEndTime(decimalToTimeStr(editing.end));
      setSelectedAttendees([]);
      // Best-effort: prospect prefill (we only have name/company, not id)
      if (editing.prospect) {
        setSelectedProspect({ id: "", name: editing.prospect, company: editing.company });
      } else {
        setSelectedProspect(null);
      }
    } else {
      setTitle("");
      setCalendarId("me");
      setAllDay(false);
      setPlatform("meet");
      setSendEmailInvite(true);
      setStartTime(decimalToTimeStr(prefill?.start ?? 10));
      setEndTime(decimalToTimeStr(prefill?.end ?? (prefill?.start != null ? prefill.start + 1 : 11)));
      setSelectedAttendees([]);
      setSelectedProspect(null);
    }
    setAttendeeQuery("");
    setProspectQuery("");
    setDebouncedQuery("");
    setError(null);
  }, [open, editing, prefill]);

  const handleProspectInput = (val: string) => {
    setProspectQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 200);
  };

  // Filter org members locally by query, exclude already-added ones
  const filteredMembers = useMemo<OrgMember[]>(() => {
    const q = attendeeQuery.trim().toLowerCase();
    return orgMembers.filter((m: OrgMember) => {
      if (selectedAttendees.some((a) => a.kind === "member" && a.id === m.id)) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q);
    });
  }, [orgMembers, attendeeQuery, selectedAttendees]);

  if (!open) return null;

  const day = prefill?.day != null
    ? weekDays[prefill.day]
    : (editing && weekDays[editing.day]) ?? weekDays[0] ?? null;

  // Calendar options: "Vous" + custom cals
  const calendarOptions: Array<{ id: string; label: string; color: string; accent: string }> = [
    { id: "me", label: "Vous", color: "#0052D9", accent: "var(--cal2-blue-tint)" },
    ...customCals.map((c) => ({ id: c.id, label: c.name, color: c.color, accent: c.accent })),
  ];
  const selectedCal = calendarOptions.find((c) => c.id === calendarId) ?? calendarOptions[0];

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const addAttendeeFromQuery = () => {
    const q = attendeeQuery.trim();
    if (!q) return;
    if (isEmail(q)) {
      setSelectedAttendees((a) => [...a, { kind: "email", id: q, email: q }]);
      setAttendeeQuery("");
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) { setError("Le titre est requis"); return; }
    if (!day) { setError("Date invalide"); return; }
    const startH = timeStrToDecimal(startTime);
    const endH = timeStrToDecimal(endTime);
    if (endH <= startH) { setError("L'heure de fin doit être après l'heure de début."); return; }
    setError(null);

    const dateStr = day.date;
    const sH = Math.floor(startH); const sM = Math.round((startH - sH) * 60);
    const eH = Math.floor(endH);   const eM = Math.round((endH - eH) * 60);
    const startIso = `${dateStr}T${String(sH).padStart(2,"0")}:${String(sM).padStart(2,"0")}:00`;
    const endIso   = `${dateStr}T${String(eH).padStart(2,"0")}:${String(eM).padStart(2,"0")}:00`;

    const attendeeUserIds = selectedAttendees.filter((a) => a.kind === "member").map((a) => a.id);
    const attendeeEmails  = selectedAttendees.filter((a) => a.kind === "email").map((a) => a.kind === "email" ? a.email : "");

    if (isEdit && editing) {
      updateEvent.mutate({
        id: editing.id,
        title: title.trim(),
        start_time: startIso,
        end_time: endIso,
        event_type: calendarId,
        meeting_kind: platform,
        attendee_user_ids: attendeeUserIds,
      }, {
        onSuccess: () => { onCreate(); onClose(); },
        onError: (e) => setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour"),
      });
    } else {
      const input: CreateEventInput = {
        title: title.trim(),
        start_time: startIso,
        end_time: endIso,
        calendar_id: calendarId,
        meeting_kind: platform,
        google_meet: platform === "meet" && sendEmailInvite,
        prospect_id: selectedProspect?.id || null,
        attendee_user_ids: attendeeUserIds,
        attendee_emails: attendeeEmails,
      };
      createEvent.mutate(input, {
        onSuccess: () => { onCreate(); onClose(); },
        onError: (e) => setError(e instanceof Error ? e.message : "Erreur lors de la création"),
      });
    }
  };

  const isPending = createEvent.isPending || updateEvent.isPending;

  return (
    <>
      <div onClick={onClose} className="cal2-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)", zIndex: 200 }} />
      <div
        className="cal2-fade-in"
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "92%", maxWidth: 580, maxHeight: "88vh", background: "var(--cal2-surface)", borderRadius: 12, zIndex: 201, boxShadow: "0 24px 60px rgba(15,23,42,0.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Solid accent — overflow:hidden on parent ensures it follows the rounded corners */}
        <div style={{ height: 4, background: selectedCal.color, flexShrink: 0 }} />

        <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--cal2-border-faint)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--cal2-text)", letterSpacing: "-0.01em" }}>
            {isEdit ? "Modifier le RDV" : "Nouveau RDV"}
          </h2>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid var(--cal2-border-soft)", background: "var(--cal2-surface)", borderRadius: 7, color: "var(--cal2-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>

          <Field label="Titre" required>
            <input autoFocus type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Discovery avec Marie Dupont"
              style={inputStyle}
            />
          </Field>

          <Field label="Agenda">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {calendarOptions.map((opt) => {
                const active = calendarId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setCalendarId(opt.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", background: active ? `color-mix(in srgb, ${opt.color} 14%, var(--cal2-surface))` : "var(--cal2-surface)", color: active ? opt.color : "var(--cal2-text-muted)", border: `1px solid ${active ? opt.color : "var(--cal2-border-soft)"}`, borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 100ms" }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Date / time */}
          <Field label="Date et heure">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input type="text" defaultValue={day ? `${day.long} ${day.num} ${day.monthFull}` : ""} style={{ ...inputStyle, flex: "1 1 180px" }} readOnly />

              <div style={{ display: "flex", alignItems: "center", gap: 6, visibility: allDay ? "hidden" : "visible" }}>
                <input
                  type="time" value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ ...inputStyle, width: 100, fontVariantNumeric: "tabular-nums" }}
                />
                <span style={{ color: "var(--cal2-text-faint)", fontSize: 12 }}>–</span>
                <input
                  type="time" value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ ...inputStyle, width: 100, fontVariantNumeric: "tabular-nums" }}
                />
              </div>

              <button
                onClick={() => setAllDay(!allDay)}
                style={{ background: "transparent", color: allDay ? "#0052D9" : "var(--cal2-text-muted)", border: "none", fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "4px 6px", display: "flex", alignItems: "center", gap: 4 }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 3, background: allDay ? "#0052D9" : "var(--cal2-surface)", border: allDay ? "1px solid #0052D9" : "1.5px solid var(--cal2-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {allDay && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </span>
                Toute la journée
              </button>
            </div>
          </Field>

          {/* Prospect */}
          <Field label="Prospect" hint="Optionnel">
            <div style={{ position: "relative" }}>
              {selectedProspect ? (
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", background: "var(--cal2-surface-3)", border: "1px solid var(--cal2-border-faint)", borderRadius: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: `color-mix(in srgb, ${avatarColor(selectedProspect.name)} 35%, var(--cal2-surface-2))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--cal2-text-soft)" }}>
                    {initials(selectedProspect.name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--cal2-text)" }}>{selectedProspect.name}</div>
                    <div style={{ fontSize: 11, color: "var(--cal2-text-muted)" }}>{selectedProspect.company}</div>
                  </div>
                  <button onClick={() => setSelectedProspect(null)} style={{ background: "transparent", border: "none", color: "var(--cal2-text-faint)", cursor: "pointer", padding: 4, display: "flex" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ) : (
                <input
                  type="text" value={prospectQuery}
                  onChange={(e) => { handleProspectInput(e.target.value); setShowProspectSuggest(true); }}
                  onFocus={() => setShowProspectSuggest(true)}
                  onBlur={() => setTimeout(() => setShowProspectSuggest(false), 180)}
                  placeholder="Rechercher un prospect…"
                  style={inputStyle}
                />
              )}
              {showProspectSuggest && !selectedProspect && prospectQuery.length >= 2 && (
                <div style={dropdownStyle}>
                  {searchFetching && <div style={emptyStyle}>Recherche…</div>}
                  {!searchFetching && prospectResults.length === 0 && (
                    <div style={emptyStyle}>Aucun résultat</div>
                  )}
                  {prospectResults.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => { setSelectedProspect(p); setProspectQuery(""); setDebouncedQuery(""); }}
                      style={dropdownItemStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cal2-surface-3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: `color-mix(in srgb, ${avatarColor(p.name)} 35%, var(--cal2-surface-2))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 600, color: "var(--cal2-text-soft)", flexShrink: 0 }}>{initials(p.name)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--cal2-text)" }}>{p.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--cal2-text-muted)" }}>{p.company}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* Participants — search org members + free emails */}
          <Field label="Participants" hint="Collègues ou emails">
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: 5, border: "1px solid var(--cal2-border-soft)", borderRadius: 8, background: "var(--cal2-surface)", minHeight: 36 }}>
                {selectedAttendees.map((a) => (
                  <AttendeeChip
                    key={a.id}
                    attendee={a}
                    onRemove={() => setSelectedAttendees((arr) => arr.filter((x) => x.id !== a.id))}
                  />
                ))}
                <input
                  type="text"
                  value={attendeeQuery}
                  onChange={(e) => { setAttendeeQuery(e.target.value); setShowAttendeeSuggest(true); }}
                  onFocus={() => setShowAttendeeSuggest(true)}
                  onBlur={() => setTimeout(() => setShowAttendeeSuggest(false), 180)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAttendeeFromQuery();
                    } else if (e.key === "Backspace" && !attendeeQuery && selectedAttendees.length > 0) {
                      setSelectedAttendees((arr) => arr.slice(0, -1));
                    }
                  }}
                  placeholder={selectedAttendees.length === 0 ? "Rechercher un collègue ou taper un email…" : ""}
                  style={{ flex: 1, minWidth: 160, border: "none", outline: "none", fontSize: 12, padding: "4px 6px", fontFamily: "inherit", background: "transparent" }}
                />
              </div>

              {/* Suggestions */}
              {showAttendeeSuggest && (filteredMembers.length > 0 || (attendeeQuery && isEmail(attendeeQuery))) && (
                <div style={dropdownStyle}>
                  {filteredMembers.slice(0, 8).map((m: OrgMember) => (
                    <button
                      key={m.id}
                      onMouseDown={() => {
                        setSelectedAttendees((arr) => [...arr, { kind: "member", id: m.id, name: m.name, avatarUrl: m.avatarUrl, color: m.color, accent: m.accent }]);
                        setAttendeeQuery("");
                      }}
                      style={dropdownItemStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cal2-surface-3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatarUrl} alt={m.name} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 24, height: 24, borderRadius: "50%", background: `color-mix(in srgb, ${m.color} 22%, var(--cal2-surface))`, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>{m.initials}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--cal2-text)" }}>{m.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--cal2-text-muted)" }}>Collègue</div>
                      </div>
                    </button>
                  ))}
                  {attendeeQuery && isEmail(attendeeQuery) && (
                    <button
                      onMouseDown={addAttendeeFromQuery}
                      style={dropdownItemStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cal2-surface-3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--cal2-surface-2)", color: "var(--cal2-text-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>@</span>
                      <div style={{ fontSize: 12, color: "var(--cal2-text)" }}>
                        Inviter <strong>{attendeeQuery}</strong>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </Field>

          {/* Lieu / Visio */}
          <Field label="Lieu / Visio">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MEETING_OPTIONS.map((opt) => {
                const active = platform === opt.id;
                return (
                  <button
                    key={opt.id} onClick={() => setPlatform(opt.id)}
                    style={{ padding: "6px 11px", background: active ? "var(--cal2-blue-tint)" : "var(--cal2-surface)", color: active ? "#0052D9" : "var(--cal2-text-muted)", border: `1px solid ${active ? "#0052D9" : "var(--cal2-border-soft)"}`, borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {platform === "inperson" && <input type="text" placeholder="Adresse ou lieu" style={{ ...inputStyle, marginTop: 9 }} />}
            {platform === "other" && <input type="text" placeholder="Précisez…" style={{ ...inputStyle, marginTop: 9 }} />}
            {platform === "phone" && <input type="text" placeholder="Numéro de téléphone" style={{ ...inputStyle, marginTop: 9 }} />}
          </Field>

          <Field label="Description" hint="Optionnel">
            <textarea placeholder="Notes, ordre du jour, points à aborder…" style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontFamily: "inherit" }} />
          </Field>

          {/* Email invite toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 4 }}>
            <span
              onClick={() => setSendEmailInvite(!sendEmailInvite)}
              style={{ position: "relative", width: 32, height: 18, background: sendEmailInvite ? "#0052D9" : "var(--cal2-border)", borderRadius: 999, flexShrink: 0, transition: "background 140ms", cursor: "pointer" }}
            >
              <span style={{ position: "absolute", top: 2, left: sendEmailInvite ? 16 : 2, width: 14, height: 14, background: "var(--cal2-surface)", borderRadius: "50%", transition: "left 140ms" }} />
            </span>
            <span style={{ fontSize: 12, color: "var(--cal2-text-soft)" }}>Envoyer une invitation par email aux participants</span>
          </label>

          {error && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, fontSize: 12.5, color: "#B91C1C" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--cal2-border-faint)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--cal2-text-muted)", border: "none", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "8px 4px" }}>Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{ padding: "9px 18px", background: selectedCal.color, color: "var(--cal2-surface)", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 1px 2px ${selectedCal.color}44`, opacity: isPending ? 0.7 : 1, transition: "opacity 120ms" }}
          >
            {isPending
              ? (isEdit ? "Mise à jour…" : "Création…")
              : (isEdit ? "Enregistrer" : "Créer l'événement")}
          </button>
        </div>
      </div>
    </>
  );
}

function AttendeeChip({ attendee, onRemove }: { attendee: SelectedAttendee; onRemove: () => void }) {
  if (attendee.kind === "member") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 4px 3px 4px", background: `color-mix(in srgb, ${attendee.color} 22%, var(--cal2-surface))`, color: attendee.color, borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
        {attendee.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attendee.avatarUrl} alt={attendee.name} style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--cal2-surface)", color: attendee.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700 }}>
            {attendee.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </span>
        )}
        <span style={{ paddingRight: 4 }}>{attendee.name}</span>
        <button
          onClick={onRemove}
          style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.5)", border: "none", color: attendee.color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 4px 3px 8px", background: "var(--cal2-surface-2)", color: "var(--cal2-text-soft)", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
      {attendee.email}
      <button
        onClick={onRemove}
        style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(71,85,105,0.15)", border: "none", color: "var(--cal2-text-soft)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px",
  border: "1px solid var(--cal2-border-soft)", borderRadius: 7,
  fontSize: 12.5, color: "var(--cal2-text)",
  fontFamily: "inherit", background: "var(--cal2-surface)", outline: "none",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
  background: "var(--cal2-surface)", border: "1px solid var(--cal2-border-soft)", borderRadius: 8,
  boxShadow: "0 6px 18px rgba(15,23,42,0.08)", zIndex: 5,
  padding: 4, maxHeight: 220, overflowY: "auto",
};

const dropdownItemStyle: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: 9,
  padding: "7px 9px", background: "transparent", border: "none",
  borderRadius: 6, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
};

const emptyStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 12, color: "var(--cal2-text-faint)",
};

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 500, color: "var(--cal2-text-soft)" }}>
          {label}{required && <span style={{ color: "#EF4444" }}> *</span>}
        </label>
        {hint && <span style={{ fontSize: 10.5, color: "var(--cal2-text-faint)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
