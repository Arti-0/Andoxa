"use client";

import { useState, type ReactNode } from "react";
import {
  TEAM_BY_ID, STATUS_TOKENS, PROSPECT_ACTIVITY,
  fmtTime, initials, avatarColor,
  type CalEvent, type WeekDay, type CalendarColorMap,
} from "./data";
import { useUpdateEvent, useDeleteEvent } from "./queries";

type Props = {
  event: CalEvent | null;
  onClose: () => void;
  onEdit: (event: CalEvent) => void;
  weekDays: WeekDay[];
  calendarColors: CalendarColorMap;
};

export function EventPanel({ event, onClose, onEdit, weekDays, calendarColors }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  if (!event) return null;

  const member = TEAM_BY_ID[event.owner] ?? TEAM_BY_ID.me;
  const tok = STATUS_TOKENS[event.status];
  const calEntry = calendarColors[event.calendarId] ?? calendarColors["me"];
  const dur = event.end - event.start;
  const durLabel = `${Math.floor(dur)}h${String(Math.round((dur % 1) * 60)).padStart(2, "0")}`;
  const dayLabel = weekDays[event.day];
  const accentColor = calEntry?.color ?? "#0052D9";
  const meetUrl = event.googleMeetUrl;

  const handleMarkDone = () => {
    if (event.status === "done") return;
    updateEvent.mutate({ id: event.id, status: "done" }, { onSuccess: onClose });
  };

  const handleDelete = () => {
    deleteEvent.mutate(event.id, { onSuccess: onClose });
  };

  return (
    <>
      <div onClick={onClose} className="cal2-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.22)", backdropFilter: "blur(3px)", zIndex: 100 }} />
      <aside
        className="cal2-panel-slide-in cal2-panel"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "#fff", borderLeft: "1px solid #EDF1F5", boxShadow: "-12px 0 40px rgba(15,23,42,0.08)", zIndex: 101, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Colored accent bar */}
        <div style={{ height: 5, background: accentColor, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: "22px 28px 20px", borderBottom: "1px solid #EDF1F5", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
                {calEntry && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", background: calEntry.tint, color: calEntry.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: calEntry.color }} />{calEntry.name}
                  </span>
                )}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: tok.pillBg, color: tok.pillText, textTransform: "uppercase" }}>
                  {tok.label}
                </span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0F172A", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{event.title}</h2>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* Date / time — prominent card */}
          <Block label="Date et heure">
            <div style={{ padding: "14px 16px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #EDF1F5" }}>
              {dayLabel && (
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 8 }}>
                  {dayLabel.long} {dayLabel.num} {dayLabel.monthFull} {new Date(dayLabel.date).getFullYear()}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 400, color: "#0F172A", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{fmtTime(event.start)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                <span style={{ fontSize: 26, fontWeight: 400, color: "#64748B", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{fmtTime(event.end)}</span>
                <span style={{ fontSize: 12.5, color: "#94A3B8", marginLeft: 4, padding: "3px 8px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 6 }}>{durLabel}</span>
              </div>
            </div>
          </Block>

          {/* Prospect */}
          {event.prospect && (
            <Block label="Prospect">
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#F8FAFC", border: "1px solid #EDF1F5", borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(event.prospect), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#475569", flexShrink: 0 }}>
                  {initials(event.prospect)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", lineHeight: 1.3 }}>{event.prospect}</div>
                  <div style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.3, marginTop: 2 }}>
                    {event.prospectRole ? `${event.prospectRole} · ` : ""}{event.company}
                  </div>
                </div>
                {event.prospectId && (
                  <a href={`/prospect/${event.prospectId}`} style={{ fontSize: 12, color: "#0052D9", fontWeight: 500, textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    Voir
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </a>
                )}
              </div>
              {event.pipelineStage && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ color: "#94A3B8" }}>Étape pipeline :</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "#E8F0FD", color: "#0052D9" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0052D9" }} />
                    {event.pipelineStage}
                  </span>
                </div>
              )}
            </Block>
          )}

          {/* Participants */}
          <Block label="Participants">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Participant name={member?.name ?? "Vous"} sub="Andoxa" color={member?.color ?? "#0052D9"} accent={member?.accent ?? "#E8F0FD"} ini={member?.initials ?? "VO"} status="organizer" />
              {event.prospect && (
                <Participant
                  name={event.prospect} sub={event.company} color="#475569" accent={avatarColor(event.prospect)} ini={initials(event.prospect)}
                  status={event.status === "confirmed" ? "accepted" : event.status === "pending" ? "pending" : "accepted"}
                />
              )}
              {/* Google Calendar imported attendees */}
              {event.gcalAttendees?.filter((a) => !a.self).map((a, i) => {
                const display = a.name?.trim() || a.email || "Invité";
                const status: ParticipantStatus =
                  a.responseStatus === "accepted" ? "accepted"
                  : a.responseStatus === "declined" ? "declined"
                  : a.responseStatus === "tentative" ? "pending"
                  : "pending";
                return (
                  <Participant
                    key={`gcal-${i}`}
                    name={display}
                    sub={a.email && a.name ? a.email : ""}
                    color="#475569"
                    accent={avatarColor(display)}
                    ini={initials(display)}
                    status={status}
                  />
                );
              })}
            </div>
          </Block>

          {/* Lieu / Visio */}
          <Block label={event.meeting === "inperson" ? "Lieu" : "Visio"}>
            {event.meeting !== "inperson" ? (
              <div style={{ padding: "14px 16px", background: "#F8FAFC", border: "1px solid #EDF1F5", borderRadius: 12 }}>
                {meetUrl ? (
                  <a href={meetUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#0052D9", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    {meetUrl.replace(/^https?:\/\//, "")}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: "#64748B", display: "block", marginBottom: 12 }}>
                    {event.meeting === "zoom" ? "Réunion Zoom" : event.meeting === "phone" ? "Appel téléphonique" : "Visioconférence"}
                  </span>
                )}
                {meetUrl && (
                  <a href={meetUrl} target="_blank" rel="noreferrer">
                    <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#0052D9", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 2px rgba(0,82,217,0.28)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                      Rejoindre la réunion
                    </button>
                  </a>
                )}
              </div>
            ) : (
              <div style={{ padding: "12px 16px", background: "#F8FAFC", border: "1px solid #EDF1F5", borderRadius: 12, fontSize: 13, color: "#0F172A" }}>
                {event.company || "Sur place"}
              </div>
            )}
          </Block>

          {/* Description */}
          <Block label="Description">
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, fontSize: 12.5, color: "#64748B", cursor: "pointer", fontFamily: "inherit" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Ajouter une note
            </button>
          </Block>

          {/* Activity */}
          {event.prospect && (
            <Block label="Activité du prospect">
              <div style={{ position: "relative", paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 1, background: "#E2E8F0" }} />
                {PROSPECT_ACTIVITY.default.map((a, i) => (
                  <div key={i} style={{ position: "relative", paddingBottom: 14, fontSize: 12.5 }}>
                    <span style={{ position: "absolute", left: -20, top: 5, width: 10, height: 10, borderRadius: "50%", background: i === 0 ? "#0052D9" : "#CBD5E1", border: "2px solid #fff", boxShadow: "0 0 0 1px #E2E8F0" }} />
                    <div style={{ color: "#0F172A", fontWeight: 500 }}>{a.label}</div>
                    <div style={{ color: "#94A3B8", fontSize: 11.5, marginTop: 2 }}>{a.date}</div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* Workflows */}
          {event.wa && (
            <Block label="Workflows actifs">
              <div style={{ padding: "12px 16px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, fontSize: 12.5, color: "#0F172A" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>Préparation pré-RDV WhatsApp</span>
                </div>
                <div style={{ marginTop: 5, color: "#059669", fontSize: 12 }}>Rappel envoyé avant le RDV</div>
              </div>
            </Block>
          )}

          <div style={{ height: 24 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #EDF1F5", background: "#FAFBFC", flexShrink: 0 }}>
          {confirmDelete ? (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, padding: "12px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#B91C1C", marginBottom: 8 }}>Supprimer cet événement ?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleDelete}
                  disabled={deleteEvent.isPending}
                  style={{ flex: 1, padding: "8px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {deleteEvent.isPending ? "Suppression…" : "Confirmer"}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "8px", background: "#fff", color: "#475569", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => onEdit(event)}
                style={{ width: "100%", padding: "11px 16px", background: accentColor, color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 1px 2px ${accentColor}44`, marginBottom: 10 }}
              >
                Modifier l&apos;événement
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleMarkDone}
                  disabled={event.status === "done" || updateEvent.isPending}
                  style={{ flex: 1, padding: "9px 12px", background: "#fff", color: event.status === "done" ? "#10B981" : "#475569", border: `1px solid ${event.status === "done" ? "#BBF7D0" : "#E2E8F0"}`, borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: event.status === "done" ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: updateEvent.isPending ? 0.6 : 1 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {event.status === "done" ? "Réalisé" : "Marquer réalisé"}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ flex: 1, padding: "9px 12px", background: "#fff", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

type ParticipantStatus = "organizer" | "accepted" | "pending" | "declined";

function Participant({ name, sub, color, accent, ini, status }: { name: string; sub: string; color: string; accent: string; ini: string; status: ParticipantStatus }) {
  const statusLabel = status === "organizer" ? "Organisateur" : status === "accepted" ? "A accepté" : status === "declined" ? "A décliné" : "En attente";
  const statusColor = status === "organizer" ? "#0052D9" : status === "accepted" ? "#10B981" : status === "declined" ? "#EF4444" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <span style={{ width: 32, height: 32, borderRadius: "50%", background: accent, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{ini}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "#0F172A", lineHeight: 1.3, fontWeight: 500 }}>{name}</div>
        {sub && <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.3 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 11.5, color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
    </div>
  );
}
