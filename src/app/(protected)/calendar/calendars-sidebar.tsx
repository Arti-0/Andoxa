"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import type { VisibilityMap } from "./data";
import { useOrgMembers, useCurrentUserProfile, type OrgMember } from "./queries";

export type CustomCal = { id: string; name: string; color: string; accent: string; checked: boolean };

type Props = {
  visible: VisibilityMap;
  onToggle: (id: string) => void;
  customCals: CustomCal[];
  onCustomCalsChange: (cals: CustomCal[]) => void;
};

const CAL_COLORS: { color: string; accent: string }[] = [
  { color: "#0052D9", accent: "#E8F0FD" },
  { color: "#7C3AED", accent: "#EDE9FE" },
  { color: "#DB2777", accent: "#FCE7F3" },
  { color: "#0891B2", accent: "#CFFAFE" },
  { color: "#EA580C", accent: "#FFE4D5" },
  { color: "#10B981", accent: "#ECFDF5" },
  { color: "#EF4444", accent: "#FEE2E2" },
  { color: "#64748B", accent: "#F1F5F9" },
];

export function CalendarsSidebar({ visible, onToggle, customCals, onCustomCalsChange }: Props) {
  const [editing, setEditing] = useState<CustomCal | null>(null);
  const [newCalOpen, setNewCalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const { data: me } = useCurrentUserProfile();

  const handleSaveEdit = (updated: CustomCal) => {
    onCustomCalsChange(customCals.map((c) => c.id === updated.id ? updated : c));
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    onCustomCalsChange(customCals.filter((c) => c.id !== id));
    setDeletingId(null);
  };

  const handleNewCal = (cal: Omit<CustomCal, "id" | "checked">) => {
    const next: CustomCal = { ...cal, id: `custom_${Date.now()}`, checked: true };
    onCustomCalsChange([...customCals, next]);
    setNewCalOpen(false);
  };

  const toggleCustomCal = (id: string) => {
    onCustomCalsChange(customCals.map((c) => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  return (
    <aside style={{ width: 240, flexShrink: 0, background: "#FAFBFC", borderRight: "1px solid #EDF1F5", display: "flex", flexDirection: "column", padding: "18px 14px 14px", overflowY: "auto", height: "100%" }}>
      {/* Mon agenda */}
      <Section title="Mon agenda">
        <Row
          color="#0052D9" accent="#E8F0FD"
          initials={me?.initials ?? "VO"}
          avatarUrl={me?.avatarUrl ?? null}
          name={me?.fullName ?? "Vous"}
          subtitle="Andoxa"
          checked={!!visible.me} onToggle={() => onToggle("me")}
          canEdit={false}
        />
        <Row
          color="#475569" accent="#F1F5F9" icon={<GcalIcon />} name="Google Calendar" subtitle="Synchronisé"
          checked={!!visible.gcal} onToggle={() => onToggle("gcal")}
          canEdit={false}
        />
        {/* User-created personal calendars */}
        {customCals.map((cal) => (
          <Row
            key={cal.id} color={cal.color} accent={cal.accent} initials={cal.name.slice(0, 2).toUpperCase()}
            name={cal.name} checked={cal.checked}
            onToggle={() => toggleCustomCal(cal.id)}
            canEdit onEdit={() => setEditing(cal)}
            onDelete={() => setDeletingId(cal.id)}
          />
        ))}
      </Section>

      {/* Mon équipe — real org members, read-only */}
      <Section title="Mon équipe" badge={membersLoading ? undefined : String(members.length)}>
        {membersLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 11.5, color: "#94A3B8", padding: "4px 8px" }}>Aucun collègue</div>
        ) : (
          members.map((m: OrgMember) => (
            <Row
              key={m.id} color={m.color} accent={m.accent} initials={m.initials} name={m.name}
              avatarUrl={m.avatarUrl}
              checked={visible[m.id] !== false} onToggle={() => onToggle(m.id)} canEdit={false}
            />
          ))
        )}
      </Section>

      {/* Externes — read-only */}
      <Section title="Externes">
        <Row color="#EF4444" accent="#FEE2E2" icon={<DotIcon color="#EF4444" />} name="Jours fériés France"
          checked={!!visible.holidays} onToggle={() => onToggle("holidays")} canEdit={false} />
        <Row color="#F59E0B" accent="#FEF3C7" icon={<DotIcon color="#F59E0B" />} name="Vacances scolaires"
          checked={visible.vacances !== false} onToggle={() => onToggle("vacances")} canEdit={false} />
      </Section>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => setNewCalOpen(true)}
        style={{ marginTop: 12, padding: "9px 12px", background: "#fff", border: "1px dashed #CBD5E1", borderRadius: 8, color: "#475569", fontSize: 12.5, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", transition: "all 120ms" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0052D9"; e.currentTarget.style.color = "#0052D9"; e.currentTarget.style.background = "#F8FBFF"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "#fff"; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Ajouter un agenda
      </button>

      {/* Modals */}
      {newCalOpen && <CalModal title="Nouvel agenda" onClose={() => setNewCalOpen(false)} onSave={handleNewCal} />}
      {editing && <CalModal title="Modifier l'agenda" initial={editing} onClose={() => setEditing(null)} onSave={(d) => handleSaveEdit({ ...editing, ...d })} />}
      {deletingId && (
        <DeleteConfirm
          name={customCals.find((c) => c.id === deletingId)?.name ?? ""}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </aside>
  );
}

/* ─── Skeleton row ─── */

function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px" }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, background: "#F1F5F9" }} />
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#F1F5F9" }} />
      <span style={{ flex: 1, height: 12, borderRadius: 4, background: "#F1F5F9" }} />
    </div>
  );
}

/* ─── Section ─── */

function Section({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 4px" }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
        {badge && <span style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", background: "#EDF1F5", padding: "0 6px", borderRadius: 999 }}>{badge}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{children}</div>
    </div>
  );
}

/* ─── Row ─── */

type RowProps = {
  color: string; accent: string; initials?: string; icon?: ReactNode;
  avatarUrl?: string | null;
  name: string; subtitle?: string; checked: boolean; onToggle: () => void;
  canEdit: boolean; onEdit?: () => void; onDelete?: () => void;
};

function Row({ color, accent, initials, icon, avatarUrl, name, subtitle, checked, onToggle, canEdit, onEdit, onDelete }: RowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 7, cursor: "pointer", transition: "background 100ms", background: hovered ? "#fff" : "transparent" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        onClick={onToggle}
        style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, transition: "all 120ms", background: checked ? color : "#fff", border: checked ? `1px solid ${color}` : "1.5px solid #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </span>

      <span onClick={onToggle} style={{ flexShrink: 0, display: "flex", cursor: "pointer" }}>
        {icon ?? (
          avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: accent, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 600 }}>
              {initials}
            </span>
          )
        )}
      </span>

      <span onClick={onToggle} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
        <div style={{ fontSize: 12.5, color: checked ? "#0F172A" : "#94A3B8", fontWeight: 500, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: "#94A3B8", lineHeight: 1.2 }}>{subtitle}</div>}
      </span>

      {canEdit && hovered && (
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            title="Modifier"
            style={{ width: 22, height: 22, border: "none", background: "transparent", borderRadius: 5, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Supprimer"
              style={{ width: 22, height: 22, border: "none", background: "transparent", borderRadius: 5, color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Calendar create/edit modal ─── */

type CalModalProps = {
  title: string;
  initial?: { name: string; color: string; accent: string };
  onClose: () => void;
  onSave: (data: { name: string; color: string; accent: string }) => void;
};

function CalModal({ title, initial, onClose, onSave }: CalModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [colorIdx, setColorIdx] = useState(() => {
    if (!initial) return 0;
    const idx = CAL_COLORS.findIndex((c) => c.color === initial.color);
    return idx >= 0 ? idx : 0;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 24px 60px rgba(15,23,42,0.2)", width: "100%", maxWidth: 340, padding: "22px 22px 18px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 18 }}>{title}</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11.5, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 }}>Nom</label>
          <input
            ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
            placeholder="Ex: Projets perso, Missions…"
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSave({ name: name.trim(), ...CAL_COLORS[colorIdx] }); if (e.key === "Escape") onClose(); }}
            style={{ width: "100%", padding: "8px 11px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 11.5, fontWeight: 500, color: "#475569", display: "block", marginBottom: 8 }}>Couleur</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CAL_COLORS.map((c, i) => (
              <button
                key={i} onClick={() => setColorIdx(i)}
                style={{ width: 26, height: 26, borderRadius: "50%", background: c.color, border: colorIdx === i ? "3px solid #0F172A" : "3px solid transparent", cursor: "pointer", boxShadow: colorIdx === i ? `0 0 0 2px ${c.color}44` : "none", transition: "all 120ms" }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button
            disabled={!name.trim()}
            onClick={() => name.trim() && onSave({ name: name.trim(), ...CAL_COLORS[colorIdx] })}
            style={{ padding: "7px 14px", background: name.trim() ? "#0052D9" : "#CBD5E1", color: "#fff", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: name.trim() ? "pointer" : "default", fontFamily: "inherit" }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete confirm ─── */

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 24px 60px rgba(15,23,42,0.2)", width: "100%", maxWidth: 320, padding: "24px 24px 20px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Supprimer cet agenda ?</h3>
        <p style={{ fontSize: 13, color: "#64748B", marginBottom: 22, lineHeight: 1.5 }}>
          L&apos;agenda <strong>{name}</strong> sera supprimé. Les événements liés resteront dans votre calendrier.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "7px 14px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={onConfirm} style={{ padding: "7px 14px", background: "#EF4444", color: "#fff", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Icons ─── */

function GcalIcon() {
  return <span style={{ width: 22, height: 22, borderRadius: 5, background: "#fff", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#4285F4", flexShrink: 0 }}>G</span>;
}

function DotIcon({ color }: { color: string }) {
  return <span style={{ width: 22, height: 22, borderRadius: "50%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} /></span>;
}
