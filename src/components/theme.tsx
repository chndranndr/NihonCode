import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ACCENTS, type AccentName } from "../storage/prefs";

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

/** Browser-chrome colour per theme; index.html's pre-paint script mirrors them. */
export const THEME_COLOR_LIGHT = "#f5f2ea";
export const THEME_COLOR_DARK = "#141615";

/**
 * Suppress control colour transitions while the theme or accent repaints, so
 * buttons and links switch with the ground instead of fading behind it.
 * index.html adds the class before first paint; it is released two frames
 * after the latest change (one frame for style, one for paint), or after a
 * short timeout when frames are throttled (background or occluded tabs never
 * run requestAnimationFrame, which would otherwise leave transitions off).
 */
const RELEASE_FALLBACK_MS = 100;
let releaseFrame = 0;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
function holdTransitions(root: HTMLElement): void {
  root.classList.add("theme-switching");
  const release = () => {
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(releaseFrame);
    clearTimeout(releaseTimer);
    root.classList.remove("theme-switching");
  };
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(releaseFrame);
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(release, RELEASE_FALLBACK_MS);
  if (typeof requestAnimationFrame === "function") {
    releaseFrame = requestAnimationFrame(() => {
      releaseFrame = requestAnimationFrame(release);
    });
  }
}

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
    holdTransitions(root);
    root.classList.toggle("theme-light", theme === "light");
    root.classList.toggle("theme-dark", theme === "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute("content", theme === "light" ? THEME_COLOR_LIGHT : THEME_COLOR_DARK);
    writeStored(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    holdTransitions(root);
    root.dataset.accent = accent;
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
