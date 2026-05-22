"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  TEAM_BY_ID, STATUS_TOKENS, PROSPECT_ACTIVITY,
  fmtTime, initials, avatarColor,
  type CalEvent, type WeekDay, type CalendarColorMap,
} from "./data";
import {
  useUpdateEvent, useDeleteEvent,
  type OrgMember,
} from "./queries";

type ConfirmAction = null | "done" | "noshow" | "delete";

type Props = {
  event: CalEvent | null;
  onClose: () => void;
  onEdit: (event: CalEvent) => void;
  weekDays: WeekDay[];
  calendarColors: CalendarColorMap;
  /** Org members (excluding self), used to resolve creator + colleague names. */
  orgMembers?: OrgMember[];
  /** Current user's id, used to label them as "Vous" when they're the creator. */
  currentUserId?: string | null;
};

type ResolvedMember = {
  name: string;
  initials: string;
  color: string;
  accent: string;
  avatarUrl: string | null;
};

/**
 * Resolve a user id to a display profile, preferring "Vous" for the current
 * user. Returns avatarUrl when the orgMembers row exposes one so the panel
 * can show the colleague's profile picture instead of just initials.
 *
 * NB: useOrgMembers filters out self, so the current user never has an
 * avatarUrl here — they're rendered as "Vous" with initials regardless.
 */
function resolveMember(
  userId: string | null | undefined,
  orgMembers: OrgMember[],
  currentUserId: string | null | undefined,
): ResolvedMember | null {
  if (!userId) return null;
  if (currentUserId && userId === currentUserId) {
    return {
      name: "Vous",
      initials: "VO",
      color: "#0052D9",
      accent: "var(--cal2-blue-tint)",
      avatarUrl: null,
    };
  }
  const match = orgMembers.find((m) => m.id === userId);
  if (match) {
    return {
      name: match.name,
      initials: match.initials,
      color: match.color,
      accent: match.accent,
      avatarUrl: match.avatarUrl ?? null,
    };
  }
  return null;
}

export function EventPanel({
  event,
  onClose,
  onEdit,
  weekDays,
  calendarColors,
  orgMembers = [],
  currentUserId = null,
}: Props) {
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  useEffect(() => {
    setConfirm(null);
  }, [event?.id]);

  if (!event) return null;

  const eventDbId = event.id.split("__")[0]!;

  // Always display the creator as organisateur — independent of which
  // colleague's column the event is being viewed from. Falls back to the
  // local TEAM map for any legacy event that doesn't carry creatorId yet.
  const creatorMember =
    resolveMember(event.creatorId ?? null, orgMembers, currentUserId) ??
    TEAM_BY_ID[event.owner] ??
    TEAM_BY_ID.me;
  const colleagueMembers = (event.attendeeUserIds ?? [])
    .map((uid) => resolveMember(uid, orgMembers, currentUserId))
    .filter((m): m is NonNullable<typeof m> => m !== null);
  // Only the creator can modify / qualify / delete. Colleague participants
  // get a read-only sidesheet — including for legacy events without a
  // creatorId where we fall back to "true" so the user isn't locked out.
  const isOrganiser =
    !event.creatorId || !currentUserId || event.creatorId === currentUserId;
  // External (read-only) holiday / vacances events get a different visual
  // treatment: no participants, no visio, no edit footer, and a softer
  // header — they're informational, not actionable.
  const externalKind: "holidays" | "vacances" | null =
    event.owner === "holidays" ? "holidays"
    : event.owner === "vacances" ? "vacances"
    : null;
  const isExternal = externalKind !== null || event.channel === "Externe";
  const externalToken = externalKind === "holidays"
    ? { label: "Jour férié", color: "#DC2626", tint: "#FEF2F2" }
    : externalKind === "vacances"
    ? { label: "Vacances scolaires · Zone A", color: "#D97706", tint: "#FFFBEB" }
    : null;
  // Hide the INTERNE status pill on externals — it's redundant with the
  // calmer "Jour férié" / "Vacances" badge and adds visual noise.
  const showStatusPill = !isExternal && event.status !== "confirmed";
  const tok = STATUS_TOKENS[event.status];
  const calEntry = calendarColors[event.calendarId] ?? calendarColors["me"];
  const dur = event.end - event.start;
  const durLabel = `${Math.floor(dur)}h${String(Math.round((dur % 1) * 60)).padStart(2, "0")}`;
  const dayLabel = weekDays[event.day];
  // Externals get a muted accent so the sidesheet reads as a quiet info card
  // rather than a working surface with primary actions.
  const accentColor = externalToken?.color ?? calEntry?.color ?? "#0052D9";
  const meetUrl = event.googleMeetUrl;
  const isAllDayEvent = event.isAllDay === true;

  const handleMarkDone = () => {
    if (event.status === "done") return;
    updateEvent.mutate({ id: eventDbId, status: "done" }, { onSuccess: onClose });
  };

  const handleMarkNoShow = () => {
    if (event.status === "noshow") return;
    updateEvent.mutate({ id: eventDbId, status: "noshow" }, { onSuccess: onClose });
  };

  const handleDelete = () => {
    deleteEvent.mutate(eventDbId, { onSuccess: onClose });
  };

  const locationLabel =
    event.meeting === "inperson" ? "Lieu"
    : event.meeting === "phone" ? "Téléphone"
    : "Visio";
  const locationDetail = event.location?.trim() || null;
  const descriptionText = event.description?.trim() ?? "";

  return (
    <>
      <div onClick={onClose} className="cal2-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.22)", backdropFilter: "blur(3px)", zIndex: 100 }} />
      <aside
        className="cal2-panel-slide-in cal2-panel"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "var(--cal2-surface)", borderLeft: "1px solid var(--cal2-border-faint)", boxShadow: "-12px 0 40px rgba(15,23,42,0.08)", zIndex: 101, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Colored accent bar — thinner and muted for read-only externals
            so the panel reads as an informational card, not a working
            surface with primary actions. */}
        <div
          style={{
            height: isExternal ? 2 : 5,
            background: isExternal
              ? `color-mix(in srgb, ${accentColor} 60%, var(--cal2-surface))`
              : accentColor,
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div style={{ padding: "22px 28px 20px", borderBottom: "1px solid var(--cal2-border-faint)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
                {externalToken ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "4px 11px 4px 9px",
                      borderRadius: 999,
                      fontSize: 10.75,
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                      background: externalToken.tint,
                      color: externalToken.color,
                      border: `1px solid color-mix(in srgb, ${externalToken.color} 22%, var(--cal2-surface))`,
                    }}
                  >
                    {externalKind === "holidays" ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 21V4" />
                        <path d="M4 4h13l-2 4 2 4H4" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                      </svg>
                    )}
                    {externalToken.label}
                  </span>
                ) : (
                  <>
                    {calEntry && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", background: `color-mix(in srgb, ${calEntry.color} 16%, var(--cal2-surface))`, color: calEntry.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: calEntry.color }} />{calEntry.name}
                      </span>
                    )}
                    {showStatusPill && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: tok.pillBg, color: tok.pillText, textTransform: "uppercase" }}>
                        {tok.label}
                      </span>
                    )}
                  </>
                )}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--cal2-text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{event.title}</h2>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--cal2-border-soft)", background: "var(--cal2-surface)", borderRadius: 8, color: "var(--cal2-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* Date / time — prominent card. All-day events (both external
              holidays/vacances and user-created day blocks) replace the
              start→end strip with a calmer "Toute la journée" pill. */}
          <Block label="Date">
            <div style={{ padding: "14px 16px", background: "var(--cal2-surface-3)", borderRadius: 12, border: "1px solid var(--cal2-border-faint)" }}>
              {isAllDayEvent ? (
                <>
                  {dayLabel && (
                    <div style={{ fontSize: 22, fontWeight: 400, color: "var(--cal2-text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                      {dayLabel.long} {dayLabel.num} {dayLabel.monthFull}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: "var(--cal2-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                      {dayLabel ? new Date(dayLabel.date).getFullYear() : ""}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--cal2-border)" }} />
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 9px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 500,
                        background: isExternal
                          ? `color-mix(in srgb, ${accentColor} 10%, var(--cal2-surface))`
                          : "var(--cal2-blue-tint)",
                        color: isExternal ? accentColor : "#0052D9",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M3 10h18" />
                      </svg>
                      Toute la journée
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {dayLabel && (
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--cal2-text)", marginBottom: 8 }}>
                      {dayLabel.long} {dayLabel.num} {dayLabel.monthFull} {new Date(dayLabel.date).getFullYear()}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 26, fontWeight: 400, color: "var(--cal2-text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{fmtTime(event.start)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cal2-border)" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    <span style={{ fontSize: 26, fontWeight: 400, color: "var(--cal2-text-muted)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{fmtTime(event.end)}</span>
                    <span style={{ fontSize: 12.5, color: "var(--cal2-text-faint)", marginLeft: 4, padding: "3px 8px", background: "var(--cal2-surface)", border: "1px solid var(--cal2-border-soft)", borderRadius: 6 }}>{durLabel}</span>
                  </div>
                </>
              )}
            </div>
          </Block>

          {/* Prospect */}
          {event.prospect && (
            <Block label="Prospect">
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--cal2-surface-3)", border: "1px solid var(--cal2-border-faint)", borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `color-mix(in srgb, ${avatarColor(event.prospect)} 35%, var(--cal2-surface-2))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "var(--cal2-text-soft)", flexShrink: 0 }}>
                  {initials(event.prospect)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--cal2-text)", lineHeight: 1.3 }}>{event.prospect}</div>
                  <div style={{ fontSize: 12.5, color: "var(--cal2-text-muted)", lineHeight: 1.3, marginTop: 2 }}>
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
                  <span style={{ color: "var(--cal2-text-faint)" }}>Étape pipeline :</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "var(--cal2-blue-tint)", color: "#0052D9" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0052D9" }} />
                    {event.pipelineStage}
                  </span>
                </div>
              )}
            </Block>
          )}

          {/* Participants — hidden for externals (holidays/vacances) which
              don't have any. */}
          {!isExternal && (
          <Block label="Participants">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Organisateur — always the creator */}
              <Participant
                name={creatorMember.name}
                sub="Andoxa"
                color={creatorMember.color}
                accent={creatorMember.accent}
                ini={creatorMember.initials}
                avatarUrl={"avatarUrl" in creatorMember ? creatorMember.avatarUrl : null}
                status="organizer"
              />
              {/* Colleagues invited by the creator — listed as participants
                  instead of being shown as separate organisateurs on their
                  own per-column event clones. */}
              {colleagueMembers.map((m) => (
                <Participant
                  key={`col-${m.name}`}
                  name={m.name}
                  sub="Andoxa"
                  color={m.color}
                  accent={m.accent}
                  ini={m.initials}
                  avatarUrl={m.avatarUrl}
                  status="invitee"
                />
              ))}
              {(() => {
                // Real RSVP status is only meaningful for Google Meet events.
                // When the event is synced with Google Calendar, attendees
                // (including the prospect) come through `gcalAttendees` with
                // their actual responseStatus — render those and skip the
                // synthetic prospect row to avoid duplicates.
                //
                // For events without Google sync (in-person, phone, no Meet
                // link), render the prospect but without an acceptance pill —
                // we have no signal to claim they've accepted.
                const gcal = event.gcalAttendees?.filter((a) => !a.self) ?? [];
                // Skip gcal entries whose name overlaps a colleague we already
                // rendered above (case-insensitive trimmed match). Avoids
                // showing a teammate twice when they're both an Andoxa member
                // and a Google Calendar attendee.
                const colleagueNameSet = new Set(
                  colleagueMembers.map((m) => m.name.trim().toLowerCase()),
                );
                const gcalFiltered = gcal.filter((a) => {
                  const n = (a.name ?? "").trim().toLowerCase();
                  return n.length === 0 || !colleagueNameSet.has(n);
                });
                const hasGcalAttendees = gcalFiltered.length > 0;

                if (hasGcalAttendees) {
                  return gcalFiltered.map((a, i) => {
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
                        color="var(--cal2-text-soft)"
                        accent={avatarColor(display)}
                        ini={initials(display)}
                        status={status}
                      />
                    );
                  });
                }

                if (event.prospect) {
                  return (
                    <Participant
                      name={event.prospect}
                      sub={event.company}
                      color="var(--cal2-text-soft)"
                      accent={avatarColor(event.prospect)}
                      ini={initials(event.prospect)}
                      status="invitee"
                    />
                  );
                }
                return null;
              })()}
            </div>
          </Block>
          )}

          {/* Lieu / Visio — also hidden for externals (no venue). */}
          {!isExternal && (
          <Block label={locationLabel}>
            {event.meeting !== "inperson" && event.meeting !== "phone" ? (
              <div style={{ padding: "14px 16px", background: "var(--cal2-surface-3)", border: "1px solid var(--cal2-border-faint)", borderRadius: 12 }}>
                {meetUrl ? (
                  <a href={meetUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#0052D9", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    {meetUrl.replace(/^https?:\/\//, "")}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--cal2-text-muted)", display: "block", marginBottom: 12 }}>
                    {event.meeting === "zoom" ? "Réunion Zoom" : event.meeting === "other" && locationDetail ? locationDetail : "Visioconférence"}
                  </span>
                )}
                {meetUrl && (
                  <a href={meetUrl} target="_blank" rel="noreferrer">
                    <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#0052D9", color: "var(--cal2-surface)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 2px rgba(0,82,217,0.28)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                      Rejoindre la réunion
                    </button>
                  </a>
                )}
              </div>
            ) : (
              <div style={{ padding: "12px 16px", background: "var(--cal2-surface-3)", border: "1px solid var(--cal2-border-faint)", borderRadius: 12, fontSize: 13, color: locationDetail ? "var(--cal2-text)" : "var(--cal2-text-muted)" }}>
                {locationDetail || (event.meeting === "phone" ? "Numéro non renseigné" : "Adresse non renseignée")}
              </div>
            )}
          </Block>
          )}

          {descriptionText && (
            <Block label="Description">
              <div style={{ padding: "12px 16px", background: "var(--cal2-surface-3)", border: "1px solid var(--cal2-border-faint)", borderRadius: 12, fontSize: 13, color: "var(--cal2-text)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {descriptionText}
              </div>
            </Block>
          )}

          {/* Activity */}
          {event.prospect && (
            <Block label="Activité du prospect">
              <div style={{ position: "relative", paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 1, background: "var(--cal2-border-soft)" }} />
                {PROSPECT_ACTIVITY.default.map((a, i) => (
                  <div key={i} style={{ position: "relative", paddingBottom: 14, fontSize: 12.5 }}>
                    <span style={{ position: "absolute", left: -20, top: 5, width: 10, height: 10, borderRadius: "50%", background: i === 0 ? "#0052D9" : "var(--cal2-border)", border: "2px solid var(--cal2-surface)", boxShadow: "0 0 0 1px var(--cal2-border-soft)" }} />
                    <div style={{ color: "var(--cal2-text)", fontWeight: 500 }}>{a.label}</div>
                    <div style={{ color: "var(--cal2-text-faint)", fontSize: 11.5, marginTop: 2 }}>{a.date}</div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* Workflows */}
          {event.wa && (
            <Block label="Workflows actifs">
              <div style={{ padding: "12px 16px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, fontSize: 12.5, color: "var(--cal2-text)" }}>
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

        {/* Footer — Modifier (safe) + 3 destructive actions, all confirmed.
            Hidden entirely for non-organiser participants (colleagues view
            but don't change a teammate's event) and for externals
            (holidays/vacances are read-only by definition). */}
        {(!isOrganiser || isExternal) ? null : (
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--cal2-border-faint)", background: "var(--cal2-canvas-soft)", flexShrink: 0 }}>
          {confirm ? (
            <ConfirmBanner
              action={confirm}
              busy={confirm === "delete" ? deleteEvent.isPending : updateEvent.isPending}
              onConfirm={
                confirm === "done"
                  ? handleMarkDone
                  : confirm === "noshow"
                    ? handleMarkNoShow
                    : handleDelete
              }
              onCancel={() => setConfirm(null)}
            />
          ) : (
            <>
              <button
                onClick={() => onEdit(event)}
                style={{ width: "100%", padding: "11px 16px", background: accentColor, color: "var(--cal2-surface)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 1px 2px ${accentColor}44`, marginBottom: 10 }}
              >
                Modifier l&apos;événement
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <button
                  onClick={() => setConfirm("done")}
                  disabled={event.status === "done"}
                  style={{ padding: "9px 8px", background: "var(--cal2-surface)", color: event.status === "done" ? "#10B981" : "var(--cal2-text-soft)", border: `1px solid ${event.status === "done" ? "#BBF7D0" : "var(--cal2-border-soft)"}`, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: event.status === "done" ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {event.status === "done" ? "Réalisé" : "Marquer réalisé"}
                </button>
                <button
                  onClick={() => setConfirm("noshow")}
                  disabled={event.status === "noshow"}
                  style={{ padding: "9px 8px", background: "var(--cal2-surface)", color: event.status === "noshow" ? "#F59E0B" : "var(--cal2-text-soft)", border: `1px solid ${event.status === "noshow" ? "color-mix(in srgb, #F59E0B 32%, var(--cal2-surface))" : "var(--cal2-border-soft)"}`, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: event.status === "noshow" ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                  No-show
                </button>
                <button
                  onClick={() => setConfirm("delete")}
                  style={{ padding: "9px 8px", background: "var(--cal2-surface)", color: "#DC2626", border: "1px solid color-mix(in srgb, #DC2626 32%, var(--cal2-surface))", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
        )}
      </aside>
    </>
  );
}

function ConfirmBanner({
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  action: Exclude<ConfirmAction, null>;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const config = {
    done: {
      tone: "#10B981",
      title: "Marquer cet événement réalisé ?",
      hint: "Le statut passera à \"réalisé\" et ne pourra pas être annulé en un clic.",
      confirmLabel: "Confirmer",
      busyLabel: "Mise à jour…",
    },
    noshow: {
      tone: "#F59E0B",
      title: "Marquer ce rendez-vous en no-show ?",
      hint: "Indique que le prospect ne s'est pas présenté. Affecte vos KPIs.",
      confirmLabel: "Confirmer",
      busyLabel: "Mise à jour…",
    },
    delete: {
      tone: "#DC2626",
      title: "Supprimer cet événement ?",
      hint: "L'événement sera retiré d'Andoxa et de Google Calendar. Cette action est irréversible.",
      confirmLabel: "Supprimer",
      busyLabel: "Suppression…",
    },
  }[action];

  return (
    <div
      role="alertdialog"
      style={{
        background: `color-mix(in srgb, ${config.tone} 12%, var(--cal2-surface))`,
        border: `1px solid color-mix(in srgb, ${config.tone} 32%, var(--cal2-surface))`,
        borderRadius: 9,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: config.tone, marginBottom: 4 }}>{config.title}</div>
      <div style={{ fontSize: 12, color: "var(--cal2-text-muted)", lineHeight: 1.45, marginBottom: 10 }}>{config.hint}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onConfirm}
          disabled={busy}
          style={{ flex: 1, padding: "8px", background: config.tone, color: "var(--cal2-surface)", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: busy ? "progress" : "pointer", fontFamily: "inherit" }}
        >
          {busy ? config.busyLabel : config.confirmLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          style={{ flex: 1, padding: "8px", background: "var(--cal2-surface)", color: "var(--cal2-text-soft)", border: "1px solid var(--cal2-border-soft)", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--cal2-text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

type ParticipantStatus =
  | "organizer"
  | "accepted"
  | "pending"
  | "declined"
  /** No RSVP signal available — shown for non-synced events. Renders no pill. */
  | "invitee";

function Participant({
  name,
  sub,
  color,
  accent,
  ini,
  status,
  avatarUrl,
}: {
  name: string;
  sub: string;
  color: string;
  accent: string;
  ini: string;
  status: ParticipantStatus;
  avatarUrl?: string | null;
}) {
  const statusLabel =
    status === "organizer" ? "Organisateur"
    : status === "accepted" ? "A accepté"
    : status === "declined" ? "A décliné"
    : status === "pending" ? "En attente"
    : null;
  const statusColor =
    status === "organizer" ? "#0052D9"
    : status === "accepted" ? "#10B981"
    : status === "declined" ? "#EF4444"
    : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <span style={{ width: 32, height: 32, borderRadius: "50%", background: `color-mix(in srgb, ${color} 22%, var(--cal2-surface))`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{ini}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "var(--cal2-text)", lineHeight: 1.3, fontWeight: 500 }}>{name}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--cal2-text-faint)", lineHeight: 1.3 }}>{sub}</div>}
      </div>
      {statusLabel && (
        <span style={{ fontSize: 11.5, color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
      )}
    </div>
  );
}
