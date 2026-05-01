"use client";

import "../styles.css";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  MessageSquarePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminTemplates,
  useDeleteTemplate,
  useDuplicateTemplate,
  useSaveTemplate,
  type AdminTemplate,
} from "./queries";

// ─── Category types ──────────────────────────────────────────────────────────

type CategoryEntry = { id: string; emoji: string; label: string };

// Only one built-in category — "all" acts as the view-all filter.
// Users must create their own categories.
const BASE_CATEGORY: CategoryEntry = { id: "all", emoji: "📁", label: "Tous les templates" };

const CAT_EMOJIS = ["📂", "💼", "🤝", "🚀", "💡", "🎉", "📣", "🔥", "⭐", "🎯"];

function loadCustomCategories(): CategoryEntry[] {
  try { return JSON.parse(localStorage.getItem("tpl_custom_cats") ?? "[]") as CategoryEntry[]; }
  catch { return []; }
}

function saveCustomCategories(cats: CategoryEntry[]) {
  try { localStorage.setItem("tpl_custom_cats", JSON.stringify(cats)); } catch {}
}

// ─── Channel config ───────────────────────────────────────────────────────────

const CHANNELS = {
  li:   { label: "LinkedIn",            bg: "#EEF4FE", fg: "#0A4FA8" },
  wa:   { label: "WhatsApp",            bg: "#ECFDF5", fg: "#15803D" },
  both: { label: "LinkedIn & WhatsApp", bg: "#F1F5F9", fg: "#475569" },
} as const;
type ChannelId = keyof typeof CHANNELS;

// ─── Pill helper ─────────────────────────────────────────────────────────────

const CUSTOM_PILL = { bg: "#F1F5F9", fg: "#334155" };
function catPill(catId: string, label: string) {
  return { ...CUSTOM_PILL, label };
}

// ─── Variable helpers ────────────────────────────────────────────────────────

const VARS = [
  { key: "{prénom}",       desc: "Prénom du prospect" },
  { key: "{nom}",          desc: "Nom de famille" },
  { key: "{entreprise}",   desc: "Nom de l'entreprise" },
  { key: "{poste}",        desc: "Poste du prospect" },
  { key: "{lien_booking}", desc: "Votre lien de booking" },
];

const SAMPLE: Record<string, string> = {
  "{prénom}":       "Andréas",
  "{nom}":          "Bodin",
  "{entreprise}":   "Andoxa",
  "{poste}":        "Co-fondateur",
  "{lien_booking}": "andoxa.app/book/marie-dubois",
};

type Template = AdminTemplate;

function detectVars(text: string) {
  const set = new Set<string>();
  (text.match(/\{[^{}]+\}/g) || []).forEach((v) => set.add(v));
  return [...set];
}

// ─── New category modal ───────────────────────────────────────────────────────

function NewCategoryModal({ onClose, onSave }: { onClose: () => void; onSave: (cat: CategoryEntry) => void }) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("📂");

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave({ id: `custom_${Date.now()}`, emoji, label: trimmed });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 14, boxShadow: "0 24px 60px rgba(15,23,42,0.22)", width: "100%", maxWidth: 380 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--m2-slate-150)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--m2-slate-900)" }}>Nouvelle catégorie</span>
          <button className="m2-icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="m2-form-label">Nom de la catégorie</label>
            <input className="m2-form-input" autoFocus maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="Ex: Reactivation, Closing…" />
          </div>
          <div>
            <label className="m2-form-label">Icône</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CAT_EMOJIS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${emoji === e ? "var(--m2-blue)" : "var(--m2-slate-200)"}`, background: emoji === e ? "var(--m2-blue-50)" : "transparent", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--m2-slate-150)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="m2-btn" onClick={onClose}>Annuler</button>
          <button className="m2-btn m2-btn-primary" disabled={!label.trim()} onClick={handleSave}>Créer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Rename category modal ────────────────────────────────────────────────────

function RenameCategoryModal({ cat, onClose, onSave }: { cat: CategoryEntry; onClose: () => void; onSave: (label: string, emoji: string) => void }) {
  const [label, setLabel] = useState(cat.label);
  const [emoji, setEmoji] = useState(cat.emoji);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 14, boxShadow: "0 24px 60px rgba(15,23,42,0.22)", width: "100%", maxWidth: 380 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--m2-slate-150)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--m2-slate-900)" }}>Modifier la catégorie</span>
          <button className="m2-icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="m2-form-label">Nom</label>
            <input className="m2-form-input" autoFocus maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) { onSave(label.trim(), emoji); onClose(); } }} />
          </div>
          <div>
            <label className="m2-form-label">Icône</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CAT_EMOJIS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${emoji === e ? "var(--m2-blue)" : "var(--m2-slate-200)"}`, background: emoji === e ? "var(--m2-blue-50)" : "transparent", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--m2-slate-150)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="m2-btn" onClick={onClose}>Annuler</button>
          <button className="m2-btn m2-btn-primary" disabled={!label.trim()} onClick={() => { if (label.trim()) { onSave(label.trim(), emoji); onClose(); } }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Categories sidebar ───────────────────────────────────────────────────────

function CategoriesSidebar({
  active, setActive, counts, categories, onNewCategory, onRenameCategory, onDeleteCategory,
}: {
  active: string;
  setActive: (id: string) => void;
  counts: Record<string, number>;
  categories: CategoryEntry[];
  onNewCategory: () => void;
  onRenameCategory: (id: string, label: string, emoji: string) => void;
  onDeleteCategory: (id: string) => void;
}) {
  const [renamingCat, setRenamingCat] = useState<CategoryEntry | null>(null);

  return (
    <aside style={{ width: 240, borderRight: "1px solid var(--m2-slate-200)", background: "#FCFCFD", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "14px 12px 6px", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m2-slate-500)" }}>
        Catégories
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {categories.map((c) => (
          <CatRow
            key={c.id}
            cat={c}
            active={active === c.id}
            count={counts[c.id] ?? 0}
            canEdit={c.id !== "all"}
            onClick={() => setActive(c.id)}
            onRename={() => setRenamingCat(c)}
            onDelete={() => onDeleteCategory(c.id)}
          />
        ))}
      </div>
      <div style={{ padding: "12px 12px 16px", borderTop: "1px solid var(--m2-slate-150)" }}>
        <button className="m2-btn" style={{ width: "100%", justifyContent: "center" }} onClick={onNewCategory}>
          <Plus size={13} />
          Nouvelle catégorie
        </button>
      </div>

      {renamingCat && (
        <RenameCategoryModal
          cat={renamingCat}
          onClose={() => setRenamingCat(null)}
          onSave={(label, emoji) => { onRenameCategory(renamingCat.id, label, emoji); setRenamingCat(null); }}
        />
      )}
    </aside>
  );
}

function CatRow({ cat, active, count, canEdit, onClick, onRename, onDelete }: {
  cat: CategoryEntry; active: boolean; count: number; canEdit: boolean;
  onClick: () => void; onRename: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={"m2-cat-item" + (active ? " active" : "")}
      style={{ position: "relative", display: "flex", alignItems: "center" }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontSize: 14 }}>{cat.emoji}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.label}</span>
      {hovered && canEdit ? (
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button
            className="m2-icon-btn"
            title="Renommer"
            style={{ width: 22, height: 22 }}
            onClick={onRename}
          >
            <Pencil size={11} />
          </button>
          <button
            className="m2-icon-btn danger"
            title="Supprimer"
            style={{ width: 22, height: 22 }}
            onClick={onDelete}
          >
            <Trash2 size={11} />
          </button>
        </div>
      ) : (
        <span className="m2-cat-count">({count})</span>
      )}
    </div>
  );
}

// ─── Multi-tag select ─────────────────────────────────────────────────────────

function TagSelect({ selected, onChange, options }: {
  selected: string[];
  onChange: (tags: string[]) => void;
  options: CategoryEntry[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectableOptions = options.filter(
    (o) => o.id !== "all" && !selected.includes(o.id) &&
      (!query || o.label.toLowerCase().includes(query.toLowerCase())),
  );

  const addTag = (id: string) => {
    onChange([...selected, id]);
    setQuery("");
  };

  const removeTag = (id: string) => onChange(selected.filter((t) => t !== id));

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "5px 6px", border: "1px solid var(--m2-slate-200)", borderRadius: 8, background: "#fff", minHeight: 38 }}>
        {selected.map((id) => {
          const opt = options.find((o) => o.id === id);
          return opt ? (
            <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 4px 2px 8px", background: "var(--m2-blue-50)", color: "var(--m2-blue)", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
              {opt.emoji} {opt.label}
              <button
                onClick={() => removeTag(id)}
                style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(0,82,217,0.12)", border: "none", color: "var(--m2-blue)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
              >
                <X size={9} />
              </button>
            </span>
          ) : null;
        })}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length === 0 ? "Ajouter un tag…" : ""}
          style={{ flex: 1, minWidth: 100, border: "none", outline: "none", fontSize: 12.5, fontFamily: "inherit", background: "transparent", padding: "3px 4px" }}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid var(--m2-slate-200)", borderRadius: 8, boxShadow: "0 6px 18px rgba(15,23,42,0.08)", zIndex: 20, maxHeight: 200, overflowY: "auto" }}>
          {selectableOptions.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--m2-slate-500)", fontStyle: "italic" }}>
              {options.filter((o) => o.id !== "all").length === 0
                ? "Créez d'abord une catégorie dans la barre latérale."
                : "Aucune catégorie correspondante."}
            </div>
          ) : (
            selectableOptions.map((o) => (
              <button
                key={o.id}
                onMouseDown={() => addTag(o.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", fontSize: 13 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 15 }}>{o.emoji}</span>
                <span style={{ color: "var(--m2-slate-800)", fontWeight: 500 }}>{o.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onEdit, onDuplicate, onDelete, categories }: {
  tpl: Template; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
  categories: CategoryEntry[];
}) {
  const ch = CHANNELS[tpl.channel] || CHANNELS.both;
  const preview = tpl.content.split("\n").join(" ").slice(0, 180);
  const vars = detectVars(tpl.content);
  const tags = tpl.tags ?? [];

  return (
    <div className="m2-tpl-card" onClick={onEdit}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--m2-slate-900)", flex: 1, minWidth: 0 }}>{tpl.name}</div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {tags.map((id) => {
            const cat = categories.find((c) => c.id === id);
            const pill = cat ? catPill(id, cat.label) : catPill(id, id);
            return cat ? (
              <span key={id} className="m2-pill" style={{ background: pill.bg, color: pill.fg }}>
                {cat.emoji} {cat.label}
              </span>
            ) : null;
          })}
          <span className="m2-pill" style={{ background: ch.bg, color: ch.fg, fontSize: 10.5 }}>{ch.label}</span>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--m2-slate-600)", marginTop: 8, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {preview}{tpl.content.length > 180 ? "…" : ""}
      </div>
      {vars.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {vars.map((v) => <span key={v} className="m2-var-pill">{v}</span>)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--m2-slate-150)" }}>
        <span style={{ fontSize: 11, color: "var(--m2-slate-500)" }}>Utilisé {tpl.usage} fois ce mois</span>
        <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
          <button className="m2-icon-btn" title="Éditer" onClick={onEdit}><Pencil size={13} /></button>
          <button className="m2-icon-btn" title="Dupliquer" onClick={onDuplicate}><Copy size={13} /></button>
          <button className="m2-icon-btn danger" title="Supprimer" onClick={onDelete}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "60px 20px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: "var(--m2-blue-50)", color: "var(--m2-blue)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <MessageSquarePlus size={40} />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 500, color: "var(--m2-slate-900)" }}>Créez votre premier template</h3>
      <p style={{ fontSize: 13, color: "var(--m2-slate-600)", marginTop: 8, maxWidth: 440, lineHeight: 1.55 }}>
        Les templates vous permettent de gagner du temps sur vos messages récurrents. Créez-en autant que vous voulez et insérez-les en 1 clic dans vos conversations.
      </p>
      <button className="m2-btn m2-btn-primary" style={{ marginTop: 20 }} onClick={onNew}>
        <Plus size={14} />Créer mon premier template
      </button>
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

type EditingTemplate = Partial<Template> & {
  name: string;
  tags: string[];
  channel: ChannelId;
  content: string;
};

function EditModal({ tpl, onClose, onSave, onDelete, categories }: {
  tpl: EditingTemplate;
  onClose: () => void;
  onSave: (t: EditingTemplate) => void;
  onDelete: (id: string) => void;
  categories: CategoryEntry[];
}) {
  const isNew = !tpl.id;
  const [name, setName] = useState(tpl.name || "");
  const [tags, setTags] = useState<string[]>(tpl.tags ?? []);
  const [channel, setChannel] = useState<ChannelId>(tpl.channel || "both");
  const [content, setContent] = useState(tpl.content || "");
  const [previewOpen, setPreviewOpen] = useState(true);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insertVar = (v: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart; const end = ta.selectionEnd;
    const next = content.slice(0, start) + v + content.slice(end);
    setContent(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length); }, 0);
  };

  const renderedPreview = useMemo(() => {
    let s = content;
    Object.entries(SAMPLE).forEach(([k, val]) => { s = s.split(k).join(`__VAR_OPEN__${val}__VAR_CLOSE__`); });
    return s;
  }, [content]);

  const charCount = content.length;
  const charHint = channel === "wa" ? "Optimal : 100–300 caractères pour WhatsApp" : channel === "li" ? "Optimal : 50–150 caractères pour LinkedIn" : "Optimal : 50–150 (LinkedIn) · 100–300 (WhatsApp)";

  return (
    <div className="m2-modal-backdrop" onClick={onClose}>
      <div className="m2-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--m2-slate-150)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--m2-slate-900)" }}>{isNew ? "Nouveau template" : "Modifier le template"}</h2>
          <button className="m2-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: "20px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="m2-form-label">Nom</label>
            <input className="m2-form-input" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Premier contact LinkedIn — Founder B2B" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="m2-form-label">Tags</label>
              <TagSelect selected={tags} onChange={setTags} options={categories} />
            </div>
            <div>
              <label className="m2-form-label">Canal préféré</label>
              <div className="m2-seg" style={{ width: "100%" }}>
                <button className={channel === "li" ? "active" : ""} onClick={() => setChannel("li")} style={{ flex: 1, justifyContent: "center" }}>LinkedIn</button>
                <button className={channel === "wa" ? "active" : ""} onClick={() => setChannel("wa")} style={{ flex: 1, justifyContent: "center" }}>WhatsApp</button>
                <button className={channel === "both" ? "active" : ""} onClick={() => setChannel("both")} style={{ flex: 1, justifyContent: "center" }}>Les deux</button>
              </div>
            </div>
          </div>

          <div>
            <label className="m2-form-label">Message</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--m2-slate-500)", alignSelf: "center", marginRight: 4 }}>Insérer :</span>
              {VARS.map((v) => (
                <button key={v.key} className="m2-var-toolbar-btn" title={`Sera remplacé par : ${v.desc}`} onClick={() => insertVar(v.key)}>{v.key}</button>
              ))}
            </div>
            <textarea ref={taRef} className="m2-form-textarea" style={{ minHeight: 200 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Bonjour {prénom}, j'ai vu votre profil et…" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--m2-slate-500)" }}>{charHint}</span>
              <span style={{ fontSize: 11, color: "var(--m2-slate-500)" }}>{charCount} caractères</span>
            </div>
          </div>

          <div>
            <button onClick={() => setPreviewOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: "var(--m2-slate-700)", background: "transparent", border: 0, cursor: "pointer", padding: 0 }}>
              <span style={{ transform: previewOpen ? "rotate(90deg)" : "none", transition: "transform 200ms", display: "flex" }}><ChevronRight size={12} /></span>
              Aperçu du rendu
            </button>
            {previewOpen && (
              <div className="m2-preview-block" style={{ marginTop: 8 }}>
                {renderedPreview ? (
                  renderedPreview.split("__VAR_OPEN__").map((part, i) => {
                    if (i === 0) return <span key={i}>{part}</span>;
                    const [val, rest] = part.split("__VAR_CLOSE__");
                    return <span key={i}><span className="m2-var-resolved">{val}</span>{rest}</span>;
                  })
                ) : (
                  <span style={{ color: "var(--m2-slate-500)", fontStyle: "italic" }}>Votre message apparaîtra ici…</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--m2-slate-150)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {!isNew && tpl.id ? (
            <button className="m2-btn m2-btn-danger-ghost" onClick={() => { if (tpl.id) { onDelete(tpl.id); onClose(); } }}>
              <Trash2 size={13} />Supprimer
            </button>
          ) : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="m2-btn" onClick={onClose}>Annuler</button>
            <button className="m2-btn m2-btn-primary" disabled={!name.trim() || !content.trim()} onClick={() => { onSave({ ...tpl, name, tags, channel, content }); onClose(); }}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ padding: "18px 28px 14px", borderBottom: "1px solid var(--m2-slate-200)", background: "white" }}>
      <Link href="/messagerie" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--m2-slate-500)", textDecoration: "none" }}>
        <ArrowLeft size={12} />Messagerie
      </Link>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--m2-slate-900)", letterSpacing: "-0.01em" }}>Templates de messages</h1>
          <p style={{ fontSize: 13, color: "var(--m2-slate-600)", marginTop: 4 }}>Créez et gérez vos templates pour répondre plus vite à vos prospects.</p>
        </div>
        <button className="m2-btn m2-btn-primary" onClick={onNew}><Plus size={14} />Nouveau template</button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { data: templatesData } = useAdminTemplates();
  const templates = templatesData ?? [];
  const saveMutation = useSaveTemplate();
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();

  const [customCats, setCustomCats] = useState<CategoryEntry[]>(() =>
    typeof window !== "undefined" ? loadCustomCategories() : [],
  );
  const [newCatOpen, setNewCatOpen] = useState(false);

  const categories: CategoryEntry[] = [BASE_CATEGORY, ...customCats];

  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"used" | "recent" | "alpha">("used");
  const [view, setView] = useState<"compact" | "detail">("detail");
  const [editing, setEditing] = useState<EditingTemplate | null>(null);

  const handleNewCategory = (cat: CategoryEntry) => {
    const next = [...customCats, cat];
    setCustomCats(next); saveCustomCategories(next);
    setActiveCat(cat.id);
    toast.success(`Catégorie « ${cat.label} » créée`);
  };

  const handleRenameCategory = (id: string, label: string, emoji: string) => {
    const next = customCats.map((c) => c.id === id ? { ...c, label, emoji } : c);
    setCustomCats(next); saveCustomCategories(next);
    toast.success("Catégorie mise à jour");
  };

  const handleDeleteCategory = (id: string) => {
    const cat = customCats.find((c) => c.id === id);
    const next = customCats.filter((c) => c.id !== id);
    setCustomCats(next); saveCustomCategories(next);
    if (activeCat === id) setActiveCat("all");
    toast.success(`Catégorie « ${cat?.label ?? "" } » supprimée`);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: templates.length };
    customCats.forEach((cat) => {
      c[cat.id] = templates.filter((t) => (t.tags ?? []).includes(cat.id)).length;
    });
    return c;
  }, [templates, customCats]);

  const filtered = useMemo(() => {
    let list = templates;
    if (activeCat !== "all") list = list.filter((t) => (t.tags ?? []).includes(activeCat));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q));
    }
    if (sort === "used")  list = [...list].sort((a, b) => b.usage - a.usage);
    if (sort === "alpha") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [templates, activeCat, search, sort]);

  const newTpl = () => setEditing({
    tags: activeCat === "all" ? [] : [activeCat],
    channel: "both", content: "", name: "",
  });

  const save = (tpl: EditingTemplate) => {
    saveMutation.mutate(
      { id: tpl.id, name: tpl.name, tags: tpl.tags, category: tpl.tags[0] ?? "first", channel: tpl.channel, content: tpl.content, usage: tpl.usage ?? 0 },
      {
        onSuccess: () => toast.success(tpl.id ? "Template mis à jour" : "Template créé"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
      },
    );
  };
  const del = (id: string) => deleteMutation.mutate(id, { onSuccess: () => toast.success("Template supprimé"), onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur") });
  const dup = (tpl: Template) => duplicateMutation.mutate(tpl, { onSuccess: () => toast.success("Template dupliqué"), onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur") });

  return (
    <div className="m2-root flex h-full min-w-[1100px] flex-col">
      <div className="flex flex-1 flex-col min-h-0">
        <PageHeader onNew={newTpl} />
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <CategoriesSidebar
            active={activeCat} setActive={setActiveCat} counts={counts} categories={categories}
            onNewCategory={() => setNewCatOpen(true)}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#F7F8FA" }}>
            {templates.length === 0 ? (
              <EmptyState onNew={newTpl} />
            ) : (
              <>
                <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--m2-slate-200)", background: "white", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div className="m2-input-shell" style={{ flex: 1, minWidth: 240, maxWidth: 420 }}>
                    <Search size={13} style={{ color: "var(--m2-slate-500)" }} />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher dans vos templates…" />
                  </div>
                  <select className="m2-form-select" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as "used" | "recent" | "alpha")}>
                    <option value="used">Plus utilisés</option>
                    <option value="recent">Plus récents</option>
                    <option value="alpha">Alphabétique</option>
                  </select>
                  <div className="m2-seg">
                    <button className={view === "compact" ? "active" : ""} onClick={() => setView("compact")}>Compact</button>
                    <button className={view === "detail" ? "active" : ""} onClick={() => setView("detail")}>Détaillé</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "grid", gridTemplateColumns: view === "compact" ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr", gap: 14, alignContent: "flex-start" }}>
                  {filtered.map((t) => (
                    <TemplateCard key={t.id} tpl={t} categories={categories} onEdit={() => setEditing(t)} onDuplicate={() => dup(t)} onDelete={() => del(t.id)} />
                  ))}
                  {filtered.length === 0 && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--m2-slate-500)", fontSize: 13 }}>Aucun template ne correspond à votre recherche.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EditModal tpl={editing} onClose={() => setEditing(null)} onSave={save} onDelete={del} categories={categories} />
      )}
      {newCatOpen && (
        <NewCategoryModal onClose={() => setNewCatOpen(false)} onSave={handleNewCategory} />
      )}
    </div>
  );
}
