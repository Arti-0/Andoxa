"use client";

import { useState, type ReactNode } from "react";
import type { VisibilityMap } from "./data";
import { useOrgMembers, useCurrentUserProfile, type OrgMember } from "./queries";

type Props = {
  visible: VisibilityMap;
  onToggle: (id: string) => void;
  onToggleTeamAll: (memberIds: string[]) => void;
};

export function CalendarsSidebar({ visible, onToggle, onToggleTeamAll }: Props) {
  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const { data: me } = useCurrentUserProfile();

  const anyTeamVisible =
    members.length > 0 && members.some((m) => visible[m.id] !== false);

  const handleTeamHeaderToggle = () => {
    if (members.length === 0) return;
    onToggleTeamAll(members.map((m) => m.id));
  };

  return (
    <aside style={{ width: 240, flexShrink: 0, background: "var(--cal2-canvas-soft)", borderRight: "1px solid var(--cal2-border-faint)", display: "flex", flexDirection: "column", padding: "18px 14px 14px", overflowY: "auto", height: "100%" }}>
      <Section title="Mon agenda">
        <Row
          color="#0052D9" accent="var(--cal2-blue-tint)"
          initials={me?.initials ?? "VO"}
          avatarUrl={me?.avatarUrl ?? null}
          name={me?.fullName ?? "Vous"}
          subtitle="Andoxa"
          checked={!!visible.me} onToggle={() => onToggle("me")}
        />
        <Row
          color="var(--cal2-text-soft)" accent="var(--cal2-surface-2)" icon={<GcalIcon />} name="Google Calendar" subtitle="Synchronisé"
          checked={!!visible.gcal} onToggle={() => onToggle("gcal")}
        />
      </Section>

      <Section
        title="Mon équipe"
        badge={membersLoading ? undefined : String(members.length)}
        headerChecked={anyTeamVisible}
        onHeaderToggle={members.length > 0 ? handleTeamHeaderToggle : undefined}
        headerToggleTitle={
          anyTeamVisible
            ? "Masquer tous les agendas de l'équipe"
            : "Afficher tous les agendas de l'équipe"
        }
      >
        {membersLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 11.5, color: "var(--cal2-text-faint)", padding: "4px 8px" }}>Aucun collègue</div>
        ) : (
          members.map((m: OrgMember) => (
            <Row
              key={m.id} color={m.color} accent={m.accent} initials={m.initials} name={m.name}
              avatarUrl={m.avatarUrl}
              checked={visible[m.id] !== false} onToggle={() => onToggle(m.id)}
            />
          ))
        )}
      </Section>

      <div style={{ flex: 1 }} />

      <Section title="Externes">
        <Row color="#EF4444" accent="#FEE2E2" icon={<DotIcon color="#EF4444" />} name="Jours fériés France"
          checked={!!visible.holidays} onToggle={() => onToggle("holidays")} />
        <Row color="#F59E0B" accent="#FEF3C7" icon={<DotIcon color="#F59E0B" />} name="Vacances scolaires"
          checked={visible.vacances !== false} onToggle={() => onToggle("vacances")} />
      </Section>
    </aside>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px" }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, background: "var(--cal2-surface-2)" }} />
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--cal2-surface-2)" }} />
      <span style={{ flex: 1, height: 12, borderRadius: 4, background: "var(--cal2-surface-2)" }} />
    </div>
  );
}

function Section({
  title,
  badge,
  headerChecked,
  onHeaderToggle,
  headerToggleTitle,
  children,
}: {
  title: string;
  badge?: string;
  headerChecked?: boolean;
  onHeaderToggle?: () => void;
  headerToggleTitle?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      {onHeaderToggle ? (
        <button
          type="button"
          onClick={onHeaderToggle}
          title={headerToggleTitle}
          aria-pressed={headerChecked}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
            padding: "2px 4px",
            marginLeft: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            borderRadius: 6,
            width: "100%",
            textAlign: "left",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cal2-surface)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <span
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              flexShrink: 0,
              background: headerChecked ? "#0052D9" : "var(--cal2-surface)",
              border: headerChecked ? "1px solid #0052D9" : "1.5px solid var(--cal2-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {headerChecked && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--cal2-text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {title}
          </span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--cal2-text-faint)", background: "var(--cal2-border-faint)", padding: "0 6px", borderRadius: 999 }}>
              {badge}
            </span>
          )}
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 4px" }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--cal2-text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
          {badge && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--cal2-text-faint)", background: "var(--cal2-border-faint)", padding: "0 6px", borderRadius: 999 }}>{badge}</span>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{children}</div>
    </div>
  );
}

type RowProps = {
  color: string;
  accent: string;
  initials?: string;
  icon?: ReactNode;
  avatarUrl?: string | null;
  name: string;
  subtitle?: string;
  checked: boolean;
  onToggle: () => void;
};

function Row({ color, initials, icon, avatarUrl, name, subtitle, checked, onToggle }: RowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 6px",
        borderRadius: 7,
        transition: "background 100ms",
        background: hovered ? "var(--cal2-surface)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "4px 2px",
          margin: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          userSelect: "none",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            flexShrink: 0,
            transition: "all 120ms",
            background: checked ? color : "var(--cal2-surface)",
            border: checked ? `1px solid ${color}` : "1.5px solid var(--cal2-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>

        <span aria-hidden style={{ flexShrink: 0, display: "flex", pointerEvents: "none" }}>
          {icon ?? (
            avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                draggable={false}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  objectFit: "cover",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            ) : (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${color} 22%, var(--cal2-surface))`,
                  color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9.5,
                  fontWeight: 600,
                }}
              >
                {initials}
              </span>
            )
          )}
        </span>

        <span style={{ flex: 1, minWidth: 0, pointerEvents: "none" }}>
          <div
            style={{
              fontSize: 12.5,
              color: checked ? "var(--cal2-text)" : "var(--cal2-text-faint)",
              fontWeight: 500,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          {subtitle && (
            <div style={{ fontSize: 10.5, color: "var(--cal2-text-faint)", lineHeight: 1.2 }}>{subtitle}</div>
          )}
        </span>
      </button>
    </div>
  );
}

function GcalIcon() {
  return <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--cal2-surface)", border: "1px solid var(--cal2-border-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#4285F4", flexShrink: 0 }}>G</span>;
}

function DotIcon({ color }: { color: string }) {
  return <span style={{ width: 22, height: 22, borderRadius: "50%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} /></span>;
}
