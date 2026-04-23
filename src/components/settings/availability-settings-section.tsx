"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard, settingsLabelClass, settingsSaveButtonClass } from "@/components/settings/settings-card";
import type { AvailabilityConfig } from "@/lib/booking/slots";
import { useWorkspace } from "@/lib/workspace";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DEFAULT_CONFIG: Required<AvailabilityConfig> = {
  startHour: 9,
  endHour: 18,
  slotMinutes: 30,
  workingDays: [1, 2, 3, 4, 5],
  daysAhead: 14,
};

export function AvailabilitySettingsSection() {
  const { profile } = useWorkspace();
  const initialConfig = (profile?.metadata as Record<string, unknown> | null)?.availability as AvailabilityConfig | undefined;

  const [config, setConfig] = useState<Required<AvailabilityConfig>>({
    ...DEFAULT_CONFIG,
    ...(initialConfig ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig({ ...DEFAULT_CONFIG, ...initialConfig });
    }
  }, [JSON.stringify(initialConfig)]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (day: number) => {
    setConfig((prev) => {
      const days = prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day].sort((a, b) => a - b);
      return { ...prev, workingDays: days };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: { availability: config },
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Erreur lors de la sauvegarde");
      }
      toast.success("Disponibilités mises à jour");
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Disponibilités"
      description="Configurez vos créneaux de prise de rendez-vous."
    >
      {/* Day selection */}
      <div className="space-y-2">
        <Label className={settingsLabelClass}>Jours disponibles</Label>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, index) => {
            const isActive = config.workingDays.includes(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleDay(index)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hours */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label className={settingsLabelClass}>Heure de début</Label>
          <Input
            type="number"
            min={0}
            max={23}
            value={config.startHour}
            onChange={(e) => {
              setConfig((prev) => ({ ...prev, startHour: Number(e.target.value) }));
              setDirty(true);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={settingsLabelClass}>Heure de fin</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={config.endHour}
            onChange={(e) => {
              setConfig((prev) => ({ ...prev, endHour: Number(e.target.value) }));
              setDirty(true);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={settingsLabelClass}>Durée du créneau (min)</Label>
          <Input
            type="number"
            min={15}
            max={120}
            step={15}
            value={config.slotMinutes}
            onChange={(e) => {
              setConfig((prev) => ({ ...prev, slotMinutes: Number(e.target.value) }));
              setDirty(true);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={settingsLabelClass}>Jours à l'avance</Label>
          <Input
            type="number"
            min={1}
            max={90}
            value={config.daysAhead}
            onChange={(e) => {
              setConfig((prev) => ({ ...prev, daysAhead: Number(e.target.value) }));
              setDirty(true);
            }}
          />
        </div>
      </div>

      {dirty && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={settingsSaveButtonClass}
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enregistrement…
              </span>
            ) : (
              "Enregistrer"
            )}
          </button>
        </div>
      )}
    </SettingsCard>
  );
}
