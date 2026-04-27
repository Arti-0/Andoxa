"use client";

import { useMemo } from "react";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarPreferences } from "@/lib/workspace/types";

export type CalendarVisibilityMember = {
  id: string;
  name: string;
  email: string;
};

const OWN_CALENDARS: { id: string; label: string; dotClass: string }[] = [
  { id: "default", label: "Mes événements", dotClass: "bg-primary" },
  { id: "bookings", label: "Réservations", dotClass: "bg-blue-500" },
  { id: "google", label: "Google Calendar", dotClass: "bg-slate-500" },
];

interface CalendarVisibilityPanelProps {
  preferences: CalendarPreferences;
  onChange: (next: CalendarPreferences) => void;
  members?: CalendarVisibilityMember[];
}

export function CalendarVisibilityPanel({
  preferences,
  onChange,
  members = [],
}: CalendarVisibilityPanelProps) {
  const hiddenCals = useMemo(
    () => new Set(preferences.hidden_calendar_ids ?? []),
    [preferences.hidden_calendar_ids]
  );
  const hiddenMembers = useMemo(
    () => new Set(preferences.hidden_member_ids ?? []),
    [preferences.hidden_member_ids]
  );

  function toggleCalendar(id: string, visible: boolean) {
    const next = new Set(hiddenCals);
    if (visible) next.delete(id);
    else next.add(id);
    onChange({
      ...preferences,
      hidden_calendar_ids: Array.from(next),
    });
  }

  function toggleMember(id: string, visible: boolean) {
    const next = new Set(hiddenMembers);
    if (visible) next.delete(id);
    else next.add(id);
    onChange({
      ...preferences,
      hidden_member_ids: Array.from(next),
    });
  }

  const totalHidden = hiddenCals.size + hiddenMembers.size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          {totalHidden > 0 ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Agendas
          {totalHidden > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium tabular-nums text-muted-foreground">
              −{totalHidden}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mes agendas
          </p>
        </div>
        <div className="space-y-1 p-2">
          {OWN_CALENDARS.map((c) => {
            const visible = !hiddenCals.has(c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-sm",
                      c.dotClass,
                      !visible && "opacity-30"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm",
                      !visible && "text-muted-foreground line-through"
                    )}
                  >
                    {c.label}
                  </span>
                </span>
                <Switch
                  checked={visible}
                  onCheckedChange={(v) => toggleCalendar(c.id, v)}
                />
              </label>
            );
          })}
        </div>
        {members.length > 0 && (
          <>
            <div className="border-t border-b p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Agendas des collègues
              </p>
            </div>
            <div className="max-h-60 space-y-1 overflow-y-auto p-2">
              {members.map((m) => {
                const visible = !hiddenMembers.has(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted",
                          !visible && "opacity-40"
                        )}
                      >
                        <Users className="h-3 w-3 text-muted-foreground" />
                      </span>
                      <span
                        className={cn(
                          "min-w-0 truncate text-sm",
                          !visible && "text-muted-foreground line-through"
                        )}
                        title={m.email}
                      >
                        {m.name || m.email}
                      </span>
                    </span>
                    <Switch
                      checked={visible}
                      onCheckedChange={(v) => toggleMember(m.id, v)}
                    />
                  </label>
                );
              })}
            </div>
          </>
        )}
        {members.length === 0 && (
          <div className="border-t p-3">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              Pas encore de collègue dans l&apos;organisation.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
