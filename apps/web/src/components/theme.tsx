"use client";

import { useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_KEY, themePreference, type Theme } from "@/lib/theme";
import { Button } from "./ui/button";

const ThemeContext = createContext({ theme: "dark" as Theme, ready: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("extracted");
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const apply = (next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    setTheme(next);
  };
  useEffect(() => {
    // Read the pre-paint result, including its storage-unavailable fallback.
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) {
        apply(themePreference(event.newValue));
        setError("");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
      setError("");
    } catch {
      setError(t("components_theme_save_failed"));
    }
  };
  return (
    <ThemeContext.Provider value={{ theme, ready, toggle }}>
      {children}
      {error && (
        <p
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-32px)] rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
        >
          {error}
        </p>
      )}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const t = useTranslations("extracted");
  const { theme, ready, toggle } = useContext(ThemeContext);
  const label =
    theme === "dark" ? t("components_theme_switch_to_light") : t("components_theme_switch_to_dark");
  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      className={
        iconOnly
          ? "h-9 w-9 shrink-0 rounded-lg"
          : "w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      }
      disabled={!ready}
      onClick={toggle}
      aria-label={label}
      title={iconOnly ? label : undefined}
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      {!iconOnly &&
        (theme === "dark" ? t("components_theme_light_mode") : t("components_theme_dark_mode"))}
    </Button>
  );
}
