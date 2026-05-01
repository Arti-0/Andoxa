"use client";

// Lightweight dialog for editing workflow-level metadata (name, description,
// "save as template"). Inline-styled to match the design system.

import { useEffect, useState } from "react";
import { Icon, ICO } from "./icons";

interface SettingsDialogProps {
  open: boolean;
  initialName: string;
  initialDescription: string;
  initialIsTemplate: boolean;
  onClose: () => void;
  onSave: (next: {
    name: string;
    description: string;
    isTemplate: boolean;
  }) => void;
}

export function SettingsDialog({
  open,
  initialName,
  initialDescription,
  initialIsTemplate,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setIsTemplate(initialIsTemplate);
    }
  }, [open, initialName, initialDescription, initialIsTemplate]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: "calc(100vw - 32px)",
          background: "white",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#0F172A",
              letterSpacing: "-0.01em",
            }}
          >
            Paramètres du workflow
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#94A3B8",
              padding: 4,
              display: "flex",
            }}
            aria-label="Fermer"
          >
            <Icon size={16} color="#94A3B8" d={ICO.x} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 5,
            }}
          >
            Nom du workflow
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 9,
              border: "1.5px solid #E2E8F0",
              fontSize: 13.5,
              color: "#0F172A",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 5,
            }}
          >
            Description{" "}
            <span style={{ fontSize: 11, fontWeight: 400, color: "#94A3B8" }}>
              (optionnel)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Décrit l'objectif de ce workflow et ce qu'il fait."
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 9,
              border: "1.5px solid #E2E8F0",
              fontSize: 13.5,
              color: "#0F172A",
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            background: isTemplate ? "#E8F0FD" : "#F8FAFC",
            cursor: "pointer",
            marginBottom: 18,
            transition: "background 120ms",
          }}
        >
          <input
            type="checkbox"
            checked={isTemplate}
            onChange={(e) => setIsTemplate(e.target.checked)}
            style={{
              marginTop: 2,
              accentColor: "#0052D9",
              width: 16,
              height: 16,
              cursor: "pointer",
            }}
          />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0F172A",
                marginBottom: 2,
              }}
            >
              Enregistrer comme modèle
            </div>
            <div
              style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}
            >
              Ce workflow apparaîtra dans le menu « Utiliser un modèle » et dans
              la liste des modèles du canvas pour toute votre organisation.
            </div>
          </div>
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              background: "white",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() =>
              onSave({
                name: name.trim(),
                description: description.trim(),
                isTemplate,
              })
            }
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: "#0052D9",
              fontSize: 13,
              fontWeight: 600,
              color: "white",
              cursor: "pointer",
            }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
