"use client";

import { useState, useEffect } from "react";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AvailabilityConfig } from "@/lib/booking/slots";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const DEFAULT_CONFIG: Required<AvailabilityConfig> = {
  startHour: 9,
  endHour: 18,
  slotMinutes: 30,
  workingDays: [1, 2, 3, 4, 5],
  daysAhead: 14,
};

interface AvailabilityPanelProps {
  /** The current availability config read from profile.metadata.availability */
  config?: AvailabilityConfig;
  /** Called after a successful save so the parent can reflect the latest values */
  onSaved?: (next: Required<AvailabilityConfig>) => void;
}

export function AvailabilityPanel({ config: initialConfig, onSaved }: AvailabilityPanelProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Required<AvailabilityConfig>>({
    ...DEFAULT_CONFIG,
    ...(initialConfig ?? {}),
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync with parent when initialConfig changes (e.g. after profile loads)
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
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ metadata: { availability: config } }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Erreur lors de la sauvegarde");
      }
      toast.success("Disponibilités mises à jour");
      setDirty(false);
      onSaved?.(config);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const workingDaysSummary =
    config.workingDays.length === 0
      ? "Aucun jour"
      : config.workingDays.length === 7
        ? "Tous les jours"
        : config.workingDays.map((d) => DAY_LABELS[d]).join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Clock className="h-4 w-4" />
          Disponibilités
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mes disponibilités
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Créneaux proposés sur votre lien de réservation.
          </p>
        </div>

        <div className="space-y-4 p-3">
          {/* Working days */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Jours disponibles</p>
            <p className="text-[11px] text-muted-foreground">{workingDaysSummary}</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, index) => {
                const isActive = config.workingDays.includes(index);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Heure de début</p>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={config.startHour}
                  onChange={(e) => {
                    setConfig((prev) => ({ ...prev, startHour: Number(e.target.value) }));
                    setDirty(true);
                  }}
                  className="h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Heure de fin</p>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={config.endHour}
                  onChange={(e) => {
                    setConfig((prev) => ({ ...prev, endHour: Number(e.target.value) }));
                    setDirty(true);
                  }}
                  className="h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
            </div>
          </div>

          {/* Slot duration + days ahead */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Durée (min)</p>
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
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Jours à l'avance</p>
              <Input
                type="number"
                min={1}
                max={90}
                value={config.daysAhead}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, daysAhead: Number(e.target.value) }));
                  setDirty(true);
                }}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-3">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={saving || !dirty}
            onClick={handleSave}
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enregistrement…
              </span>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
