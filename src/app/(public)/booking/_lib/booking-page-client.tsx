"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Globe,
    Clock,
    Video,
    ShieldCheck,
    Lock,
    Check,
    Pencil,
    ArrowRight,
    CalendarPlus,
    MessageCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BOOKING_TIMEZONE } from "@/lib/booking/constants";
import { buildGoogleCalendarUrl } from "@/lib/booking/google-calendar-url";

interface Slot {
    start: string;
    end: string;
}

interface HostInfo {
    name: string;
    role?: string;
    avatar_url?: string | null;
}

interface MeetingTypeInfo {
    title: string;
    description: string;
    duration: number;
    mode: string;
}

const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
];
const WEEKDAYS_FULL_FR = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
];

function formatBookingTimezoneLabel(): string {
    try {
        const offset =
            new Intl.DateTimeFormat("fr-FR", {
                timeZone: BOOKING_TIMEZONE,
                timeZoneName: "shortOffset",
            })
                .formatToParts(new Date())
                .find((p) => p.type === "timeZoneName")?.value ?? "";
        return `Europe/Paris${offset ? ` (${offset})` : ""}`;
    } catch {
        return BOOKING_TIMEZONE;
    }
}

function sameDay(a: Date | null, b: Date | null): boolean {
    return !!a && !!b && a.toDateString() === b.toDateString();
}

/**
 * Shared booking client renderer. Used by:
 *   - this route (/booking/[slug]) — slug comes from useParams.
 *   - /booking/[org]/[user] — slug is resolved server-side and passed in.
 * Pass `slug` to bypass the useParams read.
 */
function buildMonthGrid(
    year: number,
    month: number
): { date: Date; inMonth: boolean }[] {
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = startWeekday; i > 0; i--) {
        cells.push({ date: new Date(year, month, 1 - i), inMonth: false });
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (cells.length < 42) {
        const last = cells[cells.length - 1].date;
        cells.push({
            date: new Date(
                last.getFullYear(),
                last.getMonth(),
                last.getDate() + 1
            ),
            inMonth: false,
        });
    }
    return cells;
}

function dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: BOOKING_TIMEZONE,
    });
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

/**
 * Shared booking client renderer. Used by:
 *   - this route (/booking/[slug]) — slug comes from useParams.
 *   - /booking/[org]/[user] — slug is resolved server-side and passed in.
 * Pass `slug` to bypass the useParams read.
 */
export function BookingPageClient({ slug: slugProp }: { slug?: string } = {}) {
    const params = useParams<{ slug: string }>();
    const slug = slugProp ?? (typeof params.slug === "string" ? params.slug : null);

    const [slots, setSlots] = useState<Slot[]>([]);
    const [host, setHost] = useState<HostInfo | null>(null);
    const [meetingType, setMeetingType] = useState<MeetingTypeInfo>({
        title: "Échange découverte",
        description:
            "Un premier échange pour faire connaissance et voir comment je peux vous aider.",
        duration: 30,
        mode: "Visioconférence",
    });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const [viewDate, setViewDate] = useState<Date>(today);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [guestFirstName, setGuestFirstName] = useState("");
    const [guestLastName, setGuestLastName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestLinkedin, setGuestLinkedin] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [consent, setConsent] = useState(false);
    const [consentDirty, setConsentDirty] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showPostBookingWaNotice, setShowPostBookingWaNotice] = useState(true);
    const [hasOnBookingWaWorkflow, setHasOnBookingWaWorkflow] = useState(false);
    const [confirmedEvent, setConfirmedEvent] = useState<{
        title: string;
        description: string;
        meetUrl: string | null;
    } | null>(null);

    const timezoneLabel = useMemo(() => formatBookingTimezoneLabel(), []);

    const showWaGuestNotice =
        hasOnBookingWaWorkflow && showPostBookingWaNotice;

    const loadSlots = useCallback(async () => {
        if (!slug) {
            setLoadError("Lien invalide");
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(null);
        try {
            const res = await fetch(`/api/booking/${slug}/slots`);
            const json = await res.json();
            if (!res.ok) {
                setLoadError(json?.error ?? "Impossible de charger les créneaux");
                setSlots([]);
                return;
            }
            const data = json?.data ?? json;
            const items = data?.slots ?? [];
            setSlots(Array.isArray(items) ? items : []);
            if (data?.host) setHost(data.host as HostInfo);
            if (data?.meetingType)
                setMeetingType(data.meetingType as MeetingTypeInfo);
            if (typeof data?.show_post_booking_wa_notice === "boolean") {
                setShowPostBookingWaNotice(data.show_post_booking_wa_notice);
            }
            if (typeof data?.has_on_booking_wa_workflow === "boolean") {
                setHasOnBookingWaWorkflow(data.has_on_booking_wa_workflow);
            }
        } catch {
            setLoadError("Erreur lors du chargement");
            setSlots([]);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        loadSlots();
    }, [loadSlots]);

    // Group slots by day for O(1) lookup.
    const slotsByDay = useMemo(() => {
        const map = new Map<string, Slot[]>();
        for (const s of slots) {
            const k = dayKey(new Date(s.start));
            const arr = map.get(k) ?? [];
            arr.push(s);
            map.set(k, arr);
        }
        for (const arr of map.values()) {
            arr.sort(
                (a, b) =>
                    new Date(a.start).getTime() - new Date(b.start).getTime()
            );
        }
        return map;
    }, [slots]);

    const isAvailableDay = useCallback(
        (date: Date) => slotsByDay.has(dayKey(date)) && date >= today,
        [slotsByDay, today]
    );
    const slotsForSelectedDay = useMemo(
        () => (selectedDay ? slotsByDay.get(dayKey(selectedDay)) ?? [] : []),
        [selectedDay, slotsByDay]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullName = [guestFirstName, guestLastName]
            .filter((p) => p.trim())
            .join(" ")
            .trim();
        if (!selectedSlot || !fullName || !slug) return;
        const emailTrim = guestEmail.trim();
        const phoneTrim = guestPhone.trim();
        if (!emailTrim && !phoneTrim) {
            setSubmitError(
                "Indiquez au moins une adresse e-mail ou un numéro WhatsApp."
            );
            return;
        }
        if (!consent) {
            setConsentDirty(true);
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            const res = await fetch(`/api/booking/${slug}/book`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slot_start: selectedSlot.start,
                    slot_end: selectedSlot.end,
                    guest_name: fullName,
                    guest_email: guestEmail.trim() || null,
                    guest_linkedin: guestLinkedin.trim() || null,
                    guest_phone: guestPhone.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setSubmitError(json?.error ?? "Erreur lors de la réservation");
                return;
            }
            const payload = json?.data ?? json;
            setConfirmedEvent({
                title:
                    (payload?.title as string | undefined)?.trim() ||
                    meetingType.title,
                description:
                    (payload?.description as string | undefined)?.trim() ||
                    meetingType.description,
                meetUrl:
                    (payload?.google_meet_url as string | null | undefined) ??
                    null,
            });
            setStep(3);
        } catch {
            setSubmitError("Erreur lors de la réservation");
        } finally {
            setSubmitting(false);
        }
    };

    const onGoToStep = (n: 1 | 2 | 3) => {
        if (n < step) setStep(n);
    };

    const monthLabel = `${MONTHS_FR[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    const monthCells = useMemo(
        () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
        [viewDate]
    );
    const prevDisabled =
        viewDate.getFullYear() === today.getFullYear() &&
        viewDate.getMonth() <= today.getMonth();

    const hostName = host?.name ?? "Votre interlocuteur";
    const hostRole = host?.role ?? "Disponible cette semaine";

    if (!slug) {
        return (
            <div className="booking-page">
                <div className="booking-container">
                    <p
                        style={{
                            margin: "auto",
                            color: "var(--muted-foreground)",
                        }}
                    >
                        Lien de prise de rendez-vous invalide.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="booking-page">
            <div className="booking-container">
                <div className="topbar">
                    {/* Brand logo removed — already shown in footer ("Propulsé par Andoxa"). */}
                    <nav className="stepper" aria-label="Étapes">
                        {([1, 2, 3] as const).map((n, i) => {
                            const label =
                                n === 1
                                    ? "Créneau"
                                    : n === 2
                                      ? "Vos infos"
                                      : "Confirmation";
                            const state =
                                step === n
                                    ? "is-active"
                                    : step > n
                                      ? "is-done"
                                      : "is-future";
                            const clickable = state === "is-done";
                            return (
                                <span
                                    key={n}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <button
                                        type="button"
                                        className={`stepper-btn stepper-item ${state}`}
                                        onClick={
                                            clickable
                                                ? () => onGoToStep(n)
                                                : undefined
                                        }
                                        aria-current={
                                            step === n ? "step" : undefined
                                        }
                                        disabled={!clickable && step !== n}
                                    >
                                        <span className="pip">
                                            {state === "is-done" ? (
                                                <Check size={11} />
                                            ) : (
                                                n
                                            )}
                                        </span>
                                        <span className="stepper-label">
                                            {label}
                                        </span>
                                    </button>
                                    {i < 2 && (
                                        <span
                                            className="stepper-sep"
                                            aria-hidden
                                        />
                                    )}
                                </span>
                            );
                        })}
                    </nav>
                </div>

                <div className="booking-main">
                    {/* LEFT — Identity panel (persistent) */}
                    <aside className="identity-panel">
                        <div className="identity-eyebrow">Rendez-vous avec</div>
                        <div className="identity-id">
                            <div className="identity-avatar" aria-hidden>
                                {host?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={host.avatar_url} alt="" />
                                ) : (
                                    getInitials(hostName)
                                )}
                            </div>
                            <div className="identity-id-meta">
                                <div className="identity-name">{hostName}</div>
                                {hostRole && (
                                    <div className="identity-role">
                                        {hostRole}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="identity-divider" aria-hidden />
                        <h1 className="identity-title">{meetingType.title}</h1>
                        <p className="identity-desc">
                            {meetingType.description}
                        </p>
                        <div className="identity-badges">
                            <span className="badge is-duration">
                                <Clock size={13} /> {meetingType.duration} min
                            </span>
                            <span className="badge is-mode">
                                <Video size={13} /> {meetingType.mode}
                            </span>
                        </div>
                        <div className="identity-foot">
                            <span className="identity-foot-row">
                                <ShieldCheck size={12} /> Confirmation
                                instantanée
                            </span>
                            <span className="identity-foot-row">
                                <Lock size={12} /> Données chiffrées · RGPD
                            </span>
                        </div>
                    </aside>

                    {/* STEP 1 — Calendar + Slots */}
                    {step === 1 && (
                        <>
                            <div className="calendar-pane step-anim">
                                {loading ? (
                                    <p
                                        style={{
                                            color: "var(--muted-foreground)",
                                            fontSize: 13,
                                            padding: "40px 0",
                                            textAlign: "center",
                                        }}
                                    >
                                        Chargement des créneaux…
                                    </p>
                                ) : loadError ? (
                                    <p
                                        style={{
                                            color: "var(--destructive)",
                                            fontSize: 13,
                                            padding: "40px 0",
                                            textAlign: "center",
                                        }}
                                    >
                                        {loadError}
                                    </p>
                                ) : (
                                    <>
                                        <div className="cal-header">
                                            <div className="cal-title">
                                                {monthLabel}
                                            </div>
                                            <div className="cal-nav">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewDate(
                                                            (d) =>
                                                                new Date(
                                                                    d.getFullYear(),
                                                                    d.getMonth() -
                                                                        1,
                                                                    1
                                                                )
                                                        )
                                                    }
                                                    disabled={prevDisabled}
                                                    aria-label="Mois précédent"
                                                >
                                                    <ChevronLeft />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewDate(
                                                            (d) =>
                                                                new Date(
                                                                    d.getFullYear(),
                                                                    d.getMonth() +
                                                                        1,
                                                                    1
                                                                )
                                                        )
                                                    }
                                                    aria-label="Mois suivant"
                                                >
                                                    <ChevronRight />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="cal-body">
                                            <div
                                                className="cal-weekdays"
                                                role="row"
                                            >
                                                {WEEKDAYS_FR.map((w) => (
                                                    <div
                                                        key={w}
                                                        className="cal-weekday"
                                                    >
                                                        {w}
                                                    </div>
                                                ))}
                                            </div>
                                            <div
                                                className="cal-grid"
                                                role="grid"
                                            >
                                                {monthCells.map((cell, i) => {
                                                    const isOther =
                                                        !cell.inMonth;
                                                    const avail =
                                                        !isOther &&
                                                        isAvailableDay(
                                                            cell.date
                                                        );
                                                    const isToday = sameDay(
                                                        cell.date,
                                                        today
                                                    );
                                                    const isSel = sameDay(
                                                        cell.date,
                                                        selectedDay
                                                    );
                                                    const cls = [
                                                        "cal-day",
                                                        isOther && "is-other",
                                                        !isOther &&
                                                            !avail &&
                                                            "is-disabled",
                                                        avail && "is-available",
                                                        isToday && "is-today",
                                                        isSel && "is-selected",
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" ");
                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            className={cls}
                                                            onClick={
                                                                avail
                                                                    ? () =>
                                                                          setSelectedDay(
                                                                              cell.date
                                                                          )
                                                                    : undefined
                                                            }
                                                            disabled={!avail}
                                                            aria-label={cell.date.toLocaleDateString(
                                                                "fr-FR",
                                                                {
                                                                    weekday:
                                                                        "long",
                                                                    day: "numeric",
                                                                    month: "long",
                                                                }
                                                            )}
                                                            aria-pressed={isSel}
                                                        >
                                                            <span className="num">
                                                                {cell.date.getDate()}
                                                            </span>
                                                            {avail && !isSel && (
                                                                <span
                                                                    className="avail-dot"
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="cal-footer">
                                            <div className="cal-legend">
                                                <span className="swatch" />{" "}
                                                Disponible
                                            </div>
                                            <button
                                                type="button"
                                                className="cal-tz"
                                            >
                                                <Globe /> {timezoneLabel}{" "}
                                                <ChevronDown />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="slots-pane step-anim">
                                {!selectedDay ? (
                                    <>
                                        <div className="slots-head">
                                            <div className="slots-day-muted">
                                                Choisissez une date
                                            </div>
                                        </div>
                                        <div className="slots-empty">
                                            <div className="icon">
                                                <CalendarIcon />
                                            </div>
                                            <div className="slots-empty-text">
                                                <strong>
                                                    Sélectionnez une date
                                                </strong>
                                                <span>
                                                    Les créneaux disponibles
                                                    apparaîtront ici.
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="slots-head">
                                            <div className="slots-day">
                                                {
                                                    WEEKDAYS_FULL_FR[
                                                        selectedDay.getDay()
                                                    ]
                                                }{" "}
                                                {selectedDay.getDate()}{" "}
                                                {
                                                    MONTHS_FR[
                                                        selectedDay.getMonth()
                                                    ]
                                                }
                                            </div>
                                            <div className="slots-day-muted">
                                                {slotsForSelectedDay.length}{" "}
                                                créneaux ·{" "}
                                                {meetingType.duration} min
                                            </div>
                                        </div>
                                        <div
                                            className="slots-list"
                                            role="listbox"
                                        >
                                            {slotsForSelectedDay.map((s) => (
                                                <button
                                                    key={`${s.start}-${s.end}`}
                                                    type="button"
                                                    className="slot"
                                                    onClick={() => {
                                                        setSelectedSlot(s);
                                                        setStep(2);
                                                    }}
                                                >
                                                    <span className="time">
                                                        {formatTime(s.start)}
                                                    </span>
                                                    <span
                                                        className="arrow"
                                                        aria-hidden
                                                    >
                                                        <ArrowRight />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* STEP 2 — Form */}
                    {step === 2 && selectedSlot && selectedDay && (
                        <div className="step-content-wide">
                            <div className="form-pane step-anim">
                                <div className="form-recap">
                                    <span className="form-recap-row">
                                        <CalendarIcon />
                                        <strong>
                                            {WEEKDAYS_FULL_FR[selectedDay.getDay()]}{" "}
                                            {selectedDay.getDate()}{" "}
                                            {MONTHS_FR[selectedDay.getMonth()]}
                                        </strong>
                                        <span className="dot">·</span>
                                        <strong>
                                            {formatTime(selectedSlot.start)}
                                        </strong>
                                        <span className="dot">·</span>
                                        <span>
                                            {meetingType.duration} min
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        className="recap-edit"
                                        onClick={() => {
                                            setSelectedSlot(null);
                                            setStep(1);
                                        }}
                                    >
                                        <Pencil /> Modifier
                                    </button>
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    className="form-body"
                                >
                                    <div className="form-head">
                                        <div className="form-title">
                                            Vos informations
                                        </div>
                                        <div className="form-subtitle">
                                            Pour confirmer votre rendez-vous et
                                            vous envoyer les détails.
                                        </div>
                                    </div>

                                    <div className="form-stack">
                                        <div className="form-grid">
                                            <div className="field">
                                                <label
                                                    className="field-label"
                                                    htmlFor="guestFirstName"
                                                >
                                                    Prénom
                                                    <span
                                                        className="req"
                                                        aria-hidden
                                                    >
                                                        *
                                                    </span>
                                                </label>
                                                <input
                                                    id="guestFirstName"
                                                    className="booking-input"
                                                    value={guestFirstName}
                                                    onChange={(e) =>
                                                        setGuestFirstName(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Jean"
                                                    required
                                                />
                                            </div>
                                            <div className="field">
                                                <label
                                                    className="field-label"
                                                    htmlFor="guestLastName"
                                                >
                                                    Nom
                                                    <span
                                                        className="req"
                                                        aria-hidden
                                                    >
                                                        *
                                                    </span>
                                                </label>
                                                <input
                                                    id="guestLastName"
                                                    className="booking-input"
                                                    value={guestLastName}
                                                    onChange={(e) =>
                                                        setGuestLastName(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Dupont"
                                                    required
                                                />
                                            </div>
                                            <div className="field is-wide">
                                                <label
                                                    className="field-label"
                                                    htmlFor="guestEmail"
                                                >
                                                    Adresse e-mail
                                                </label>
                                                <input
                                                    id="guestEmail"
                                                    type="email"
                                                    className="booking-input"
                                                    value={guestEmail}
                                                    onChange={(e) =>
                                                        setGuestEmail(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="jean.dupont@exemple.fr"
                                                    autoComplete="email"
                                                />
                                            </div>
                                            <div className="field is-wide">
                                                <label
                                                    className="field-label"
                                                    htmlFor="guestLinkedin"
                                                >
                                                    Profil LinkedIn
                                                </label>
                                                <input
                                                    id="guestLinkedin"
                                                    className="booking-input"
                                                    value={guestLinkedin}
                                                    onChange={(e) =>
                                                        setGuestLinkedin(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="linkedin.com/in/jean-dupont (optionnel)"
                                                />
                                                <div className="field-hint">
                                                    Pour mieux préparer notre
                                                    échange.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="phone-section">
                                            <div className="field">
                                                <label
                                                    className="field-label"
                                                    htmlFor="guestPhone"
                                                >
                                                    <span
                                                        className="wa-icon"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle
                                                            size={11}
                                                        />
                                                    </span>
                                                    Téléphone (WhatsApp)
                                                </label>
                                                <input
                                                    id="guestPhone"
                                                    type="tel"
                                                    className="booking-input"
                                                    value={guestPhone}
                                                    onChange={(e) =>
                                                        setGuestPhone(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="+33 6 12 34 56 78"
                                                />
                                            </div>
                                            <div className="field-hint">
                                                Au moins l&apos;e-mail ou le
                                                numéro WhatsApp est requis.
                                            </div>
                                            {guestPhone.trim() && showWaGuestNotice && (
                                                <div className="wa-bonus">
                                                    <span className="wa-bonus-icon">
                                                        <MessageCircle
                                                            size={14}
                                                        />
                                                    </span>
                                                    <span className="wa-bonus-text">
                                                        <span className="wa-bonus-title">
                                                            Confirmation par
                                                            WhatsApp
                                                        </span>
                                                        <span className="wa-bonus-sub">
                                                            Un WhatsApp post-RDV
                                                            sera envoyé avec les
                                                            détails du rendez-vous
                                                            (lien de visio inclus).
                                                        </span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <label
                                            className={`consent-plain ${
                                                consent ? "is-checked" : ""
                                            } ${
                                                consentDirty && !consent
                                                    ? "is-required-empty"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={consent}
                                                onChange={(e) => {
                                                    setConsent(e.target.checked);
                                                    setConsentDirty(true);
                                                }}
                                            />
                                            <span className="box">
                                                <Check />
                                            </span>
                                            <span className="text">
                                                J&apos;accepte que mes données
                                                soient utilisées pour traiter ma
                                                demande de rendez-vous.
                                                {consentDirty && !consent && (
                                                    <span className="consent-required">
                                                        Obligatoire pour
                                                        continuer.
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    </div>

                                    {submitError && (
                                        <div className="field-error">
                                            {submitError}
                                        </div>
                                    )}

                                    <div className="form-foot">
                                        <button
                                            type="submit"
                                            className={`cta ${submitting ? "is-loading" : ""}`}
                                            disabled={
                                                submitting ||
                                                !guestFirstName.trim() ||
                                                !guestLastName.trim() ||
                                                (!guestEmail.trim() &&
                                                    !guestPhone.trim())
                                            }
                                        >
                                            Confirmer le rendez-vous
                                        </button>
                                        <span className="secure-note">
                                            <Lock /> Vos données restent
                                            privées · RGPD
                                        </span>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — Confirmation */}
                    {step === 3 && selectedSlot && selectedDay && (
                        <div className="step-content-wide">
                            <div
                                className="confirm-pane step-anim"
                                data-screen-label="03 Confirmation"
                            >
                                <div className="check-bubble" aria-hidden>
                                    <svg
                                        width={38}
                                        height={38}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline
                                            className="checkmark"
                                            points="20 6 9 17 4 12"
                                        />
                                    </svg>
                                </div>
                                <h2 className="confirm-title">
                                    Rendez-vous confirmé
                                </h2>
                                <p className="confirm-sub">
                                    {(() => {
                                        const hasEmail = Boolean(
                                            guestEmail.trim()
                                        );
                                        const hasPhone = Boolean(
                                            guestPhone.trim()
                                        );
                                        const waNotice =
                                            showWaGuestNotice && hasPhone;
                                        if (hasEmail && waNotice) {
                                            return (
                                                <>
                                                    Un e-mail récapitulatif et
                                                    un message WhatsApp (avec le
                                                    lien de visio) viennent
                                                    d&apos;être envoyés.{" "}
                                                    {hostName} vous attend à
                                                    l&apos;heure prévue.
                                                </>
                                            );
                                        }
                                        if (hasEmail) {
                                            return (
                                                <>
                                                    Un e-mail récapitulatif vient
                                                    d&apos;être envoyé. {hostName}{" "}
                                                    vous attend à l&apos;heure
                                                    prévue.
                                                </>
                                            );
                                        }
                                        if (waNotice) {
                                            return (
                                                <>
                                                    Un message WhatsApp de
                                                    confirmation avec le lien de
                                                    visio vient d&apos;être
                                                    envoyé. {hostName} vous attend
                                                    à l&apos;heure prévue.
                                                </>
                                            );
                                        }
                                        return (
                                            <>
                                                Votre rendez-vous est confirmé.{" "}
                                                {hostName} vous attend à
                                                l&apos;heure prévue.
                                            </>
                                        );
                                    })()}
                                </p>
                                <div className="confirm-recap">
                                    <div className="row">
                                        <span className="label">Quand</span>
                                        <span className="value">
                                            {
                                                WEEKDAYS_FULL_FR[
                                                    selectedDay.getDay()
                                                ]
                                            }{" "}
                                            {selectedDay.getDate()}{" "}
                                            {MONTHS_FR[selectedDay.getMonth()]}{" "}
                                            {selectedDay.getFullYear()} ·{" "}
                                            {formatTime(selectedSlot.start)}
                                        </span>
                                    </div>
                                    <div className="row">
                                        <span className="label">Durée</span>
                                        <span className="value">
                                            {meetingType.duration} min ·{" "}
                                            {meetingType.mode}
                                        </span>
                                    </div>
                                    <div className="row">
                                        <span className="label">Avec</span>
                                        <span className="value">
                                            {hostName}
                                        </span>
                                    </div>
                                </div>
                                <div className="add-cal">
                                    <a
                                        type="button"
                                        className="cal-btn"
                                        href={buildGoogleCalendarUrl({
                                            startIso: selectedSlot.start,
                                            endIso: selectedSlot.end,
                                            title:
                                                confirmedEvent?.title ??
                                                meetingType.title,
                                            details: [
                                                confirmedEvent?.description ??
                                                    meetingType.description,
                                                confirmedEvent?.meetUrl
                                                    ? `Rejoindre : ${confirmedEvent.meetUrl}`
                                                    : null,
                                            ]
                                                .filter(Boolean)
                                                .join("\n\n"),
                                            location:
                                                confirmedEvent?.meetUrl ??
                                                undefined,
                                        })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <CalendarPlus /> Google Calendar
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="booking-footer">
                    <span className="foot-credit">
                        Propulsé par
                        <Link
                            href="/"
                            title="andoxa.io"
                            className="foot-logo-link"
                        >
                            <Image
                                src="/assets/logofiles/logo_1.svg"
                                alt="Andoxa"
                                width={80}
                                height={18}
                                className="foot-logo-img"
                            />
                        </Link>
                    </span>
                    <span className="foot-sep" aria-hidden>
                        ·
                    </span>
                    <a href="/legal/cgu" className="foot-link">
                        Mentions légales
                    </a>
                    <span className="foot-sep" aria-hidden>
                        ·
                    </span>
                    <a href="/legal/privacy" className="foot-link">
                        Confidentialité (RGPD)
                    </a>
                </footer>
            </div>
        </div>
    );
}

// No default export here — this file lives under `_lib/` and is not a route.
// Routes import `BookingPageClient` directly. Single source of truth.
