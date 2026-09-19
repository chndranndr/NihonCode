import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AccentName } from "../storage/prefs";

export const THEME_KEY = "NihonCode-theme";
export const ACCENT_KEY = "NihonCode-theme-accent";

export type ThemeName = "dark" | "light";

export interface ThemeState {
  theme: ThemeName;
  accent: AccentName;
  setTheme(theme: ThemeName): void;
  setAccent(accent: AccentName): void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode): theme still applies for the session
  }
}

const ACCENTS: readonly AccentName[] = ["amber", "green", "blue", "orange", "red"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() =>
    readStored(THEME_KEY) === "light" ? "light" : "dark",
  );
  const [accent, setAccentState] = useState<AccentName>(() => {
    const stored = readStored(ACCENT_KEY);
    return ACCENTS.includes(stored as AccentName) ? (stored as AccentName) : "amber";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-light", theme === "light");
    root.classList.toggle("theme-dark", theme === "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f2ec" : "#0a0a0c");
    writeStored(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    writeStored(ACCENT_KEY, accent);
  }, [accent]);

  const value = useMemo<ThemeState>(
    () => ({
      theme,
      accent,
      setTheme: setThemeState,
      setAccent: setAccentState,
    }),
    [theme, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
