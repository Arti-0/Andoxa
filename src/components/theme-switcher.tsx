"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="h-10 w-10 p-0 theme-toggle-button"
    >
      {theme === "light" ? (
        <Sun key="light" size={ICON_SIZE} className="text-slate-800 dark:text-slate-200" />
      ) : (
        <Moon key="dark" size={ICON_SIZE} className="text-slate-800 dark:text-slate-200" />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
