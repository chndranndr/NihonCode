/**
 * localStorage preferences and compact progress state. Schema-versioned:
 * `schemaVersion` travels with the payload; loadPrefs() runs additive,
 * idempotent migrations so an older payload upgrades in place and an unknown
 * newer version is left untouched (never destructively downgraded).
 */

import type { JlptLevel } from "../content/ids";

export const PREFS_KEY = "NihonCode-prefs";
export const PREFS_SCHEMA_VERSION = 1;

export type AccentName = "amber" | "green" | "blue" | "orange" | "red";

export interface Prefs {
  schemaVersion: number;
  theme: "dark" | "light";
  accent: AccentName;
  level: JlptLevel;
  srs: {
    dailyNewCap: number;
    skipLearningSteps: boolean;
  };
  progress: {
    xp: number;
    streakDays: number;
    lastStudyDay: string | null;
    weeklyXp: Record<string, number>;
  };
}

export const DEFAULT_PREFS: Prefs = {
  schemaVersion: PREFS_SCHEMA_VERSION,
  theme: "dark",
  accent: "amber",
  level: "n5",
  srs: { dailyNewCap: 20, skipLearningSteps: false },
  progress: { xp: 0, streakDays: 0, lastStudyDay: null, weeklyXp: {} },
};

type Migration = (prefs: Prefs) => Prefs;

/** Keyed by the version the payload is migrating FROM. Additive and idempotent. */
const MIGRATIONS: Record<number, Migration> = {};

export function migratePrefs(raw: unknown): Prefs {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PREFS };
  let prefs = raw as Prefs;
  let version = typeof prefs.schemaVersion === "number" ? prefs.schemaVersion : 0;
  if (version > PREFS_SCHEMA_VERSION) return prefs; // newer writer: leave alone
  while (version < PREFS_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    prefs = step ? step(prefs) : { ...DEFAULT_PREFS, ...prefs, schemaVersion: version + 1 };
    version += 1;
  }
  return { ...prefs, schemaVersion: PREFS_SCHEMA_VERSION };
}

export function loadPrefs(storage: Storage = localStorage): Prefs {
  const text = storage.getItem(PREFS_KEY);
  if (text === null) return { ...DEFAULT_PREFS };
  try {
    return migratePrefs(JSON.parse(text));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs, storage: Storage = localStorage): void {
  storage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
