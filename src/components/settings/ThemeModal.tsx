"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeValue = "light" | "dark" | "system";

interface ThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeModal({ open, onOpenChange }: ThemeModalProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { value: ThemeValue; label: string; icon: React.ReactNode }[] =
    [
      { value: "light", label: "Clair", icon: <Sun className="h-5 w-5" /> },
      { value: "dark", label: "Sombre", icon: <Moon className="h-5 w-5" /> },
      { value: "system", label: "Système", icon: <Monitor className="h-5 w-5" /> },
    ];

  const currentTheme = (theme as ThemeValue) || "system";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apparence</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Choisissez le thème de l&apos;application
          </p>
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <Button
                key={opt.value}
                variant={currentTheme === opt.value ? "secondary" : "outline"}
                className={cn(
                  "justify-start gap-3",
                  currentTheme === opt.value && "ring-2 ring-primary"
                )}
                onClick={() => {
                  setTheme(opt.value);
                  onOpenChange(false);
                }}
              >
                {opt.icon}
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
