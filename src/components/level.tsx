/**
 * Active JLPT level (Phase 3). Loads the level's datasets through the async
 * loaders (per-level dynamic imports), caches each level once loaded, and
 * hands features the derived pools. setLevel persists the choice to prefs
 * and swaps the loaded data; the gate rejects levels that are not enabled.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ENABLED_LEVELS,
  LevelUnavailableError,
  loadLevelData,
  type LevelData,
} from "../content/loaders";
import type { JlptLevel } from "../content/ids";
import { loadPrefs, savePrefs } from "../storage/prefs";
import { poolsFromLevelData, type Pools } from "./pools";

export interface LevelState {
  level: JlptLevel;
  /** Loaded data; null while the active level is still loading. */
  data: LevelData | null;
  pools: Pools | null;
  setLevel(level: JlptLevel): void;
}

const LevelContext = createContext<LevelState | null>(null);

/** The stored level if it is enabled, else the first enabled level. */
function initialLevel(): JlptLevel {
  const stored = loadPrefs().level;
  return ENABLED_LEVELS.includes(stored) ? stored : ENABLED_LEVELS[0];
}

// Loaded once per level per session; revisits after a switch are instant.
const dataCache = new Map<JlptLevel, LevelData>();

export function LevelProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<JlptLevel>(initialLevel);
  // Bumped when a load lands so consumers re-read the module-level cache;
  // already-cached levels need no state write at all.
  const [, force] = useState(0);

  useEffect(() => {
    if (dataCache.has(level)) return;
    let cancelled = false;
    void loadLevelData(level)
      .then((loaded) => {
        dataCache.set(level, loaded);
        if (!cancelled) force((t) => t + 1);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Stored preference outran enablement: data stays null and the app
        // shows its loading state rather than uncurated content.
        if (error instanceof LevelUnavailableError) return;
        throw error;
      });
    return () => {
      cancelled = true;
    };
  }, [level]);

  const data = dataCache.get(level) ?? null;

  const value = useMemo<LevelState>(
    () => ({
      level,
      data,
      pools: data ? poolsFromLevelData(data) : null,
      setLevel: (next: JlptLevel) => {
        if (!ENABLED_LEVELS.includes(next)) return;
        savePrefs({ ...loadPrefs(), level: next });
        setLevelState(next);
      },
    }),
    [level, data],
  );

  return <LevelContext.Provider value={value}>{children}</LevelContext.Provider>;
}

export function useLevel(): LevelState {
  const ctx = useContext(LevelContext);
  if (!ctx) throw new Error("useLevel outside LevelProvider");
  return ctx;
}
