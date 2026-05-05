"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Zap,
  MoreHorizontal,
  Mail,
  Archive,
  Trash2,
  X,
  Send,
  FileText,
  Calendar,
  Paperclip,
  Search,
  ArrowRight,
  Loader2,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import type { Conversation, ThreadEntry } from "./data";
import { resolveVars } from "./data";
import { useSendMessage, useTemplates, useMarkChatUnread } from "./queries";
import { Avatar, StagePill } from "./components";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function DateSep({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "20px 0 12px",
        padding: "0 6px",
      }}
    >
      <div style={{ flex: 1, height: 1, background: "var(--m2-slate-150)" }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--m2-slate-500)",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--m2-slate-150)" }} />
    </div>
  );
}

// ─── External-link warning dialog ────────────────────────────────────────────

function ExternalLinkDialog({
  url,
  onConfirm,
  onCancel,
}: {
  url: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Truncate very long URLs for display
  const display = url.length > 80 ? url.slice(0, 77) + "…" : url;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.40)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--m2-surface-elevated)",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
          width: "100%",
          maxWidth: 420,
          padding: "28px 28px 22px",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "#FEF3C7",
            color: "#D97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--m2-slate-900)",
            marginBottom: 8,
          }}
        >
          Lien externe
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--m2-slate-600)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          Vous êtes sur le point d'ouvrir un lien externe. Assurez-vous de faire
          confiance à la source avant de continuer.
        </div>
        <div
          style={{
            background: "var(--m2-slate-50)",
            border: "1px solid var(--m2-slate-200)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--m2-slate-700)",
            wordBreak: "break-all",
            fontFamily: "monospace",
            marginBottom: 22,
          }}
        >
          {display}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="m2-btn" onClick={onCancel}>
            Annuler
          </button>
          <button className="m2-btn m2-btn-primary" onClick={onConfirm}>
            Ouvrir le lien
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── URL rendering ────────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s<>'"]+/g;
const TRUSTED_HOST = /^https?:\/\/([\w-]+\.)*linkedin\.com\//;

// Renders message text with clickable links. Untrusted links trigger the
// ExternalLinkDialog before opening; trusted (LinkedIn) links open directly.
// onExternalClick receives the URL and a callback to open it once confirmed.
function renderText(
  text: string,
  onExternalClick: (url: string, open: () => void) => void,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[0].replace(/[.,;:!?)]+$/, "");
    const trusted = TRUSTED_HOST.test(url);
    parts.push(
      <a
        key={m.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={
          !trusted
            ? (e) => {
                e.preventDefault();
                onExternalClick(url, () => window.open(url, "_blank", "noopener,noreferrer"));
              }
            : undefined
        }
        style={{
          color: "var(--m2-blue)",
          textDecoration: "underline",
          wordBreak: "break-all",
        }}
      >
        {url}
      </a>,
    );
    last = m.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Bubble({
  m,
  onExternalClick,
}: {
  m: ThreadEntry;
  onExternalClick: (url: string, open: () => void) => void;
}) {
  if (m.kind === "date") return <DateSep label={m.label} />;

  if (m.kind === "auto") {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
        <div
          className="m2-bubble-auto"
          style={{
            padding: "7px 14px",
            borderRadius: 999,
            fontSize: 11.5,
            color: "var(--m2-slate-600)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(0,82,217,0.05)",
            border: "1px solid rgba(0,82,217,0.12)",
          }}
        >
          <Zap size={11} style={{ color: "var(--m2-blue)" }} />
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--m2-slate-700)",
              letterSpacing: "0.02em",
            }}
          >
            Auto
          </span>
          <span>{m.text}</span>
          <span style={{ color: "var(--m2-slate-500)" }}>· {m.time}</span>
        </div>
      </div>
    );
  }

  const out = m.dir === "out";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: out ? "flex-end" : "flex-start",
        margin: "8px 0",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          display: "flex",
          flexDirection: "column",
          alignItems: out ? "flex-end" : "flex-start",
        }}
      >
        <div
          className={out ? "m2-bubble-out" : "m2-bubble-in"}
          style={{
            padding: "12px 15px",
            borderRadius: out ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--m2-slate-800)",
          }}
        >
          {m.text && (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {renderText(m.text, onExternalClick)}
            </div>
          )}
          {m.hasAttachments && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11.5,
                color: "var(--m2-slate-500)",
                fontStyle: "italic",
              }}
            >
              📎 Pièce jointe
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 5,
            fontSize: 10.5,
            color: "var(--m2-slate-500)",
            padding: "0 4px",
          }}
        >
          <span>{m.time}</span>
          {out && <Check size={12} style={{ color: "var(--m2-slate-400)" }} />}
        </div>
      </div>
    </div>
  );
}

function ContextMenu({
  open,
  onClose,
  onMarkUnread,
  onArchive,
}: {
  open: boolean;
  onClose: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
}) {
  if (!open) return null;

  type Item =
    | { kind?: undefined; Icon: React.ComponentType<{ size?: number }>; label: string; action: () => void; danger?: boolean }
    | { kind: "sep" };

  const items: Item[] = [
    {
      Icon: Mail,
      label: "Marquer comme non lu",
      action: () => { onMarkUnread(); onClose(); },
    },
    {
      Icon: Archive,
      label: "Archiver la conversation",
      action: () => { onArchive(); onClose(); },
    },
    { kind: "sep" },
    {
      Icon: Trash2,
      label: "Supprimer la conversation",
      action: onClose, // placeholder — no delete endpoint yet
      danger: true,
    },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 50 }}
      />
      <div
        style={{
          position: "absolute",
          top: 38,
          right: 0,
          zIndex: 51,
          background: "var(--m2-surface-elevated)",
          border: "1px solid var(--m2-slate-200)",
          borderRadius: 10,
          boxShadow:
            "0 8px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.05)",
          minWidth: 220,
          padding: 4,
        }}
      >
        {items.map((it, i) => {
          if ("kind" in it && it.kind === "sep")
            return (
              <div
                key={i}
                style={{ height: 1, background: "var(--m2-slate-150)", margin: "4px 0" }}
              />
            );
          const I = (it as Extract<Item, { Icon: unknown }>).Icon;
          const danger = (it as Extract<Item, { danger?: boolean }>).danger;
          const action = (it as Extract<Item, { action: () => void }>).action;
          return (
            <button
              key={i}
              onClick={action}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontSize: 12.5,
                color: danger ? "#B91C1C" : "var(--m2-slate-700)",
                borderRadius: 6,
                fontFamily: "inherit",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = danger ? "#FEF2F2" : "var(--m2-slate-50)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <I size={14} />
              <span>{(it as Extract<Item, { label: string }>).label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function QuickInsertModal({
  conv,
  onClose,
  onPick,
}: {
  conv: Conversation;
  onClose: () => void;
  onPick: (text: string) => void;
}) {
  const [q, setQ] = useState("");
  // TODO(BACKEND.md §7.2): once message_templates has a `category` column,
  // wire these filters server-side. For now the UI chips remain but only
  // by-channel filtering happens automatically based on conv.channel.
  const [f, setF] = useState<
    "all" | "first" | "relance" | "rdv" | "suivi" | "mine"
  >("all");
  const channelMeta = {
    li: { bg: "#EEF4FE", fg: "#0A4FA8", label: "LinkedIn" },
    wa: { bg: "#ECFDF5", fg: "#15803D", label: "WhatsApp" },
    both: { bg: "#F1F5F9", fg: "#475569", label: "Les deux" },
  };
  const QUICK_FILTERS = [
    { id: "all" as const, label: "Tous" },
    { id: "first" as const, label: "Premier contact" },
    { id: "relance" as const, label: "Relance" },
    { id: "rdv" as const, label: "RDV" },
    { id: "suivi" as const, label: "Suivi" },
    { id: "mine" as const, label: "Mes templates" },
  ];

  const { data: templates } = useTemplates();
  const list = (templates ?? []).filter((t) => {
    // Hide templates from the wrong channel — keep "both" always visible.
    if (t.channel !== "both" && t.channel !== conv.channel) return false;
    if (
      q &&
      !(t.name + " " + t.content).toLowerCase().includes(q.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: 540,
          background: "var(--m2-surface-elevated)",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--m2-slate-150)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={14} style={{ color: "var(--m2-slate-700)" }} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--m2-slate-900)",
              }}
            >
              Insérer un template
            </span>
          </div>
          <button className="m2-icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "12px 16px 8px" }}>
          <div className="m2-input-shell" style={{ padding: "6px 10px" }}>
            <Search size={13} style={{ color: "var(--m2-slate-500)" }} />
            <input
              autoFocus
              placeholder="Rechercher un template…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginTop: 10,
            }}
          >
            {QUICK_FILTERS.map((x) => (
              <button
                key={x.id}
                className={"m2-filter-chip" + (f === x.id ? " active" : "")}
                onClick={() => setF(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px" }}>
          {list.map((t) => {
            const ch = channelMeta[t.channel];
            return (
              <button
                key={t.id}
                onClick={() => {
                  // TODO(BACKEND.md §5.5): read user's booking link from
                  // workspace settings instead of empty string fallback.
                  onPick(resolveVars(t.content, conv, ""));
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: 0,
                  background: "transparent",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--m2-slate-50)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--m2-slate-900)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--m2-slate-500)",
                      marginTop: 2,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: 1.45,
                    }}
                  >
                    {t.content}
                  </div>
                </div>
                <span
                  className="m2-pill"
                  style={{
                    background: `color-mix(in srgb, ${ch.fg} 16%, var(--m2-surface-elevated))`,
                    color: ch.fg,
                    fontSize: 10.5,
                    flexShrink: 0,
                  }}
                >
                  {ch.label}
                </span>
              </button>
            );
          })}
          {list.length === 0 && (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                fontSize: 12.5,
                color: "var(--m2-slate-500)",
              }}
            >
              Aucun template trouvé.
            </div>
          )}
        </div>
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--m2-slate-150)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <a
            href="/messagerie/templates"
            style={{
              fontSize: 11.5,
              color: "var(--m2-blue)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Gérer mes templates <ArrowRight size={11} />
          </a>
          <span style={{ fontSize: 10.5, color: "var(--m2-slate-500)" }}>
            Variables remplacées automatiquement
          </span>
        </div>
      </div>
    </div>
  );
}

export function Thread({
  conv,
  thread,
  onArchive,
}: {
  conv: Conversation;
  thread: ThreadEntry[];
  onArchive: (chatId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [pendingLink, setPendingLink] = useState<{
    url: string;
    open: () => void;
  } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sendMutation = useSendMessage();
  const markUnread = useMarkChatUnread();

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conv.id, thread.length]);

  // Reset la pièce jointe en attente quand on change de conversation,
  // pour éviter qu'un fichier soit envoyé au mauvais prospect.
  useEffect(() => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [conv.id]);

  const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 Mo

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Fichier trop volumineux (10 Mo max).");
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    e.target.value = ""; // permet de re-sélectionner le même fichier après suppression
  };

  const handleSend = () => {
    const text = draft.trim();
    if (sendMutation.isPending) return;
    // L'envoi est autorisé si on a au moins du texte OU un fichier.
    if (!text && !pendingFile) return;
    sendMutation.mutate(
      { chatId: conv.id, text, file: pendingFile },
      {
        onSuccess: () => {
          setDraft("");
          setPendingFile(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erreur d'envoi");
        },
      },
    );
  };

  const onComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        background: "var(--m2-surface-muted)",
      }}
    >
      {/* Thread header */}
      <div
        style={{
          padding: "14px 22px",
          borderBottom: "1px solid var(--m2-slate-150)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "var(--m2-surface-elevated)",
          boxShadow:
            "0 1px 0 rgba(15,23,42,0.04), 0 4px 8px -6px rgba(15,23,42,0.08)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <Avatar name={conv.name} size={40} pictureUrl={conv.pictureUrl} />
        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 500,
                color: "var(--m2-slate-900)",
              }}
            >
              {conv.name}
            </span>
            <StagePill stage={conv.stage} />
            {conv.linkedinUrl && (
              <a
                href={conv.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Voir le profil LinkedIn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: "#EEF4FE",
                  color: "#0A66C2",
                  textDecoration: "none",
                  transition: "background 120ms",
                }}
              >
                <Linkedin size={12} />
              </a>
            )}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--m2-slate-500)",
              marginTop: 2,
            }}
          >
            {[conv.company, conv.role].filter(Boolean).join(" · ") ||
              "Hors CRM"}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <button
            className="m2-icon-btn"
            title="Plus d'actions"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal size={16} />
          </button>
          <ContextMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onMarkUnread={() => markUnread.mutate(conv.id)}
            onArchive={() => onArchive(conv.id)}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", padding: "24px 26px 16px" }}
      >
        {thread.map((m, i) => (
          <Bubble
            key={i}
            m={m}
            onExternalClick={(url, open) => setPendingLink({ url, open })}
          />
        ))}
      </div>

      {/* Composer */}
      <div
        style={{
          padding: "14px 22px 18px",
          borderTop: "1px solid var(--m2-slate-150)",
          background: "var(--m2-surface-elevated)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFilePick}
        />
        <div
          style={{
            border: "1px solid var(--m2-slate-200)",
            borderRadius: 12,
            background: "var(--m2-surface-elevated)",
          }}
        >
          {pendingFile && (
            <div
              style={{
                margin: "10px 12px 0",
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--m2-slate-50)",
                border: "1px solid var(--m2-slate-200)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "var(--m2-blue-50)",
                  color: "var(--m2-blue)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Paperclip size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--m2-slate-900)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pendingFile.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--m2-slate-500)" }}>
                  {formatFileSize(pendingFile.size)}
                </div>
              </div>
              <button
                type="button"
                className="m2-icon-btn"
                onClick={() => setPendingFile(null)}
                title="Retirer la pièce jointe"
                disabled={sendMutation.isPending}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKey}
            placeholder="Votre message…"
            style={{
              width: "100%",
              resize: "none",
              border: 0,
              outline: 0,
              padding: "12px 14px 6px",
              fontSize: 13.5,
              lineHeight: 1.55,
              fontFamily: "inherit",
              color: "var(--m2-slate-900)",
              minHeight: 60,
              background: "transparent",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px 8px",
            }}
          >
            <button
              className="m2-btn m2-btn-ghost"
              style={{ padding: "5px 8px" }}
              title="Insérer un template"
              onClick={() => setTplOpen(true)}
            >
              <FileText size={14} />
              <span className="m2-thread-btn-label">Templates</span>
            </button>
            <button
              className="m2-btn m2-btn-ghost"
              style={{ padding: "5px 8px" }}
              title="Insérer un lien Calendly"
            >
              <Calendar size={14} />
              <span className="m2-thread-btn-label">Lien booking</span>
            </button>
            <button
              className="m2-btn m2-btn-ghost"
              style={{ padding: "5px 8px" }}
              title="Pièce jointe (10 Mo max)"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMutation.isPending}
            >
              <Paperclip size={14} />
            </button>
            <div style={{ marginLeft: "auto" }}>
              <button
                className="m2-btn m2-btn-primary"
                style={{ padding: "7px 14px" }}
                title="Envoyer (⏎)"
                onClick={handleSend}
                disabled={(!draft.trim() && !pendingFile) || sendMutation.isPending}
              >
                {sendMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Envoyer
              </button>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 6,
            fontSize: 10.5,
            color: "var(--m2-slate-400)",
          }}
        >
          <span>
            <span className="m2-kbd" style={{ fontSize: 10 }}>
              ⏎
            </span>{" "}
            envoyer ·{" "}
            <span className="m2-kbd" style={{ fontSize: 10 }}>
              Maj+⏎
            </span>{" "}
            saut de ligne
          </span>
        </div>
      </div>
      {tplOpen && (
        <QuickInsertModal
          conv={conv}
          onClose={() => setTplOpen(false)}
          onPick={(text) => setDraft((d) => (d ? d + "\n\n" + text : text))}
        />
      )}
      {pendingLink && (
        <ExternalLinkDialog
          url={pendingLink.url}
          onConfirm={() => {
            pendingLink.open();
            setPendingLink(null);
          }}
          onCancel={() => setPendingLink(null)}
        />
      )}
    </div>
  );
}
